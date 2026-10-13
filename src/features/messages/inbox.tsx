"use client";

import { Inbox, Search, Send, SquarePen } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar, Button, ErrorState, Sheet, SheetClose, Skeleton, Spinner } from "@/components/ui";
import { useMe } from "@/features/auth/api";
import { useSearch } from "@/features/explore/api";
import { useFriends } from "@/features/social/api";
import type { ConversationSummary, MessageFolder, UserSummary } from "@/lib/types";
import { cn } from "@/lib/utils";
import { shortAgo, useConversations } from "./api";

const folderFor = (pathname: string): MessageFolder => (pathname.startsWith("/messages/requests") ? "requests" : "inbox");

/** The left column: Messages / Requests tabs and the conversation list. */
export function ConversationList() {
  const me = useMe();
  const pathname = usePathname();
  const [folder, setFolder] = useState<MessageFolder>(folderFor(pathname));
  const [prevPath, setPrevPath] = useState(pathname);
  const [composing, setComposing] = useState(false);
  // Opening /messages or /messages/requests picks that tab; opening a chat keeps the current one.
  if (prevPath !== pathname) {
    setPrevPath(pathname);
    if (!pathname.startsWith("/messages/t/")) setFolder(folderFor(pathname));
  }
  const q = useConversations(folder);
  const active = pathname.startsWith("/messages/t/") ? decodeURIComponent(pathname.split("/")[3] ?? "").toLowerCase() : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="px-4 pt-5 pb-1 sm:px-5 md:pt-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Messages</h1>
          <button
            onClick={() => setComposing(true)}
            aria-label="New message"
            className="flex size-10 items-center justify-center rounded-xl text-fg transition duration-200 hover:bg-surface-2"
          >
            <SquarePen className="size-5.5" />
          </button>
        </div>
        <div role="tablist" aria-label="Message folders" className="mt-3 flex gap-6 border-b border-border">
          {(["inbox", "requests"] as const).map((f) => (
            <button
              key={f}
              role="tab"
              aria-selected={folder === f}
              onClick={() => setFolder(f)}
              className={cn(
                "-mb-px flex min-h-11 items-center gap-1.5 border-b-2 text-[15px] font-semibold transition duration-200",
                folder === f ? "border-fg text-fg" : "border-transparent text-muted hover:text-fg",
              )}
            >
              {f === "inbox" ? "Messages" : "Requests"}
              {f === "requests" && me.messageRequests > 0 && (
                <span className="rounded-full bg-brand-bright px-1.5 text-[11px] leading-[18px] text-white">{me.messageRequests}</span>
              )}
            </button>
          ))}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto pb-24 md:pb-3">
        {folder === "requests" && (q.data?.length ?? 0) > 0 && (
          <p className="px-4 pt-3 pb-1 text-[13px] text-muted sm:px-5">
            Messages from people you don&apos;t follow. They won&apos;t know you&apos;ve seen them until you accept.
          </p>
        )}
        {q.isPending ? (
          Array.from({ length: 6 }, (_, i) => <RowSkeleton key={i} />)
        ) : q.isError ? (
          <div className="p-4">
            <ErrorState onRetry={() => q.refetch()} />
          </div>
        ) : q.data.length === 0 ? (
          folder === "inbox" ? (
            <ListEmpty icon={<Send />} title="No messages yet" body="Open a traveler's profile and say hi, or start a new message." action={<Button size="sm" onClick={() => setComposing(true)}>Send message</Button>} />
          ) : (
            <ListEmpty icon={<Inbox />} title="No message requests" body="Messages from people you don't follow will show up here." />
          )
        ) : (
          <ul className="pt-1">
            {q.data.map((c) => (
              <li key={c.id}>
                <ConversationRow c={c} active={c.other.username.toLowerCase() === active} />
              </li>
            ))}
          </ul>
        )}
      </div>
      <ComposeSheet open={composing} onClose={() => setComposing(false)} />
    </div>
  );
}

function preview(c: ConversationSummary) {
  const m = c.lastMessage;
  if (!m) return "";
  if (m.unsent) return m.fromMe ? "You unsent a message" : "Message unsent";
  if (m.photo && !m.body) return m.fromMe ? "You sent a photo" : "Sent a photo";
  return m.fromMe ? `You: ${m.body}` : m.body;
}

function ConversationRow({ c, active }: { c: ConversationSummary; active: boolean }) {
  return (
    <Link
      href={`/messages/t/${c.other.username}`}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 px-4 py-2.5 transition duration-200 sm:px-5",
        active ? "bg-surface-2" : "hover:bg-surface-2/70",
      )}
    >
      <Avatar user={c.other} size={56} />
      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-[15px]", c.unread ? "font-bold" : "font-medium")}>
          {c.other.firstName} {c.other.lastName}
        </p>
        <p className={cn("flex min-w-0 gap-1 text-sm", c.unread ? "font-semibold text-fg" : "text-muted")}>
          <span className={cn("truncate", c.lastMessage?.unsent && "italic")}>{preview(c)}</span>
          {c.lastMessage && <span className="shrink-0 text-muted">· {shortAgo(c.lastMessage.createdAt)}</span>}
        </p>
      </div>
      {c.unread && <span className="size-2.5 shrink-0 rounded-full bg-brand-bright shadow-glow" aria-label="Unread" />}
    </Link>
  );
}

function RowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 sm:px-5">
      <Skeleton className="size-14 rounded-full" />
      <div className="grid flex-1 gap-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3.5 w-48" />
      </div>
    </div>
  );
}

function ListEmpty({ icon, title, body, action }: { icon: React.ReactNode; title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="animate-rise flex flex-col items-center px-8 py-14 text-center">
      <span className="flex size-16 items-center justify-center rounded-full border-2 border-fg/80 text-fg [&_svg]:size-7" aria-hidden>
        {icon}
      </span>
      <p className="mt-4 font-semibold">{title}</p>
      <p className="mt-1 max-w-xs text-sm text-muted">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** The right column on desktop when no chat is open. */
export function MessagesHome() {
  const [composing, setComposing] = useState(false);
  return (
    <div className="animate-rise flex flex-1 flex-col items-center justify-center p-8 text-center">
      <span className="bg-aurora rounded-full p-[3px] shadow-glow">
        <span className="flex size-24 items-center justify-center rounded-full bg-surface">
          <Send className="size-10 -translate-x-0.5 translate-y-0.5 text-fg" aria-hidden />
        </span>
      </span>
      <h2 className="mt-5 text-xl font-bold">Your messages</h2>
      <p className="mt-1 max-w-xs text-muted">Send a private message to a fellow traveler.</p>
      <Button className="mt-5" onClick={() => setComposing(true)}>
        Send message
      </Button>
      <ComposeSheet open={composing} onClose={() => setComposing(false)} />
    </div>
  );
}

/** "New message": pick someone (friends first, or search) and open the chat. */
export function ComposeSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const friends = useFriends();
  const search = useSearch(query);
  const searching = query.trim().length > 0;
  const people: UserSummary[] = searching ? (search.data?.users ?? []) : (friends.data ?? []);
  const loading = searching ? search.isPending || search.isDebouncing : friends.isPending;

  const close = () => {
    setQuery("");
    onClose();
  };
  const pick = (u: UserSummary) => {
    close();
    router.push(`/messages/t/${u.username}`);
  };

  return (
    <Sheet open={open} onClose={close} label="New message">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <span className="size-9" />
        <h2 className="font-bold">New message</h2>
        <SheetClose onClick={close} />
      </div>
      <label className="flex items-center gap-3 border-b border-border px-5 py-2.5">
        <span className="font-semibold">To:</span>
        <Search className="size-4 text-muted" aria-hidden />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search travelers…"
          className="h-10 min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted"
        />
      </label>
      <div className="min-h-64 overflow-y-auto py-2">
        {!searching && (friends.data?.length ?? 0) > 0 && <p className="px-5 pt-1 pb-2 text-sm font-semibold">Friends</p>}
        {loading ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : people.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted">
            {searching ? "No travelers found." : "Search for a traveler by name or @username."}
          </p>
        ) : (
          people.map((u) => (
            <button key={u.id} onClick={() => pick(u)} className="flex w-full items-center gap-3 px-5 py-2 text-left transition duration-200 hover:bg-surface-2">
              <Avatar user={u} size={44} />
              <span className="min-w-0">
                <span className="block truncate font-semibold">
                  {u.firstName} {u.lastName}
                </span>
                <span className="block truncate text-sm text-muted">@{u.username}</span>
              </span>
            </button>
          ))
        )}
      </div>
    </Sheet>
  );
}
