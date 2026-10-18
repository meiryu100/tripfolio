"use client";

import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ImagePlus, Info, X } from "lucide-react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { Avatar, Button, ErrorState, NotFound, Spinner, buttonClass } from "@/components/ui";
import { meKey, useMe } from "@/features/auth/api";
import { ApiError, errorMessage } from "@/lib/api-client";
import type { Chat, Message, UserSummary } from "@/lib/types";
import { toast } from "@/lib/ui";
import { cn } from "@/lib/utils";
import { MESSAGE_MAX } from "@/lib/validation";
import { loadEarlier, useChat, useChatAction, useSendMessage, useSendPhoto, useUnsend } from "./api";
import { ConfirmSheet, ReportSheet, UserActionsSheet } from "./sheets";

const GROUP_GAP = 5 * 60_000; // bubbles closer than this stack together
const STAMP_GAP = 60 * 60_000; // a time stamp row after an hour of quiet

const time = (m: Message) => new Date(m.createdAt).getTime();

function stamp(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const hm = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const days = Math.floor((new Date(now.toDateString()).getTime() - new Date(d.toDateString()).getTime()) / 86_400_000);
  if (days === 0) return hm;
  if (days === 1) return `Yesterday ${hm}`;
  if (days < 7) return `${d.toLocaleDateString(undefined, { weekday: "long" })} ${hm}`;
  return `${d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: d.getFullYear() === now.getFullYear() ? undefined : "numeric" })}, ${hm}`;
}

const EMOJI_ONLY = /^(?:\p{Extended_Pictographic}|\p{Emoji_Component}|‍|️|\s){1,12}$/u;
const isEmojiOnly = (s: string) => EMOJI_ONLY.test(s) && !/^[\d#*\s]+$/.test(s);

const URL_RE = /(https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"])/g;
function linkify(text: string): ReactNode[] {
  return text.split(URL_RE).map((part, i) =>
    i % 2 === 1 ? (
      <a key={i} href={part} target="_blank" rel="noopener noreferrer nofollow ugc" className="break-all underline underline-offset-2">
        {part}
      </a>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}

export function ChatView({ username }: { username: string }) {
  const q = useChat(username);
  if (q.isPending)
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner />
      </div>
    );
  if (q.isError)
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        {q.error instanceof ApiError && q.error.status === 404 ? (
          <NotFound title="User not found" body={`There's no traveler called @${username}.`} />
        ) : (
          <ErrorState onRetry={() => q.refetch()} />
        )}
      </div>
    );
  return <ChatScreen username={username} chat={q.data} />;
}

function ChatScreen({ username, chat }: { username: string; chat: Chat }) {
  const me = useMe();
  const qc = useQueryClient();
  const router = useRouter();
  const scroller = useRef<HTMLDivElement>(null);
  const [earlier, setEarlier] = useState<Message[]>([]);
  const [moreEarlier, setMoreEarlier] = useState<boolean | null>(null);
  const [loadingEarlier, setLoadingEarlier] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [menu, setMenu] = useState(false);
  const [reportMessage, setReportMessage] = useState<string | null>(null);
  const [unsendId, setUnsendId] = useState<string | null>(null);
  const [viewing, setViewing] = useState<Message | null>(null);
  const action = useChatAction(username);
  const unsend = useUnsend(username);

  const latestIds = new Set(chat.messages.map((m) => m.id));
  const messages = [...earlier.filter((m) => !latestIds.has(m.id)), ...chat.messages];
  const hasEarlier = moreEarlier ?? chat.hasEarlier;
  const last = messages[messages.length - 1];
  const lastId = last?.id;

  // Stick to the bottom when a message arrives (unless you've scrolled up to read history).
  const pinned = useRef(true);
  useLayoutEffect(() => {
    const el = scroller.current;
    if (el && pinned.current) el.scrollTop = el.scrollHeight;
  }, [lastId]);

  // Opening the chat marks it read on the server; refresh the badges.
  useEffect(() => {
    qc.invalidateQueries({ queryKey: meKey });
    qc.invalidateQueries({ queryKey: ["conversations"] });
  }, [lastId, qc]);

  const onScroll = () => {
    const el = scroller.current;
    if (el) pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  const showEarlier = async () => {
    const first = messages[0];
    const el = scroller.current;
    if (!first || !el) return;
    setLoadingEarlier(true);
    const before = el.scrollHeight;
    try {
      const page = await loadEarlier(username, first.id);
      setEarlier((prev) => [...page.messages, ...prev]);
      setMoreEarlier(page.hasEarlier);
      requestAnimationFrame(() => (el.scrollTop += el.scrollHeight - before));
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setLoadingEarlier(false);
    }
  };

  const answer = (what: "accept" | "delete" | "block") =>
    action.mutate(what, {
      onSuccess: () => {
        if (what === "accept") toast(`You can now chat with ${chat.other.firstName}`);
        else router.push("/messages/requests");
      },
      onError: (e) => toast(errorMessage(e), "error"),
    });

  const deleteChat = () =>
    action.mutate("delete", {
      onSuccess: () => router.push("/messages"),
      onError: (e) => toast(errorMessage(e), "error"),
    });

  const lastMine = [...messages].reverse().find((m) => m.senderId === me.id);
  const seen = Boolean(lastMine && chat.seenAt && chat.seenAt >= lastMine.createdAt);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg md:static md:z-auto md:min-h-0 md:flex-1 md:bg-transparent">
      <header className="glass flex h-16 shrink-0 items-center gap-2 border-b border-border px-2 md:px-4">
        <Link href={chat.isRequest ? "/messages/requests" : "/messages"} aria-label="Back to messages" className="flex size-10 items-center justify-center rounded-xl hover:bg-surface-2 md:hidden">
          <ArrowLeft className="size-6" />
        </Link>
        <Link href={`/u/${chat.other.username}`} className="flex min-w-0 items-center gap-3 rounded-xl px-1 py-1">
          <Avatar user={chat.other} size={40} />
          <span className="min-w-0">
            <span className="block truncate font-semibold leading-tight">
              {chat.other.firstName} {chat.other.lastName}
            </span>
            <span className="block truncate text-xs text-muted">@{chat.other.username}</span>
          </span>
        </Link>
        <button onClick={() => setMenu(true)} aria-label="Chat details" className="ml-auto flex size-10 items-center justify-center rounded-xl text-fg transition hover:bg-surface-2">
          <Info className="size-6" />
        </button>
      </header>

      <div ref={scroller} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 md:px-5">
        {hasEarlier ? (
          <div className="mb-4 flex justify-center">
            <Button variant="secondary" size="sm" loading={loadingEarlier} onClick={showEarlier}>
              Load earlier messages
            </Button>
          </div>
        ) : (
          <ProfileIntro user={chat.other} />
        )}

        <div className="flex flex-col">
          {messages.map((m, i) => {
            const prev = messages[i - 1];
            const next = messages[i + 1];
            const mine = m.senderId === me.id;
            const showStamp = !prev || time(m) - time(prev) > STAMP_GAP;
            const first = showStamp || !prev || prev.senderId !== m.senderId || time(m) - time(prev) > GROUP_GAP;
            const lastInGroup = !next || next.senderId !== m.senderId || time(next) - time(m) > GROUP_GAP;
            const pending = m.id.startsWith("pending-");
            return (
              <Fragment key={m.id}>
                {showStamp && <p className="my-4 text-center text-xs font-medium text-muted">{stamp(m.createdAt)}</p>}
                <Bubble
                  message={m}
                  mine={mine}
                  other={chat.other}
                  first={first}
                  last={lastInGroup}
                  pending={pending}
                  selected={selected === m.id}
                  onSelect={() => (m.photo && !pending ? setViewing(m) : setSelected(selected === m.id ? null : m.id))}
                  onUnsend={() => setUnsendId(m.id)}
                  onReport={() => setReportMessage(m.id)}
                />
              </Fragment>
            );
          })}
        </div>

        {lastMine && last === lastMine && !last.unsent && (
          <p className="mt-1 pr-1 text-right text-xs text-muted">{last.id.startsWith("pending-") ? "Sending…" : seen ? "Seen" : "Sent"}</p>
        )}
      </div>

      {chat.isRequest ? (
        <RequestBar user={chat.other} busy={action.isPending} onAnswer={answer} />
      ) : chat.canSend ? (
        <Composer username={username} />
      ) : (
        <div className="border-t border-border px-5 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] text-center text-sm text-muted">
          {chat.notice}
          {chat.blocked && (
            <Button variant="secondary" size="sm" className="mt-3 flex mx-auto" loading={action.isPending} onClick={() => action.mutate("unblock")}>
              Unblock
            </Button>
          )}
        </div>
      )}

      {viewing?.photo && (
        <PhotoViewer
          message={viewing}
          mine={viewing.senderId === me.id}
          onClose={() => setViewing(null)}
          onUnsend={() => {
            setUnsendId(viewing.id);
            setViewing(null);
          }}
          onReport={() => {
            setReportMessage(viewing.id);
            setViewing(null);
          }}
        />
      )}
      <UserActionsSheet
        user={chat.other}
        blocked={chat.blocked}
        open={menu}
        onClose={() => setMenu(false)}
        onDeleteChat={chat.conversationId ? deleteChat : undefined}
        showProfileLink
      />
      <ReportSheet user={chat.other} messageId={reportMessage ?? undefined} open={reportMessage !== null} onClose={() => setReportMessage(null)} />
      <ConfirmSheet
        open={unsendId !== null}
        onClose={() => setUnsendId(null)}
        title="Unsend message?"
        body={`It will be removed for you and ${chat.other.firstName}.`}
        confirm="Unsend"
        danger
        onConfirm={() => {
          if (unsendId) unsend.mutate(unsendId, { onError: (e) => toast(errorMessage(e), "error") });
          setUnsendId(null);
          setSelected(null);
        }}
      />
    </div>
  );
}

/** The other person's card at the top of a conversation, like Instagram. */
function ProfileIntro({ user }: { user: UserSummary }) {
  return (
    <div className="animate-rise flex flex-col items-center pt-4 pb-8 text-center">
      <span className="bg-aurora rounded-full p-[3px] shadow-glow">
        <Avatar user={user} size={88} className="ring-4 ring-surface" />
      </span>
      <p className="mt-3 text-lg font-bold">
        {user.firstName} {user.lastName}
      </p>
      <p className="text-sm text-muted">@{user.username} · Tripfolio</p>
      <Link href={`/u/${user.username}`} className={buttonClass("secondary", "sm", "mt-3")}>
        View profile
      </Link>
    </div>
  );
}

function Bubble({
  message: m,
  mine,
  other,
  first,
  last,
  pending,
  selected,
  onSelect,
  onUnsend,
  onReport,
}: {
  message: Message;
  mine: boolean;
  other: UserSummary;
  first: boolean;
  last: boolean;
  pending: boolean;
  selected: boolean;
  onSelect: () => void;
  onUnsend: () => void;
  onReport: () => void;
}) {
  const big = !m.unsent && !m.photo && isEmojiOnly(m.body);
  if (m.photo && !m.unsent) {
    const ratio = m.photo.width && m.photo.height ? Math.min(1.6, Math.max(0.6, m.photo.width / m.photo.height)) : 4 / 3;
    return (
      <div className={cn("flex items-end gap-2", mine ? "justify-end" : "justify-start", first ? "mt-2.5" : "mt-0.5")}>
        {!mine && <span className="w-7 shrink-0">{last && <Avatar user={other} size={28} />}</span>}
        <button
          type="button"
          onClick={onSelect}
          aria-label="Open photo"
          className={cn("relative block w-[min(260px,65vw)] overflow-hidden rounded-[22px] border border-border bg-surface-2 shadow-soft", pending && "opacity-70")}
          style={{ aspectRatio: ratio }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={m.photo.src} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
          {pending && (
            <span className="absolute inset-0 flex items-center justify-center bg-black/20">
              <Spinner />
            </span>
          )}
        </button>
      </div>
    );
  }
  return (
    <div className={cn("flex items-end gap-2", mine ? "justify-end" : "justify-start", first ? "mt-2.5" : "mt-0.5")}>
      {!mine && (
        <span className="w-7 shrink-0">{last && <Avatar user={other} size={28} />}</span>
      )}
      <div className={cn("flex max-w-[78%] min-w-0 flex-col sm:max-w-[65%]", mine ? "items-end" : "items-start")}>
        <button
          type="button"
          onClick={onSelect}
          disabled={pending}
          aria-expanded={selected}
          className={cn(
            "max-w-full text-left text-[15px] leading-snug break-words [overflow-wrap:anywhere] whitespace-pre-wrap transition duration-200",
            pending && "opacity-60",
            m.unsent
              ? "rounded-[22px] border border-border px-4 py-2 text-sm text-muted italic"
              : big
                ? "px-1 text-5xl leading-tight"
                : cn(
                    "rounded-[22px] px-4 py-2",
                    mine
                      ? "bg-gradient-to-br from-brand-bright via-brand-2 to-ai text-white shadow-soft"
                      : "bg-surface-2 text-fg",
                    mine ? [!first && "rounded-tr-md", !last && "rounded-br-md"] : [!first && "rounded-tl-md", !last && "rounded-bl-md"],
                  ),
          )}
        >
          {m.unsent ? (mine ? "You unsent a message" : "Message unsent") : linkify(m.body)}
        </button>
        {selected && (
          <div className="animate-fade mt-1 flex items-center gap-3 px-1 text-xs text-muted">
            <span>{stamp(m.createdAt)}</span>
            {!m.unsent &&
              (mine ? (
                <button onClick={onUnsend} className="font-semibold text-danger hover:underline">
                  Unsend
                </button>
              ) : (
                <button onClick={onReport} className="font-semibold hover:text-fg hover:underline">
                  Report
                </button>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Full-screen photo with its time and Unsend / Report. */
function PhotoViewer({
  message: m,
  mine,
  onClose,
  onUnsend,
  onReport,
}: {
  message: Message;
  mine: boolean;
  onClose: () => void;
  onUnsend: () => void;
  onReport: () => void;
}) {
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  // Portalled: the desktop chat panel's backdrop blur would otherwise trap a fixed overlay inside it.
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Photo" className="animate-fade fixed inset-0 z-[70] flex flex-col bg-black/90 backdrop-blur-sm" onClick={onClose}>
      <div className="flex items-center justify-between px-4 py-3 text-white" onClick={(e) => e.stopPropagation()}>
        <span className="text-sm text-white/80">{stamp(m.createdAt)}</span>
        <div className="flex items-center gap-1">
          {mine ? (
            <button onClick={onUnsend} className="rounded-full px-3 py-2 text-sm font-semibold text-red-300 hover:bg-white/10">
              Unsend
            </button>
          ) : (
            <button onClick={onReport} className="rounded-full px-3 py-2 text-sm font-semibold hover:bg-white/10">
              Report
            </button>
          )}
          <button onClick={onClose} aria-label="Close" className="flex size-10 items-center justify-center rounded-full hover:bg-white/10">
            <X className="size-6" />
          </button>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={m.photo!.src} alt="" className="max-h-full max-w-full rounded-2xl object-contain shadow-float" onClick={(e) => e.stopPropagation()} />
      </div>
    </div>,
    document.body,
  );
}

function RequestBar({ user, busy, onAnswer }: { user: UserSummary; busy: boolean; onAnswer: (a: "accept" | "delete" | "block") => void }) {
  const [confirmBlock, setConfirmBlock] = useState(false);
  return (
    <div className="border-t border-border bg-surface/80 px-5 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] text-center backdrop-blur">
      <p className="font-semibold">
        {user.firstName} sent you a message request
      </p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
        If you accept, you can chat and they&apos;ll see when you&apos;ve read their messages. They won&apos;t know you&apos;ve seen this request until then.
      </p>
      <div className="mx-auto mt-4 mb-4 grid max-w-md grid-cols-3 gap-2">
        <Button variant="ghost" className="text-danger" disabled={busy} onClick={() => setConfirmBlock(true)}>
          Block
        </Button>
        <Button variant="secondary" disabled={busy} onClick={() => onAnswer("delete")}>
          Delete
        </Button>
        <Button loading={busy} onClick={() => onAnswer("accept")}>
          Accept
        </Button>
      </div>
      <ConfirmSheet
        open={confirmBlock}
        onClose={() => setConfirmBlock(false)}
        title={`Block ${user.firstName}?`}
        body="They won't be able to message you, and you'll stop following each other. They won't be told you blocked them."
        confirm="Block"
        danger
        onConfirm={() => {
          setConfirmBlock(false);
          onAnswer("block");
        }}
      />
    </div>
  );
}

function Composer({ username }: { username: string }) {
  const me = useMe();
  const send = useSendMessage(username, me);
  const sendPhoto = useSendPhoto(username, me);
  const [text, setText] = useState("");
  const field = useRef<HTMLTextAreaElement>(null);
  const picker = useRef<HTMLInputElement>(null);

  const pickPhotos = async (files: FileList | null) => {
    for (const file of Array.from(files ?? []).slice(0, 10)) {
      const preview = URL.createObjectURL(file);
      const img = new Image();
      img.src = preview;
      const size = await img.decode().then(
        () => ({ width: img.naturalWidth, height: img.naturalHeight }),
        () => null,
      );
      sendPhoto.mutate({ file, preview, size }, { onError: (err) => toast(errorMessage(err), "error") });
    }
    if (picker.current) picker.current.value = "";
  };

  const grow = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  };

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    const body = text.trim();
    if (!body || send.isPending) return;
    setText("");
    if (field.current) {
      field.current.style.height = "auto";
      field.current.focus();
    }
    send.mutate(body, {
      onError: (err) => {
        setText(body);
        toast(errorMessage(err), "error");
      },
    });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) submit(e);
  };

  return (
    <form onSubmit={submit} className="shrink-0 px-3 pt-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:px-4 md:pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
      <div className="flex items-end gap-2 rounded-[26px] border border-border bg-surface py-1.5 pr-2 pl-4 shadow-soft transition duration-200 focus-within:border-brand-bright focus-within:ring-4 focus-within:ring-brand-bright/15">
        <textarea
          ref={field}
          rows={1}
          value={text}
          maxLength={MESSAGE_MAX}
          onChange={(e) => {
            setText(e.target.value);
            grow(e.target);
          }}
          onKeyDown={onKeyDown}
          placeholder="Message…"
          aria-label="Message"
          className="max-h-32 min-h-9 flex-1 resize-none bg-transparent py-1.5 text-[15px] leading-6 outline-none! placeholder:text-muted"
        />
        {text.trim() ? (
          <button type="submit" className="animate-fade h-9 shrink-0 rounded-full px-3 font-semibold text-brand transition hover:bg-brand-soft">
            Send
          </button>
        ) : (
          <button
            type="button"
            onClick={() => picker.current?.click()}
            aria-label="Send a photo"
            className="animate-fade flex size-9 shrink-0 items-center justify-center rounded-full text-fg transition hover:bg-surface-2"
          >
            <ImagePlus className="size-5.5" />
          </button>
        )}
        <input ref={picker} type="file" accept="image/*" multiple hidden onChange={(e) => pickPhotos(e.target.files)} />
      </div>
    </form>
  );
}
