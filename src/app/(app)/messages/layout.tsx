"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ConversationList } from "@/features/messages/inbox";
import { cn } from "@/lib/utils";

/**
 * Instagram-style messages: on desktop the conversation list and the open chat sit side by side;
 * on phones the list is its own screen and a chat opens full screen. (No entrance animation here:
 * a transform on an ancestor would trap the full-screen chat inside it.)
 */
export default function MessagesLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const inChat = pathname.startsWith("/messages/t/");
  return (
    <main className="mx-auto w-full max-w-6xl md:px-6 md:py-3">
      <div className="flex md:h-[calc(100dvh-1.5rem)] md:overflow-hidden md:rounded-3xl md:border md:border-border md:bg-surface/85 md:shadow-card md:backdrop-blur">
        <aside className={cn("w-full shrink-0 flex-col border-border md:flex md:w-72 md:border-r lg:w-[360px]", inChat ? "hidden" : "flex")}>
          <ConversationList />
        </aside>
        <section className={cn("min-w-0 flex-1 flex-col", inChat ? "flex" : "hidden md:flex")}>{children}</section>
      </div>
    </main>
  );
}
