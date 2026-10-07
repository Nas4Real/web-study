"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

export const searchableDestinations = [
  { aliases: "home overview", href: "/", label: "Dashboard" },
  { aliases: "planning schedule sessions", href: "/calendar", label: "Calendar" },
  { aliases: "assignments todo", href: "/tasks", label: "Tasks" },
  { aliases: "files chapters library", href: "/documents", label: "Documents" },
  { aliases: "profile subjects account", href: "/settings", label: "Settings" },
] as const;

export function findNavigationDestinations(query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return searchableDestinations;
  return searchableDestinations.filter(({ aliases, label }) =>
    `${label} ${aliases}`.toLowerCase().includes(normalized),
  );
}

export function NavigationSearch({ compact = false }: Readonly<{ compact?: boolean }>) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const listId = useId();
  const results = findNavigationDestinations(query);
  const showingResults = open && Boolean(query);

  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);

  const navigate = (href: string) => {
    setOpen(false);
    setQuery("");
    router.push(href);
  };

  return (
    <div className="relative">
      <label className="flex h-9 items-center gap-2 rounded-md border border-border-base bg-card px-2.5 text-xs font-medium text-text-tertiary">
        <Search aria-hidden="true" size={14} />
        <span className="sr-only">Search Web Study navigation</span>
        <input
          aria-controls={showingResults ? listId : undefined}
          aria-expanded={showingResults}
          aria-label="Search Web Study navigation"
          aria-haspopup="listbox"
          className="min-w-0 flex-1 bg-transparent text-text-secondary outline-none placeholder:text-text-tertiary"
          onBlur={() => window.setTimeout(() => setOpen(false), 100)}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
              setQuery("");
              inputRef.current?.blur();
            }
            if (event.key === "Enter" && results[0]) {
              event.preventDefault();
              navigate(results[0].href);
            }
          }}
          placeholder={compact ? "Go to…" : "Search navigation..."}
          ref={inputRef}
          role="combobox"
          type="search"
          value={query}
        />
        {!compact ? <kbd className="font-mono text-[9px] text-text-disabled">Ctrl K</kbd> : null}
      </label>
      {showingResults ? (
        <div className="absolute left-0 right-0 top-11 z-50 overflow-hidden rounded-lg border border-border-panel bg-card shadow-2xl" id={listId} role="listbox">
          {results.length > 0 ? results.map((item, index) => (
            <button
              aria-selected={index === 0}
              className="block w-full px-3 py-2.5 text-left text-xs font-semibold text-text-secondary hover:bg-card-hover hover:text-white"
              key={item.href}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => navigate(item.href)}
              role="option"
              type="button"
            >
              {item.label}
            </button>
          )) : <p className="px-3 py-3 text-xs text-text-muted">No matching page.</p>}
        </div>
      ) : null}
    </div>
  );
}
