// types/algoliasearch-lite.d.ts

/**
 * Basic typed subset of Algolia's JS client for `algoliasearch/lite`.
 * Expands as you need more APIs; this covers common usage for InstantSearch.
 */

declare module "algoliasearch/lite" {
  // Hit type generic
  export type Hit<T = any> = T & {
    objectID: string;
    _highlightResult?: Record<string, any>;
    _snippetResult?: Record<string, any>;
  };

  // Search parameters you might pass
  export interface SearchOptions {
    query?: string;
    hitsPerPage?: number;
    page?: number;
    filters?: string;
    facetFilters?: string[] | string[][];
    attributesToRetrieve?: string[];
    [key: string]: any; // allow extension
  }

  export interface SearchResponse<T = any> {
    hits: Hit<T>[];
    nbHits: number;
    page: number;
    hitsPerPage: number;
    processingTimeMS: number;
    exhaustiveNbHits: boolean;
    query: string;
    params: string;
    [key: string]: any;
  }

  export interface Index<T = any> {
    search(
      query: string,
      options?: SearchOptions
    ): Promise<SearchResponse<T>>;
    searchForFacetValues(
      facetName: string,
      facetQuery: string,
      params?: Record<string, any>
    ): Promise<any>;
    setSettings(settings: Record<string, any>): Promise<any>;
    saveObject(object: T & { objectID?: string }): Promise<any>;
    saveObjects(objects: Array<T & { objectID?: string }>): Promise<any>;
    getObject(objectID: string, attributesToRetrieve?: string[]): Promise<T>;
    // other index methods can be added here as needed
  }

  export interface SearchClient {
    initIndex<T = any>(indexName: string): Index<T>;
    search<T = any>(
      queries: Array<{
        indexName: string;
        query: string;
        params?: Record<string, any>;
      }>
    ): Promise<{
      results: Array<SearchResponse<T>>;
    }>;
    // optional, depending on usage:
    clearCache?(): void;
    // other client-level methods if you need them
  }

  export interface AlgoliaSearchOptions {
    // application-level config you might pass
    protocol?: "https:" | "http:";
    hosts?: string[];
    // other options e.g., you can add headers etc if needed by your environment
    [key: string]: any;
  }

  // The main factory function
  function algoliasearch(
    applicationId: string,
    apiKey: string,
    options?: AlgoliaSearchOptions
  ): SearchClient;

  export default algoliasearch;
}
