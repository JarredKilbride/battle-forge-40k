import { createServer } from "node:http";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { createServer as createVite } from "vite";
import {
  createAccountHandler,
  type AccountRecord,
  type AccountStore,
} from "./accounts";
import { createHandler, type Store } from "./api";
import type { Stored } from "./engine";

await mkdir(".local-games", { recursive: true });
await mkdir(".local-accounts", { recursive: true });

function jsonStore<T>(directory: string) {
  let queue: Promise<unknown> = Promise.resolve();
  const store = {
    async get(key: string) {
      try {
        return JSON.parse(await readFile(`${directory}/${key}.json`, "utf8")) as {
          data: T;
          etag: string;
        };
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
        throw error;
      }
    },
    async put(key: string, data: T, etag?: string) {
      const task = queue.then(async () => {
        const old = await store.get(key);
        if (etag ? old?.etag !== etag : !!old) return false;
        const next = { data, etag: crypto.randomUUID() };
        await writeFile(`${directory}/${key}.tmp`, JSON.stringify(next));
        await rename(`${directory}/${key}.tmp`, `${directory}/${key}.json`);
        return true;
      });
      queue = task.catch(() => {});
      return task;
    },
    async delete(key: string) {
      await unlink(`${directory}/${key}.json`).catch((error: NodeJS.ErrnoException) => {
        if (error.code !== "ENOENT") throw error;
      });
    },
  };
  return store;
}

const games: Store = jsonStore<Stored>(".local-games");
const accounts: AccountStore = jsonStore<AccountRecord>(".local-accounts");
const gameHandler = createHandler(games);
const accountHandler = createAccountHandler(accounts);
const vite = await createVite({
  server: { middlewareMode: true },
  appType: "spa",
});

const routes: Record<string, { limit: number; handle: (req: Request) => Promise<Response> }> = {
  "/api/game": { limit: 16000, handle: gameHandler },
  "/api/account": { limit: 200000, handle: accountHandler },
};

createServer(async (req, res) => {
  const path = req.url?.split("?")[0] ?? "";
  const route = routes[path];
  if (!route) {
    vite.middlewares(req, res);
    return;
  }
  try {
    let body = "";
    for await (const chunk of req) {
      body += chunk;
      if (body.length > route.limit) {
        res.writeHead(413);
        res.end();
        return;
      }
    }
    const response = await route.handle(
      new Request(`http://${req.headers.host}${req.url}`, {
        method: req.method,
        headers: req.headers as Record<string, string>,
        ...(req.method === "POST" ? { body } : {}),
      }),
    );
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(await response.text());
  } catch {
    res.writeHead(500);
    res.end("Server error");
  }
}).listen(Number(process.env.PORT || 5173), "0.0.0.0", () =>
  console.log(`Battle Forge ready on port ${process.env.PORT || 5173}`),
);
