import { getStore } from '@netlify/blobs';
import { createHandler, type Store } from '../../server/api';
import type { Stored } from '../../server/engine';

export default async (req: Request): Promise<Response> => {
  const store = getStore({ name: 'battle-forge-v2', consistency: 'strong' });

  const blobStore: Store = {
    async get(key) {
      const entry = await store.getWithMetadata(key, {
        type: 'json',
        consistency: 'strong',
      });
      if (entry === null) return null;
      if (entry.etag === undefined || entry.etag.length === 0) {
        throw new Error('Storage did not return a concurrency token.');
      }
      return { data: entry.data as Stored, etag: entry.etag };
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

  const handler = createHandler(blobStore);
  return handler(req);
};
