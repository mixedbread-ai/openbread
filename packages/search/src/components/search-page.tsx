"use client";

import { useEffect, useRef } from "react";
import { mockResults } from "@/lib/utils";
import { useSearch } from "@/search/hooks/use-search";
import {
  Search,
  SearchIf,
  SearchIndicatorIcon,
  SearchInput,
  SearchList,
  TagsList,
} from "@/search/ui/search";

export function CustomSearchPage() {
  const { search, setSearch, results, isLoading } = useSearch();
  const inputRef = useRef<HTMLInputElement>(null);

  const mockedResults = mockResults(results);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  return (
    <Search
      search={search}
      onSearchChange={setSearch}
      results={results}
      isLoading={isLoading}
    >
      <div className="flex items-center justify-between">
        <div className="relative w-full">
          <SearchIndicatorIcon className="-translate-y-1/2 absolute top-1/2 left-4" />
          <SearchInput
            ref={inputRef}
            placeholder="Search..."
            className="w-full rounded-md border pl-10 text-sm"
          />
        </div>
      </div>

      {mockedResults.length > 0 && (
        <div className="flex items-center justify-between">
          <TagsList allowClear={true} className="gap-2 px-0" />

          <span className="ml-auto hidden rounded-md bg-muted px-2 py-1 font-medium text-muted-foreground text-xs sm:block">
            {mockedResults.length} Result{mockedResults.length !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      <SearchIf hasQuery={false} hasResults={false}>
        <div className="py-12 text-center text-muted-foreground text-sm">
          Search for something to see the results.
        </div>
      </SearchIf>

      <SearchList items={mockedResults} className="p-0" />
    </Search>
  );
}
