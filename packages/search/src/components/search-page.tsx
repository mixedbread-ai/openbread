'use client';

import { mockResults } from '@/lib/utils';
import { useSearch } from '@/search/hooks/use-search';
import { SearchList, SearchIndicatorIcon, TagsList, SearchInput, Search, SearchIf } from '@/search/ui/search';
import { useEffect, useRef } from 'react';

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
    <Search search={search} onSearchChange={setSearch} results={results} isLoading={isLoading}>
      <div className="flex items-center justify-between">
        <div className="relative w-full">
          <SearchIndicatorIcon className="absolute left-4 top-1/2 -translate-y-1/2" />
          <SearchInput
            ref={inputRef}
            placeholder="Search..."
            className="w-full border rounded-md text-sm pl-10"
          />
        </div>
      </div>

      {mockedResults.length > 0 && (
        <div className="flex items-center justify-between">
          <TagsList allowClear={true} className="gap-2 px-0" />

          <span className="text-xs hidden sm:block font-medium text-muted-foreground ml-auto bg-muted px-2 py-1 rounded-md">
            {mockedResults.length} Result{mockedResults.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      <SearchIf hasQuery={false} hasResults={false}>
        <div className="py-12 text-center text-sm text-muted-foreground">
          Search for something to see the results.
        </div>
      </SearchIf>

      <SearchList items={mockedResults} className="p-0" />
    </Search>
  );
}
