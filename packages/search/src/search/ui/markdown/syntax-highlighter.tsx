"use client";

import { useTheme } from "next-themes";
import ShikiHighlighter, { type ShikiHighlighterProps } from "react-shiki";
import { cn } from "@/lib/utils";

export type HighlighterProps = Omit<ShikiHighlighterProps, "theme"> & {
  theme?: ShikiHighlighterProps["theme"];
};

export function SyntaxHighlighter({
  children,
  language,
  theme,
  className,
  ...props
}: HighlighterProps) {
  const { theme: currentTheme } = useTheme();

  // Use provided theme or fallback to theme-aware defaults
  const shikiTheme =
    theme || (currentTheme === "dark" ? "github-dark" : "github-light");

  return (
    <ShikiHighlighter
      {...props}
      language={language}
      theme={shikiTheme}
      className={cn(
        "[&_pre]:!p-4 [&_pre]:overflow-x-auto [&_pre]:border [&_pre]:text-sm",
        className
      )}
    >
      {children}
    </ShikiHighlighter>
  );
}

SyntaxHighlighter.displayName = "SyntaxHighlighter";
