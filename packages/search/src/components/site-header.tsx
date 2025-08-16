"use client";

import Link from "next/link";
import { MxbaiLogoIcon } from "./mxbai-logo-icon";
import { ThemeToggle } from "./theme-toggle";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-border/50 border-b">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <Link className="flex items-center gap-2" href="/">
            <MxbaiLogoIcon className="h-6 w-6" />
          </Link>

          <Link href="/search" className="text-muted-foreground text-sm">
            Search
          </Link>

          <Link href="/chat" className="text-muted-foreground text-sm">
            Chat
          </Link>
        </div>

        <ThemeToggle />
      </div>
    </header>
  );
}
