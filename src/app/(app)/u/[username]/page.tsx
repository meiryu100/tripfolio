"use client";

import { useParams } from "next/navigation";
import { Page } from "@/components/app-shell";
import { BackLink } from "@/components/cards";
import { ErrorState, NotFound } from "@/components/ui";
import { ProfileSkeleton, ProfileView } from "@/features/profile/profile-view";
import { useProfile } from "@/features/social/api";
import { ApiError } from "@/lib/api-client";

export default function UserProfilePage() {
  const { username: raw } = useParams<{ username: string }>();
  const username = decodeURIComponent(raw);
  const { data, isPending, isError, error, refetch } = useProfile(username);
  return (
    <Page wide back={<BackLink fallback="/explore" label="Back" />}>
      {isPending ? (
        <ProfileSkeleton />
      ) : isError ? (
        error instanceof ApiError && error.status === 404 ? (
          <NotFound title="User not found" body={`There's no traveler called @${username}.`} />
        ) : (
          <ErrorState onRetry={() => refetch()} />
        )
      ) : (
        <ProfileView profile={data} />
      )}
    </Page>
  );
}
