"use client";

import { InstantSearch, SearchBox, Hits } from "react-instantsearch";
import { getAlgoliaClient } from "@/lib/algolia";
import { useMemo } from "react";

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
      <div className="hit-title">{hit.name || hit.objectID}</div>
      {/* Optional: fix any undefined image URLs in your records later */}
    </div>
  );
}

export default function Search() {
  const { client, indexName } = useMemo(() => getAlgoliaClient(), []);
  if (!client || !indexName) {
    return null;
  } // graceful disable

  return (
    <InstantSearch searchClient={client} indexName={indexName}>
      <SearchBox placeholder="Search products…" autoFocus />
      <Hits hitComponent={HitCard as any} />
    </InstantSearch>
  );
}
