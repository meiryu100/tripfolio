"use client";

import { useParams } from "next/navigation";
import { ChatView } from "@/features/messages/chat";

export default function ChatPage() {
  const { username: raw } = useParams<{ username: string }>();
  const username = decodeURIComponent(raw);
  return <ChatView key={username.toLowerCase()} username={username} />;
}
