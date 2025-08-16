import { adapters } from "@/search/adapters";

interface SearchMetadata {
  title?: string;
  url?: string;
  tag?: string;
}

export const GET = adapters.nextAppHandler({
  transform: (results) => {
    return results.map((result) => {
      const metadata = result.chunks?.[0].generated_metadata as SearchMetadata;

      return {
        id: result.id,
        url: metadata.url || "#",
        title: metadata.title || "Untitled",
        tag: metadata.tag || "",
        breadcrumb: [],
      };
    });
  },
});
