import { armiesFrom, writeArmyLibrary } from "./armyLibrary";
import type { Army } from "./army";
import { load, save } from "./api";

export type AccountSession = {
  email: string;
  token: string;
};

export type AccountResult = AccountSession & {
  army: Army | null;
  armies: Army[];
};

const ACCOUNT_KEY = "bf.account";

export function readAccount(): AccountSession | null {
  const session = load<AccountSession | null>(ACCOUNT_KEY, null);
  if (!session || typeof session.email !== "string" || typeof session.token !== "string") {
    return null;
  }
  return session;
}

export function writeAccount(session: AccountSession | null) {
  if (session) save(ACCOUNT_KEY, session);
  else localStorage.removeItem(ACCOUNT_KEY);
}

export function sameArmy(left: Army | null, right: Army | null) {
  return stable(left) === stable(right);
}

async function accountRequest(body: Record<string, unknown>, token?: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch("/api/account", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(12000),
  });
  let data: {
    error?: string;
    email?: string;
    token?: string;
    army?: Army | null;
    armies?: unknown;
  };
  try {
    data = await response.json();
  } catch {
    throw new Error(
      "Account server is not running. Restart the local app, or deploy the complete project.",
    );
  }
  if (!response.ok) throw new Error(data.error || "Could not update the account.");
  return data;
}

export function registerAccount(email: string, password: string) {
  return accountResult({ op: "register", email, password });
}

export function loginAccount(email: string, password: string) {
  return accountResult({ op: "login", email, password });
}

async function accountResult(body: Record<string, unknown>): Promise<AccountResult> {
  const data = await accountRequest(body);
  if (!data.email || !data.token) throw new Error("Could not sign in.");
  const armies = armiesFrom(data.armies);
  if (armies.length) writeArmyLibrary(armies);
  return { email: data.email, token: data.token, army: data.army ?? null, armies };
}

export async function dropAccountArmy(name: string) {
  const session = readAccount();
  if (!session) return null;
  const data = await accountRequest(
    { op: "drop", email: session.email, name },
    session.token,
  );
  const armies = armiesFrom(data.armies);
  if (Array.isArray(data.armies)) writeArmyLibrary(armies);
  return armies;
}

export async function saveAccountArmy(army: Army | null) {
  const session = readAccount();
  if (!session) return;
  const data = await accountRequest(
    { op: "save", email: session.email, army },
    session.token,
  );
  const armies = armiesFrom(data.armies);
  if (data.armies) writeArmyLibrary(armies);
}

export async function changeAccountPassword(currentPassword: string, nextPassword: string) {
  const session = readAccount();
  if (!session) throw new Error("Sign in again.");
  await accountRequest(
    {
      op: "password",
      email: session.email,
      password: currentPassword,
      nextPassword,
    },
    session.token,
  );
}

export async function deleteAccount(password: string) {
  const session = readAccount();
  if (!session) throw new Error("Sign in again.");
  await accountRequest(
    { op: "delete", email: session.email, password },
    session.token,
  );
  writeAccount(null);
}

export async function logoutAccount() {
  const session = readAccount();
  writeAccount(null);
  if (!session) return;
  try {
    await accountRequest({ op: "logout", email: session.email }, session.token);
  } catch {
    // The browser session is already cleared.
  }
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stable(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}
