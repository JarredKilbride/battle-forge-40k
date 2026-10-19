import assert from "node:assert/strict";
import test from "node:test";
import { createHandler } from "../server/api.ts";
import { createGame, type Stored } from "../server/engine.ts";

const hostToken = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const watchToken = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

test("a referee can read a room without becoming a player", async () => {
  const game = createGame("ABCDEF0123", "Host", hostToken);
  const store = {
    async get(key: string) {
      return key === game.code ? { data: game, etag: "1" } : null;
    },
    async put(_key: string, _data: Stored) {
      return true;
    },
  };
  const response = await createHandler(store)(
    new Request("http://localhost/api/game", {
      method: "POST",
      headers: {
        origin: "http://localhost",
        authorization: `Bearer ${watchToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ op: "watch", code: "ABCDEF0123" }),
    }),
  );
  const body = (await response.json()) as { game: { code: string; players: unknown[]; secrets?: unknown } };
  assert.equal(response.status, 200);
  assert.equal(body.game.code, "ABCDEF0123");
  assert.equal(body.game.players.length, 1);
  assert.equal(body.game.secrets, undefined);
  assert.equal(game.players.length, 1);
  assert.equal(Object.keys(game.secrets).length, 1);
});
