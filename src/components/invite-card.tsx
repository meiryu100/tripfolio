"use client";

import { useState } from "react";

/**
 * On an invite link (/register?ref=<username>): the inviter's own map card, the same image as
 * their share link (it shows only what their privacy settings make public). Hidden if it can't load,
 * e.g. the username doesn't exist.
 */
export function InviteCard({ username, onMissing }: { username: string; onMissing: () => void }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <figure className="mb-6 overflow-hidden rounded-2xl border border-border bg-surface shadow-soft">
      {/* A plain <img>: the card is a dynamic PNG from our own API, not a static asset for next/image. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/users/${encodeURIComponent(username)}/share-image`}
        alt={`@${username}'s travel map`}
        width={1200}
        height={630}
        className="aspect-[1200/630] w-full bg-brand-soft object-cover"
        onError={() => {
          setFailed(true);
          onMissing();
        }}
      />
      <figcaption className="px-4 py-3 text-sm">
        <span className="font-semibold">@{username}</span> invited you. How many countries have <em>you</em> been to?
      </figcaption>
    </figure>
  );
}
