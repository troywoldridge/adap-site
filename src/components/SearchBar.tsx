"use client";

import React from "react";
import algoliasearch from "algoliasearch/lite"; // v4.x
import {
  InstantSearch,
  SearchBox,
  Hits,
  Highlight,
  useInstantSearch,
  Configure,
} from "react-instantsearch"; // v7
import type { Hit } from "instantsearch.js";

const appId = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID || "";
const searchKey = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY || "";
const rawIndexName = process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME || "";
const indexName = rawIndexName.trim().toLowerCase();

type ProductHit = {
  name: string;
  description?: string;
  image?: string;
  objectID: string;
};

const HitItem = ({ hit }: { hit: Hit<ProductHit> }) => (
  <div className="hit-item">
    {hit.image && (
      <div className="hit-thumb">
        <img src={hit.image} alt={hit.name} loading="lazy" />
      </div>
    )}
    <div className="hit-content">
      <div className="hit-title">
        <Highlight attribute="name" hit={hit} />
      </div>
      {hit.description && (
        <div className="hit-desc">
          <Highlight attribute="description" hit={hit} />
        </div>
      )}
    </div>
  </div>
);

function HitsWrapper() {
  const { results } = useInstantSearch();
  const query = results?.query || "";
  if (!query.trim()) return null;
  return (
    <div className="hits-dropdown">
      <Hits hitComponent={HitItem} />
    </div>
  );
}

export default function SearchBar() {
  if (!appId || !searchKey || !indexName) {
    return (
      <div className="search-error">
        Algolia env vars missing: <br />
        <code>NEXT_PUBLIC_ALGOLIA_APP_ID</code>, <code>NEXT_PUBLIC_ALGOLIA_SEARCH_KEY</code>,{" "}
        <code>NEXT_PUBLIC_ALGOLIA_INDEX_NAME</code>
      </div>
    );
  }

  const searchClient = algoliasearch(appId, searchKey);

  return (
    <div className="searchbar-root">
      <InstantSearch searchClient={searchClient} indexName={indexName}>
        <Configure hitsPerPage={5} />

        <div className="search-input-wrapper">
          <SearchBox
            translations={{ placeholder: "Search products..." }}
            searchAsYouType
            submitIconComponent={() => null}
            resetIconComponent={() => null}
            className="search-input"
          />
        </div>

        <HitsWrapper />
      </InstantSearch>
    </div>
  );
}
