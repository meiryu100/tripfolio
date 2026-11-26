"use client";

import { useParams } from "next/navigation";
import { ChatView } from "@/features/messages/chat";
import { safeDecode } from "@/lib/utils";

export default function ChatPage() {
  const { username: raw } = useParams<{ username: string }>();
  const username = safeDecode(raw);
  return <ChatView key={username.toLowerCase()} username={username} />;
}
