import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { parseArmyJson } from "../src/army.ts";
import {
  createAccountHandler,
  type AccountRecord,
  type AccountStore,
} from "../server/accounts.ts";

function memoryStore(): AccountStore {
  const rows = new Map<string, { data: AccountRecord; etag: string }>();
  return {
    async get(key) {
      return rows.get(key) ?? null;
    },
    async put(key, data, etag) {
      const old = rows.get(key) ?? null;
      if (etag ? old?.etag !== etag : !!old) return false;
      rows.set(key, { data, etag: crypto.randomUUID() });
      return true;
    },
    async delete(key) {
      rows.delete(key);
    },
  };
}

function post(
  handler: (req: Request) => Promise<Response>,
  body: Record<string, unknown>,
  token?: string,
) {
  return handler(
    new Request("http://localhost/api/account", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        origin: "http://localhost",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    }),
  );
}

const army = {
  name: "Sisters",
  faction: "Adepta Sororitas",
  points: 60,
  limit: 1000,
  units: [
    {
      name: "Canoness",
      points: 60,
      models: [
        {
          name: "Canoness",
          count: 1,
          m: '6"',
          t: "3",
          sv: "3+",
          w: "4",
          ld: "6+",
          oc: "1",
          invuln: 4,
          weapons: [],
          remaining: [2],
        },
      ],
    },
  ],
};

test("register, save an army, and restore it on the next sign-in", async () => {
  const handler = createAccountHandler(memoryStore());
  const created = await post(handler, {
    op: "register",
    email: "Pilot@Example.com",
    password: "tabletop-1",
  });
  assert.equal(created.status, 200);
  const first = (await created.json()) as { email: string; token: string; army: unknown };
  assert.equal(first.email, "pilot@example.com");
  assert.equal(first.army, null);

  const saved = await post(
    handler,
    { op: "save", email: first.email, army },
    first.token,
  );
  assert.equal(saved.status, 200);

  const again = await post(handler, {
    op: "login",
    email: "pilot@example.com",
    password: "tabletop-1",
  });
  const second = (await again.json()) as { token: string; army: { units: { models: { remaining: number[] }[] }[] } };
  assert.notEqual(second.token, first.token);
  assert.deepEqual(second.army.units[0].models[0].remaining, [2]);

  const stale = await post(
    handler,
    { op: "read", email: first.email },
    first.token,
  );
  assert.equal(stale.status, 200);
});

test("a wrong password and a duplicate email are rejected", async () => {
  const handler = createAccountHandler(memoryStore());
  await post(handler, { op: "register", email: "a@b.co", password: "tabletop-1" });
  const duplicate = await post(handler, {
    op: "register",
    email: "a@b.co",
    password: "tabletop-1",
  });
  assert.equal(duplicate.status, 409);
  const wrong = await post(handler, {
    op: "login",
    email: "a@b.co",
    password: "not-the-password",
  });
  assert.equal(wrong.status, 401);
  const missing = await post(handler, { op: "save", email: "a@b.co", army: null });
  assert.equal(missing.status, 401);
});

test("an imported Sisters roster can be saved", async () => {
  const path = "/Users/jarredkilbride/Downloads/Sisters.json";
  if (!existsSync(path)) return;
  const handler = createAccountHandler(memoryStore());
  const created = await post(handler, {
    op: "register",
    email: "sisters@example.com",
    password: "tabletop-1",
  });
  const { token, email } = (await created.json()) as { token: string; email: string };
  const army = parseArmyJson(readFileSync(path, "utf8"));
  const saved = await post(handler, { op: "save", email, army }, token);
  const body = (await saved.json()) as { error?: string; army?: { units: unknown[] } };
  assert.equal(saved.status, 200, body.error);
  assert.equal(body.army?.units.length, army.units.length);
});

test("a password change keeps the army and delete removes the account", async () => {
  const handler = createAccountHandler(memoryStore());
  const created = await post(handler, {
    op: "register",
    email: "keep@b.co",
    password: "tabletop-1",
  });
  const { token, email } = (await created.json()) as { token: string; email: string };
  const saved = await post(handler, { op: "save", email, army }, token);
  assert.equal(saved.status, 200);
  const wrong = await post(
    handler,
    { op: "password", email, password: "nope-nope", nextPassword: "tabletop-2" },
    token,
  );
  assert.equal(wrong.status, 401);
  const changed = await post(
    handler,
    { op: "password", email, password: "tabletop-1", nextPassword: "tabletop-2" },
    token,
  );
  assert.equal(changed.status, 200);
  const again = await post(handler, {
    op: "login",
    email,
    password: "tabletop-2",
  });
  const signed = (await again.json()) as { army: { name: string } };
  assert.equal(signed.army.name, "Sisters");
  const removed = await post(handler, { op: "delete", email, password: "tabletop-2" }, token);
  assert.equal(removed.status, 200);
  const gone = await post(handler, { op: "login", email, password: "tabletop-2" });
  assert.equal(gone.status, 401);
});

test("a second roster stays beside the first", async () => {
  const handler = createAccountHandler(memoryStore());
  const created = await post(handler, {
    op: "register",
    email: "lists@b.co",
    password: "tabletop-1",
  });
  const { token, email } = (await created.json()) as { token: string; email: string };
  await post(handler, { op: "save", email, army }, token);
  const second = { ...army, name: "Second host", points: 500 };
  const saved = await post(handler, { op: "save", email, army: second }, token);
  const body = (await saved.json()) as { army: { name: string }; armies: { name: string }[] };
  assert.equal(saved.status, 200);
  assert.equal(body.army.name, "Second host");
  assert.deepEqual(
    body.armies.map((entry) => entry.name),
    ["Sisters", "Second host"],
  );
});

test("sign out removes that session", async () => {
  const handler = createAccountHandler(memoryStore());
  const created = await post(handler, {
    op: "register",
    email: "out@b.co",
    password: "tabletop-1",
  });
  const { token, email } = (await created.json()) as { token: string; email: string };
  const left = await post(handler, { op: "logout", email }, token);
  assert.equal(left.status, 200);
  const read = await post(handler, { op: "read", email }, token);
  assert.equal(read.status, 401);
});
