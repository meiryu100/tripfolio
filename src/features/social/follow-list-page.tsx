"use client";

import { Lock, Users, UserMinus } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Page } from "@/components/app-shell";
import { BackLink, LoadMore, UserRow, UserRowSkeleton } from "@/components/cards";
import { EmptyState, ErrorState } from "@/components/ui";
import { useMe } from "@/features/auth/api";
import { api, ApiError, errorMessage } from "@/lib/api-client";
import { toast } from "@/lib/ui";
import { cn } from "@/lib/utils";
import { flatten, useFollowList, useProfile } from "./api";

export function FollowListPage({ kind }: { kind: "followers" | "following" }) {
  const { username: raw } = useParams<{ username: string }>();
  const username = decodeURIComponent(raw);
  const me = useMe();
  const qc = useQueryClient();
  const profile = useProfile(username);
  const list = useFollowList(username, kind);
  const items = flatten(list.data);
  const isMine = me.username.toLowerCase() === username.toLowerCase();
  const name = profile.data ? `${profile.data.firstName} ${profile.data.lastName}` : `@${username}`;
  const count = kind === "followers" ? profile.data?.counts.followers : profile.data?.counts.following;

  const removeFollower = async (u: string) => {
    try {
      await api.delete(`/api/me/followers/${u}`);
      toast("Removed from your followers", "info");
      qc.invalidateQueries({ queryKey: ["follows"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
    } catch (e) {
      toast(errorMessage(e), "error");
    }
  };

  return (
    <Page back={<BackLink fallback={`/u/${username}`} label={name} />}>
      <div role="tablist" className="mb-4 grid grid-cols-2 border-b border-border">
        {(["followers", "following"] as const).map((k) => (
          <Link
            key={k}
            role="tab"
            aria-selected={k === kind}
            replace
            href={`/u/${username}/${k}`}
            className={cn(
              "-mb-px flex min-h-12 items-center justify-center border-b-2 text-sm font-semibold capitalize transition duration-200",
              k === kind ? "border-brand" : "border-transparent text-muted hover:text-fg",
            )}
          >
            {k}
            {k === kind && count !== undefined && <span className="ml-1.5 text-muted">({count})</span>}
          </Link>
        ))}
      </div>
      {list.isPending ? (
        Array.from({ length: 5 }, (_, i) => <UserRowSkeleton key={i} />)
      ) : list.isError ? (
        list.error instanceof ApiError && list.error.status === 403 ? (
          <EmptyState icon={<Lock />} title="This account is private" body="Follow them to see who they follow." />
        ) : (
          <ErrorState onRetry={() => list.refetch()} />
        )
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Users />}
          title={kind === "followers" ? "No followers yet" : "Not following anyone yet"}
          action={
            <Link href="/explore" className="text-sm font-semibold text-brand hover:underline">
              Find people on Explore
            </Link>
          }
        />
      ) : (
        <>
          <div className="divide-y divide-border">
            {items.map((u) => (
              <UserRow
                key={u.id}
                user={u}
                relationship={u.relationship}
                isMe={u.id === me.id}
                action={
                  isMine && kind === "followers" && !u.relationship.following ? (
                    <button
                      onClick={() => removeFollower(u.username)}
                      aria-label={`Remove ${u.firstName} from your followers`}
                      title="Remove follower"
                      className="flex size-11 items-center justify-center rounded-xl text-muted transition duration-200 hover:bg-surface-2 hover:text-danger"
                    >
                      <UserMinus className="size-5" />
                    </button>
                  ) : undefined
                }
              />
            ))}
          </div>
          <LoadMore hasMore={Boolean(list.hasNextPage)} loading={list.isFetchingNextPage} onClick={() => list.fetchNextPage()} />
        </>
      )}
    </Page>
  );
}
