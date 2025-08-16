"use client";

import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { CustomSearchDialog } from "./search-dialog";
import { Button } from "./ui/button";
import { Kbd } from "./ui/kbd";

export function SearchTrigger() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMac, setIsMac] = useState(false);

  // Detect if user is on Mac
  useEffect(() => {
    setIsMac(navigator.platform.toUpperCase().indexOf("MAC") >= 0);
  }, []);

  // Handle keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        setIsOpen(true);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variant="outline"
        className="flex h-auto w-full max-w-sm justify-between px-3 py-2 text-muted-foreground"
      >
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4" />
          <span>Search...</span>
        </div>
        <Kbd variant="outline">{isMac ? "⌘K" : "Ctrl+K"}</Kbd>
      </Button>

      <CustomSearchDialog open={isOpen} onOpenChange={setIsOpen} />
    </>
  );
}
