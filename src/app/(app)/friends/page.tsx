"use client";

import { Check, Rss, UserPlus, Users, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Page } from "@/components/app-shell";
import { LoadMore, UserRow, UserRowSkeleton } from "@/components/cards";
import { Button, EmptyState, ErrorState, Skeleton, buttonClass } from "@/components/ui";
import { useMe } from "@/features/auth/api";
import { ActivityItem } from "@/features/social/activity-item";
import { flatten, useAnswerRequest, useFeed, useFriends, useRequests } from "@/features/social/api";
import { errorMessage } from "@/lib/api-client";
import { toast } from "@/lib/ui";
import { cn, timeAgo } from "@/lib/utils";

type Tab = "feed" | "friends" | "requests";

export default function FriendsPage() {
  const me = useMe();
  const [tab, setTab] = useState<Tab>("feed");
  const tabs: { id: Tab; label: string; badge?: number }[] = [
    { id: "feed", label: "Activity" },
    { id: "friends", label: "Friends" },
    { id: "requests", label: "Requests", badge: me.pendingRequests },
  ];

  return (
    <Page title="Friends" subtitle="What the people you follow have been up to.">
      <div role="tablist" aria-label="Friends sections" className="mb-5 grid grid-cols-3 gap-1 rounded-2xl bg-surface-2 p-1 shadow-pressed">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex min-h-11 items-center justify-center gap-1.5 rounded-xl text-sm font-semibold transition duration-200",
              tab === t.id ? "bg-surface text-fg shadow-soft" : "text-muted hover:text-fg",
            )}
          >
            {t.label}
            {Boolean(t.badge) && <span className="rounded-full bg-danger px-1.5 text-[11px] text-white">{t.badge}</span>}
          </button>
        ))}
      </div>
      {tab === "feed" && <Feed />}
      {tab === "friends" && <FriendsList />}
      {tab === "requests" && <Requests />}
    </Page>
  );
}

function Feed() {
  const q = useFeed();
  const items = flatten(q.data);
  if (q.isPending)
    return (
      <div className="grid gap-4">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-40" />
        ))}
      </div>
    );
  if (q.isError) return <ErrorState onRetry={() => q.refetch()} />;
  if (!items.length)
    return (
      <EmptyState
        icon={<Rss />}
        title="Your feed is quiet"
        body="Follow travelers to see the countries they visit and the trips they share."
        action={
          <Link href="/explore" className={buttonClass("primary")}>
            Find people to follow
          </Link>
        }
      />
    );
  return (
    <>
      <div className="grid gap-4">
        {items.map((a) => (
          <ActivityItem key={a.id} activity={a} />
        ))}
      </div>
      <LoadMore hasMore={Boolean(q.hasNextPage)} loading={q.isFetchingNextPage} onClick={() => q.fetchNextPage()} />
    </>
  );
}

function FriendsList() {
  const q = useFriends();
  if (q.isPending) return <>{Array.from({ length: 4 }, (_, i) => <UserRowSkeleton key={i} />)}</>;
  if (q.isError) return <ErrorState onRetry={() => q.refetch()} />;
  if (!q.data.length)
    return <EmptyState icon={<Users />} title="No friends yet" body="When you and someone follow each other, they'll show up here." />;
  return (
    <div className="divide-y divide-border">
      {q.data.map((u) => (
        <UserRow key={u.id} user={u} relationship={{ following: true, followsYou: true, friends: true, requested: false }} />
      ))}
    </div>
  );
}

function Requests() {
  const q = useRequests();
  const answer = useAnswerRequest();
  if (q.isPending) return <>{Array.from({ length: 2 }, (_, i) => <UserRowSkeleton key={i} />)}</>;
  if (q.isError) return <ErrorState onRetry={() => q.refetch()} />;
  if (!q.data.length)
    return (
      <EmptyState
        icon={<UserPlus />}
        title="No follow requests"
        body="If your profile is private, people who want to follow you will appear here for approval."
      />
    );
  const respond = (username: string, accept: boolean, name: string) =>
    answer.mutate(
      { username, accept },
      {
        onSuccess: () => toast(accept ? `${name} can now see your world ✓` : "Request declined", accept ? "success" : "info"),
        onError: (e) => toast(errorMessage(e), "error"),
      },
    );
  return (
    <div className="divide-y divide-border">
      {q.data.map((r) => (
        <UserRow
          key={r.user.id}
          user={r.user}
          meta={timeAgo(r.createdAt)}
          action={
            <div className="flex gap-2">
              <Button size="sm" onClick={() => respond(r.user.username, true, r.user.firstName)} aria-label={`Approve ${r.user.firstName}`}>
                <Check className="size-4" /> Approve
              </Button>
              <Button size="sm" variant="secondary" onClick={() => respond(r.user.username, false, r.user.firstName)} aria-label={`Decline ${r.user.firstName}`}>
                <X className="size-4" />
              </Button>
            </div>
          }
        />
      ))}
    </div>
  );
}
