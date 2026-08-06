import { GlobalSearch } from "@/features/search/global-search";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-30 flex h-16 flex-none items-center gap-4 border-b border-border bg-background/85 px-6 backdrop-blur-sm">
      <GlobalSearch />
    </header>
  );
}
