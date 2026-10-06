"use client";

import { Luggage, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Avatar, Sheet, Spinner } from "@/components/ui";
import { getCountry } from "@/lib/countries";
import { plural } from "@/lib/utils";
import { useSearch } from "./api";

/** Global search for people, countries and trips (⌘K). */
export function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} label="Search" className="sm:max-w-xl sm:self-start sm:mt-[12vh]">
      {open && <SearchBody onClose={onClose} />}
    </Sheet>
  );
}

function SearchBody({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState("");
  const router = useRouter();
  const { data, isFetching, isError, debouncedQuery, isDebouncing } = useSearch(q);
  const has = data && (data.users.length || data.countries.length || data.trips.length);
  const go = (href: string) => {
    onClose();
    router.push(href);
  };

  return (
    <div className="flex min-h-0 flex-col">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Search className="size-5 shrink-0 text-ai" aria-hidden />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search people, countries, trips…"
          aria-label="Search people, countries and trips"
          className="h-11 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted/80"
        />
        {(isFetching || isDebouncing) && q && <Spinner className="scale-75" label="Searching" />}
        <button onClick={onClose} aria-label="Close search" className="flex size-10 items-center justify-center rounded-xl text-muted hover:bg-surface-2">
          <X className="size-5" />
        </button>
      </div>

      <div className="max-h-[60dvh] overflow-y-auto p-2">
        {!q.trim() ? (
          <p className="px-3 py-8 text-center text-sm text-muted">Try “Japan”, “David” or “Kyoto”.</p>
        ) : isError ? (
          <p className="px-3 py-8 text-center text-sm text-danger">Search failed. Try again.</p>
        ) : !data ? null : !has ? (
          <p className="px-3 py-8 text-center text-sm text-muted">No results for “{debouncedQuery}”.</p>
        ) : (
          <>
            {data.countries.length > 0 && (
              <Group title="Countries">
                {data.countries.map((c) => (
                  <Row key={c.code} onClick={() => go(`/explore/${c.code.toLowerCase()}`)}>
                    <span className="text-2xl">{c.flag}</span>
                    <span className="min-w-0 flex-1 truncate">
                      {c.name} <span className="text-muted">· {c.continent}</span>
                    </span>
                  </Row>
                ))}
              </Group>
            )}
            {data.users.length > 0 && (
              <Group title="People">
                {data.users.map((u) => (
                  <Row key={u.id} onClick={() => go(`/u/${u.username}`)}>
                    <Avatar user={u} size={36} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">
                        {u.firstName} {u.lastName}
                      </span>
                      <span className="block truncate text-sm text-muted">
                        @{u.username}
                        {u.visited > 0 && ` · ${plural(u.visited, "country", "countries")}`}
                      </span>
                    </span>
                    {u.relationship.friends && <Chip>Friends</Chip>}
                  </Row>
                ))}
              </Group>
            )}
            {data.trips.length > 0 && (
              <Group title="Trips">
                {data.trips.map((t) => (
                  <Row key={t.id} onClick={() => go(`/trips/${t.id}`)}>
                    <span className="flex size-9 items-center justify-center rounded-xl bg-brand-soft text-lg">
                      {getCountry(t.countryCode)?.flag ?? <Luggage className="size-4" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{t.title || getCountry(t.countryCode)?.name}</span>
                      <span className="block truncate text-sm text-muted">
                        {t.author && `@${t.author.username}`}
                        {t.cities.length > 0 && ` · ${t.cities.join(" · ")}`}
                      </span>
                    </span>
                  </Row>
                ))}
              </Group>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-2">
      <h3 className="px-3 pt-2 pb-1 text-xs font-semibold tracking-wider text-muted uppercase">{title}</h3>
      {children}
    </section>
  );
}

function Row({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick} className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition duration-150 hover:bg-ai-soft focus-visible:bg-ai-soft">
      {children}
    </button>
  );
}

function Chip({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-visited-soft px-2 py-0.5 text-[11px] font-medium text-visited">{children}</span>;
}

