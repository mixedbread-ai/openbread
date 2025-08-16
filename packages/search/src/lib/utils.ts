import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Result } from "@/search/lib/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const mockTags = ["Docs", "API Reference", "Components"];

export function mockResults(results: Result[]) {
  return results.map((result, index) => {
    let tag: string | undefined;
    if (index < 4) {
      tag = "Docs";
    } else {
      const remainingTags = mockTags.slice(1);
      const tagIndex = Math.floor((index - 4) / 2) % remainingTags.length;
      tag = remainingTags[tagIndex];
    }

    return {
      ...result,
      breadcrumb: ["Documentation", "API Reference", "Components"],
      tag,
    };
  });
}
