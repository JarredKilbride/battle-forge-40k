import { getStore } from "@netlify/blobs";
import {
  createAccountHandler,
  type AccountRecord,
  type AccountStore,
} from "../../server/accounts";

export default async (req: Request): Promise<Response> => {
  const store = getStore({ name: "battle-forge-accounts", consistency: "strong" });
  const accounts: AccountStore = {
    async get(key) {
      const entry = await store.getWithMetadata(key, {
        type: "json",
        consistency: "strong",
      });
      if (entry === null) return null;
      if (entry.etag === undefined || entry.etag.length === 0) {
        throw new Error("Storage did not return a concurrency token.");
      }
      return { data: entry.data as AccountRecord, etag: entry.etag };
    },
    async put(key, data, etag) {
      const result = await store.setJSON(
        key,
        data,
        etag === undefined ? { onlyIfNew: true } : { onlyIfMatch: etag },
      );
      return result.modified;
    },
  };
  return createAccountHandler(accounts)(req);
};
