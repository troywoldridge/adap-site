// src/components/SearchBar.tsx
'use client';

import React from 'react';
import algoliasearch from 'algoliasearch/lite';
import {
  InstantSearch,
  SearchBox,
  Hits,
  Highlight,
  useInstantSearch,
  useSearchBox,
  type ConfigureProps,
  useConfigure,
} from 'react-instantsearch-hooks-web';

const appId         = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID   ?? '';
const searchKey     = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY ?? '';
const rawIndexName  = process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME ?? '';
const indexName     = rawIndexName.trim().toLowerCase();

/* -----------------  helpers  ----------------- */
type ProductHit = {
  name: string;
  description?: string;
  image?: string;
  objectID: string;
};

function HitItem({ hit }: { hit: ProductHit }) {
  return (
    <a
      href={`/products/${hit.objectID}`}
      className="flex items-start gap-3 p-2 hover:bg-gray-100 transition rounded"
    >
      {hit.image && (
        <img
          src={hit.image}
          alt={hit.name}
          loading="lazy"
          className="w-12 h-12 object-cover rounded"
        />
      )}
      <div className="flex-1">
        <p className="font-medium text-gray-900">
          <Highlight attribute="name" hit={hit} />
        </p>
        {hit.description && (
          <p className="text-sm text-gray-600">
            <Highlight attribute="description" hit={hit} />
          </p>
        )}
      </div>
    </a>
  );
}

/* Limit to five hits max */
function ConfigureSearch() {
  useConfigure({ hitsPerPage: 5 } as ConfigureProps);
  return null;
}

/* Wrapper that shows children only when query && hits > 0 */
function SuggestionPanel({ children }: { children: React.ReactNode }) {
  const { uiState }      = useInstantSearch();
  const { query }        = useSearchBox();
  const hasQuery         = query.trim().length > 0;
  const hits             = uiState?.results?.hits ?? [];
  const hasHits          = hits.length > 0;

  if (!hasQuery || !hasHits) return null;
  return <>{children}</>;
}

/* -----------------  component  ----------------- */
export default function SearchBar() {
  if (!appId || !searchKey || !indexName) {
    return (
      <div className="p-4 text-sm text-red-600 bg-red-100 rounded">
        Missing Algolia env vars.
      </div>
    );
  }

  const searchClient = algoliasearch(appId, searchKey);

  return (
    <InstantSearch searchClient={searchClient} indexName={indexName}>
      <ConfigureSearch />

      <div className="site-header__search">
        <SearchBox
          placeholder="Search products…"
          classNames={{
            input:
              'w-full py-2 pl-4 pr-10 border border-gray-300 rounded-lg focus:outline-none',
            form: 'relative',
            root: 'w-full',
            reset: 'hidden',
            submit: 'hidden',
          }}
        />

        {/* this div gets the same class the CSS hides by default */}
        <SuggestionPanel>
          <div className="absolute autocomplete-list left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-b shadow-lg max-h-60 overflow-y-auto z-50">
            <Hits hitComponent={HitItem} />
          </div>
        </SuggestionPanel>
      </div>
    </InstantSearch>
  );
}
