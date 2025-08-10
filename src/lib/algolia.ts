// src/lib/algolia.ts
import algoliasearch from "algoliasearch/lite";

export function getAlgoliaClient() {
  const appId = (process.env.NEXT_PUBLIC_ALGOLIA_APP_ID || "").trim();
  const searchKey = (process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY || "").trim();
  const indexName = (process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME || "").trim();

  if (!appId || !searchKey || !indexName) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[algolia] missing envs", { appId: !!appId, searchKey: !!searchKey, indexName: !!indexName });
    }
    return { client: null, indexName: "" };
  }

  return { client: algoliasearch(appId, searchKey), indexName };
}
