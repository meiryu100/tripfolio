"use client";

import { Page } from "@/components/app-shell";
import { ErrorState } from "@/components/ui";
import { useMe } from "@/features/auth/api";
import { ProfileSkeleton, ProfileView } from "@/features/profile/profile-view";
import { useProfile } from "@/features/social/api";

export default function MyProfilePage() {
  const me = useMe();
  const { data, isPending, isError, refetch } = useProfile(me.username);
  return (
    <Page wide>
      {isPending ? <ProfileSkeleton /> : isError ? <ErrorState onRetry={() => refetch()} /> : <ProfileView profile={data} />}
    </Page>
  );
}
