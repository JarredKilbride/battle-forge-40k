import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { ensure, GameError, hash } from "./engine";

const scrypt = promisify(scryptCallback);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TOKEN = /^[a-f0-9-]{36}$/i;
const ATTEMPTS = 8;
const LOCK_MS = 15 * 60 * 1000;

export type AccountRecord = {
  email: string;
  passwordHash: string;
  salt: string;
  sessions: string[];
  army: unknown;
  updatedAt: number;
};

export interface AccountStore {
  get(key: string): Promise<{ data: AccountRecord; etag: string } | null>;
  put(key: string, data: AccountRecord, etag?: string): Promise<boolean>;
}

type Attempt = { count: number; lockedUntil: number };
const attempts = new Map<string, Attempt>();

const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { "Cache-Control": "no-store" } });

function emailOf(value: unknown) {
  ensure(typeof value === "string", "Enter an email address.");
  const email = value.trim().toLowerCase();
  ensure(email.length <= 80 && EMAIL.test(email), "Enter a valid email address.");
  return email;
}

function passwordOf(value: unknown) {
  ensure(typeof value === "string", "Enter a password.");
  ensure(value.length >= 8 && value.length <= 72, "Use a password of 8 to 72 characters.");
  return value;
}

function tokenOf(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer /, "");
  ensure(token && TOKEN.test(token), "Sign in again.", 401);
  return token;
}

async function passwordHash(password: string, salt: string) {
  const derived = (await scrypt(password, salt, 32)) as Buffer;
  return derived.toString("hex");
}

function hashesMatch(left: string, right: string) {
  const a = Buffer.from(left, "hex");
  const b = Buffer.from(right, "hex");
  if (a.length === 0 || a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function assertUnlocked(key: string) {
  const entry = attempts.get(key);
  if (entry && entry.lockedUntil > Date.now()) {
    throw new GameError("Too many sign-in attempts. Wait and try again.", 429);
  }
}

function noteFailure(key: string) {
  const entry = attempts.get(key) ?? { count: 0, lockedUntil: 0 };
  entry.count += 1;
  if (entry.count >= ATTEMPTS) {
    entry.lockedUntil = Date.now() + LOCK_MS;
    entry.count = 0;
  }
  attempts.set(key, entry);
}

function clip(value: unknown, max: number) {
  ensure(typeof value === "string", "That army could not be saved.");
  const text = value.trim();
  ensure(text.length <= max, "That army could not be saved.");
  return text;
}

function amount(value: unknown) {
  ensure(
    typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 20000,
    "That army could not be saved.",
  );
  return value;
}

function whole(value: unknown, min: number, max: number) {
  ensure(
    typeof value === "number" && Number.isInteger(value) && value >= min && value <= max,
    "That army could not be saved.",
  );
  return value;
}

function validateArmy(value: unknown): unknown {
  if (value === null) return null;
  ensure(value && typeof value === "object" && !Array.isArray(value), "That army could not be saved.");
  const army = value as Record<string, unknown>;
  ensure(Array.isArray(army.units) && army.units.length <= 80, "That army could not be saved.");
  return {
    name: clip(army.name, 80),
    faction: clip(army.faction, 160),
    points: amount(army.points),
    limit: amount(army.limit),
    units: army.units.map(validateUnit),
  };
}

function validateUnit(value: unknown) {
  ensure(value && typeof value === "object", "That army could not be saved.");
  const unit = value as Record<string, unknown>;
  ensure(Array.isArray(unit.models) && unit.models.length <= 40, "That army could not be saved.");
  return {
    name: clip(unit.name, 80),
    points: amount(unit.points),
    models: unit.models.map(validateModel),
  };
}

function validateModel(value: unknown) {
  ensure(value && typeof value === "object", "That army could not be saved.");
  const model = value as Record<string, unknown>;
  const count = whole(model.count, 1, 100);
  ensure(Array.isArray(model.weapons) && model.weapons.length <= 40, "That army could not be saved.");
  const invuln =
    model.invuln === null ? null : whole(model.invuln, 2, 6);
  const saved: Record<string, unknown> = {
    name: clip(model.name, 80),
    count,
    m: clip(model.m, 20),
    t: clip(model.t, 20),
    sv: clip(model.sv, 20),
    w: clip(model.w, 20),
    ld: clip(model.ld, 20),
    oc: clip(model.oc, 20),
    invuln,
    weapons: model.weapons.map(validateWeapon),
  };
  if (model.remaining !== undefined) {
    ensure(Array.isArray(model.remaining) && model.remaining.length === count, "That army could not be saved.");
    saved.remaining = model.remaining.map((wounds) => whole(wounds, 0, 100));
  }
  return saved;
}

function validateWeapon(value: unknown) {
  ensure(value && typeof value === "object", "That army could not be saved.");
  const weapon = value as Record<string, unknown>;
  ensure(weapon.kind === "ranged" || weapon.kind === "melee", "That army could not be saved.");
  return {
    name: clip(weapon.name, 80),
    kind: weapon.kind,
    count: whole(weapon.count, 1, 100),
    modelCount: whole(weapon.modelCount, 1, 100),
    range: clip(weapon.range, 40),
    attacks: clip(weapon.attacks, 40),
    skill: clip(weapon.skill, 40),
    strength: clip(weapon.strength, 40),
    ap: clip(weapon.ap, 40),
    damage: clip(weapon.damage, 40),
    keywords: clip(weapon.keywords, 200),
  };
}

async function writeAccount(
  store: AccountStore,
  key: string,
  current: { data: AccountRecord; etag: string },
  next: AccountRecord,
) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const found = attempt === 0 ? current : await store.get(key);
    ensure(found, "Account not found.", 404);
    if (await store.put(key, next, found.etag)) return;
  }
  throw new GameError("Could not save the account. Try again.", 409);
}

export function createAccountHandler(store: AccountStore) {
  return async (req: Request) => {
    try {
      ensure(req.method === "POST", "Use POST.", 405);
      const origin = req.headers.get("origin");
      ensure(!origin || origin === new URL(req.url).origin, "Cross-origin request rejected.", 403);
      const raw = await req.text();
      ensure(raw.length <= 200000, "Request too large.", 413);
      let body: Record<string, unknown>;
      try {
        body = JSON.parse(raw) as Record<string, unknown>;
      } catch {
        throw new GameError("Invalid JSON.");
      }
      ensure(body && typeof body === "object", "Invalid request.");
      const email = emailOf(body.email);
      const key = hash(email);

      if (body.op === "register") {
        const password = passwordOf(body.password);
        if (await store.get(key)) throw new GameError("An account with that email already exists.", 409);
        const salt = randomBytes(16).toString("hex");
        const token = randomUUID();
        const record: AccountRecord = {
          email,
          passwordHash: await passwordHash(password, salt),
          salt,
          sessions: [token],
          army: null,
          updatedAt: Date.now(),
        };
        ensure(await store.put(key, record), "An account with that email already exists.", 409);
        return json({ email, token, army: null });
      }

      if (body.op === "login") {
        assertUnlocked(key);
        const password = passwordOf(body.password);
        const found = await store.get(key);
        const match =
          found !== null &&
          (await hashesMatch(found.data.passwordHash, await passwordHash(password, found.data.salt)));
        if (!found || !match) {
          noteFailure(key);
          throw new GameError("Email or password is wrong.", 401);
        }
        attempts.delete(key);
        const token = randomUUID();
        const next = {
          ...found.data,
          sessions: [...found.data.sessions, token].slice(-8),
        };
        await writeAccount(store, key, found, next);
        return json({ email, token, army: found.data.army });
      }

      const token = tokenOf(req);
      const found = await store.get(key);
      ensure(found && found.data.sessions.includes(token), "Sign in again.", 401);

      if (body.op === "read") return json({ email, army: found.data.army });

      if (body.op === "save") {
        const army = validateArmy(body.army);
        const next = { ...found.data, army, updatedAt: Date.now() };
        await writeAccount(store, key, found, next);
        return json({ email, army });
      }

      if (body.op === "logout") {
        const next = {
          ...found.data,
          sessions: found.data.sessions.filter((session) => session !== token),
        };
        await writeAccount(store, key, found, next);
        return json({ email, army: found.data.army });
      }

      throw new GameError("Unknown operation.");
    } catch (error) {
      if (error instanceof GameError) return json({ error: error.message }, error.status);
      console.error("Account operation failed", error instanceof Error ? error.message : "unknown");
      return json({ error: "Account service unavailable. Try again." }, 503);
    }
  };
}
