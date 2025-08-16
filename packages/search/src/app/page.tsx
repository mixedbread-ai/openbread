import { SearchTrigger } from "@/components/search-trigger";

export default function Home() {
  return (
    <div className="container mx-auto flex h-[80%] flex-1 flex-col items-center justify-center gap-8">
      <h1 className="text-center font-bold text-4xl leading-tight tracking-tighter md:text-5xl lg:text-6xl">
        Search Anything...
      </h1>

      <SearchTrigger />
    </div>
  );
}
