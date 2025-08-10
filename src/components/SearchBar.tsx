"use client";

import { InstantSearch, SearchBox, Hits } from "react-instantsearch";
import { useMemo } from "react";
import { getAlgoliaClient } from "@/lib/algolia";

type Hit = {
  objectID: string;
  name?: string;
  slug?: string;
  imageUrl?: string;
  price?: string | number;
};

function HitCard({ hit }: { hit: Hit }) {
  return (
    <div className="hit">
      <div className="hit__title">{hit.name || hit.objectID}</div>
    </div>
  );
}

export default function SearchBar() {
  const { client, indexName } = useMemo(() => getAlgoliaClient(), []);
  if (!client || !indexName) {
    return null;
  }

  return (
    <div className="searchbar">
      <InstantSearch searchClient={client as any} indexName={indexName}>
        {/* Keep SearchBox minimal to satisfy types */}
        <SearchBox placeholder="Search products…" />
        <div className="searchbar__results">
          <Hits hitComponent={HitCard as any} />
        </div>
      </InstantSearch>
    </div>
  );
}
