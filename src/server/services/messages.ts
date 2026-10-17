import "server-only";
import { and, count, desc, eq, gt, inArray, lt, or, sql } from "drizzle-orm";
import { db, schema } from "../db";
import type { UserRow } from "../db/schema";
import { badRequest, forbidden, HttpError, notFound } from "../http/errors";
import { rateLimit } from "../http/rate-limit";
import { deleteObjects, putObject } from "../storage";
import { processPhoto } from "../storage/images";
import { toUserSummary } from "./mappers";
import { notify } from "./notifications";
import { requireUserByUsername } from "./users";
import type { Chat, ConversationSummary, Message, MessageFolder, UserSummary } from "@/lib/types";
import type { z } from "zod";
import type { reportSchema } from "@/lib/validation";

/**
 * Direct messages, Instagram-style (spec: tripfolio-agents/product/specs/messaging.md).
 *
 * - Anyone may message a public account; a private account only by people it approved as followers.
 * - A first message from someone the recipient doesn't follow opens a REQUEST: it waits in the
 *   recipient's Requests folder, the sender may send just that one message, and "Seen" stays hidden
 *   until it's accepted. Everything else goes straight to the Inbox (ACTIVE).
 * - "Unsend" clears a message for both people; "Delete chat" hides it only for the viewer (clearedAt).
 * - A block in either direction stops all messaging.
 */

const PAGE = 40;
const MESSAGES_PER_MINUTE = { max: 30, window: 60 };
const NEW_CHATS_PER_DAY = 20;

const pair = (a: string, b: string) => (a < b ? [a, b] : [b, a]) as [string, string];

async function findConversation(a: string, b: string) {
  const [low, high] = pair(a, b);
  return (
    (await db.query.conversations.findFirst({
      where: and(eq(schema.conversations.userLowId, low), eq(schema.conversations.userHighId, high)),
    })) ?? null
  );
}

async function getMember(conversationId: string, userId: string) {
  return db.query.conversationMembers.findFirst({
    where: and(eq(schema.conversationMembers.conversationId, conversationId), eq(schema.conversationMembers.userId, userId)),
  });
}

/** Who blocked whom between two users. */
export async function blockState(viewerId: string, otherId: string) {
  const rows = await db
    .select()
    .from(schema.blocks)
    .where(
      or(
        and(eq(schema.blocks.blockerId, viewerId), eq(schema.blocks.blockedId, otherId)),
        and(eq(schema.blocks.blockerId, otherId), eq(schema.blocks.blockedId, viewerId)),
      ),
    );
  return {
    blockedByMe: rows.some((r) => r.blockerId === viewerId),
    blockedMe: rows.some((r) => r.blockerId === otherId),
  };
}

async function follows(followerId: string, followingId: string) {
  const row = await db.query.follows.findFirst({
    columns: { status: true },
    where: and(eq(schema.follows.followerId, followerId), eq(schema.follows.followingId, followingId)),
  });
  return row?.status === "ACCEPTED";
}

/** May the viewer start a new chat with this user (no conversation yet, no blocks)? */
async function mayStartChat(viewerId: string, other: UserRow) {
  if (!other.isPrivate) return true;
  // Private accounts: only people they approved as followers.
  return follows(viewerId, other.id);
}

/** For the profile header: show "Message"? */
export async function messagingStatus(viewerId: string | null, other: UserRow) {
  if (!viewerId || viewerId === other.id) return { canMessage: false, blocked: false };
  const { blockedByMe, blockedMe } = await blockState(viewerId, other.id);
  if (blockedByMe || blockedMe) return { canMessage: false, blocked: blockedByMe };
  const canMessage = Boolean(await findConversation(viewerId, other.id)) || (await mayStartChat(viewerId, other));
  return { canMessage, blocked: false };
}

function toMessage(m: typeof schema.messages.$inferSelect): Message {
  const photo =
    m.photoKey && !m.deletedAt
      ? { src: `/api/messages/photo/${m.id}`, thumb: `/api/messages/photo/${m.id}?size=thumb`, width: m.photoWidth, height: m.photoHeight }
      : null;
  return {
    id: m.id,
    senderId: m.senderId,
    body: m.deletedAt ? "" : m.body,
    photo,
    unsent: Boolean(m.deletedAt),
    createdAt: m.createdAt.toISOString(),
  };
}

// ─── Reading ─────────────────────────────────────────────────────────────────

/** A chat with one person. Without `before`, also marks it read. */
export async function getChat(viewerId: string, username: string, before?: string): Promise<Chat> {
  const other = await requireUserByUsername(username);
  if (other.id === viewerId) throw badRequest("You can't message yourself.");
  const [conv, blocks] = await Promise.all([findConversation(viewerId, other.id), blockState(viewerId, other.id)]);

  let messages: Message[] = [];
  let hasEarlier = false;
  let seenAt: string | null = null;
  let mine = 0;
  if (conv) {
    const [me, them] = await Promise.all([getMember(conv.id, viewerId), getMember(conv.id, other.id)]);
    const anchor = before
      ? await db.query.messages.findFirst({
          where: and(eq(schema.messages.id, before), eq(schema.messages.conversationId, conv.id)),
        })
      : null;
    const rows = await db
      .select()
      .from(schema.messages)
      .where(
        and(
          eq(schema.messages.conversationId, conv.id),
          me?.clearedAt ? gt(schema.messages.createdAt, me.clearedAt) : undefined,
          anchor
            ? or(
                lt(schema.messages.createdAt, anchor.createdAt),
                and(eq(schema.messages.createdAt, anchor.createdAt), lt(schema.messages.id, anchor.id)),
              )
            : undefined,
        ),
      )
      .orderBy(desc(schema.messages.createdAt), desc(schema.messages.id))
      .limit(PAGE + 1);
    hasEarlier = rows.length > PAGE;
    messages = rows.slice(0, PAGE).reverse().map(toMessage);
    if (conv.state === "ACTIVE" && them && them.lastReadAt.getTime() > 0) seenAt = them.lastReadAt.toISOString();
    if (conv.state === "REQUEST" && conv.initiatorId === viewerId) {
      const [{ n }] = await db
        .select({ n: count() })
        .from(schema.messages)
        .where(and(eq(schema.messages.conversationId, conv.id), eq(schema.messages.senderId, viewerId)));
      mine = n;
    }
    if (!before) {
      await db
        .update(schema.conversationMembers)
        .set({ lastReadAt: new Date() })
        .where(and(eq(schema.conversationMembers.conversationId, conv.id), eq(schema.conversationMembers.userId, viewerId)));
    }
  }

  const isRequest = conv?.state === "REQUEST" && conv.initiatorId !== viewerId;
  const awaitingAccept = conv?.state === "REQUEST" && conv.initiatorId === viewerId;
  let notice: string | null = null;
  if (blocks.blockedByMe) notice = `You blocked @${other.username}. Unblock them to send messages.`;
  else if (blocks.blockedMe) notice = "You can't message this account.";
  else if (!conv && !(await mayStartChat(viewerId, other)))
    notice = `@${other.username}'s account is private. Only people they've approved can message them.`;
  else if (awaitingAccept && mine >= 1) notice = `You can send more messages once ${other.firstName} accepts your request.`;

  return {
    other: toUserSummary(other),
    conversationId: conv?.id ?? null,
    isRequest,
    awaitingAccept,
    canSend: notice === null,
    notice,
    seenAt,
    blocked: blocks.blockedByMe,
    messages,
    hasEarlier,
  };
}

interface ConversationRow extends Record<string, unknown> {
  id: string;
  other_id: string;
  username: string;
  first_name: string;
  last_name: string;
  avatar_key: string | null;
  lm_body: string | null;
  lm_photo: string | null;
  lm_sender: string | null;
  lm_deleted: Date | null;
  lm_created: Date | null;
  unread: boolean;
}

/** Messages from the other person the viewer hasn't read (and hasn't cleared). */
const unreadSql = (viewerId: string) => sql`EXISTS (
  SELECT 1 FROM ${schema.messages} x
  WHERE x.conversation_id = c.id AND x.sender_id <> ${viewerId} AND x.deleted_at IS NULL
    AND x.created_at > m.last_read_at AND (m.cleared_at IS NULL OR x.created_at > m.cleared_at))`;

const inboxSql = (viewerId: string) => sql`(c.state = 'ACTIVE' OR c.initiator_id = ${viewerId})`;
const requestSql = (viewerId: string) => sql`(c.state = 'REQUEST' AND c.initiator_id <> ${viewerId})`;

export async function listConversations(viewerId: string, folder: MessageFolder): Promise<ConversationSummary[]> {
  const { rows } = await db.execute<ConversationRow>(sql`
    SELECT c.id, u.id AS other_id, u.username, u.first_name, u.last_name, u.avatar_key,
           lm.body AS lm_body, lm.photo_key AS lm_photo, lm.sender_id AS lm_sender, lm.deleted_at AS lm_deleted, lm.created_at AS lm_created,
           ${unreadSql(viewerId)} AS unread
    FROM ${schema.conversationMembers} m
    JOIN ${schema.conversations} c ON c.id = m.conversation_id
    JOIN ${schema.users} u ON u.id = CASE WHEN c.user_low_id = ${viewerId} THEN c.user_high_id ELSE c.user_low_id END
    JOIN LATERAL (
      SELECT body, photo_key, sender_id, deleted_at, created_at FROM ${schema.messages}
      WHERE conversation_id = c.id AND (m.cleared_at IS NULL OR created_at > m.cleared_at)
      ORDER BY created_at DESC, id DESC LIMIT 1
    ) lm ON true
    WHERE m.user_id = ${viewerId} AND ${folder === "inbox" ? inboxSql(viewerId) : requestSql(viewerId)}
    ORDER BY c.last_message_at DESC
    LIMIT 100`);
  return rows.map((r) => ({
    id: r.id,
    other: toUserSummary({ id: r.other_id, username: r.username, firstName: r.first_name, lastName: r.last_name, avatarKey: r.avatar_key }),
    lastMessage: r.lm_created
      ? {
          body: r.lm_deleted ? "" : (r.lm_body ?? ""),
          photo: Boolean(r.lm_photo) && !r.lm_deleted,
          fromMe: r.lm_sender === viewerId,
          unsent: Boolean(r.lm_deleted),
          createdAt: new Date(r.lm_created).toISOString(),
        }
      : null,
    unread: r.unread,
  }));
}

/** Badge numbers for /api/me. */
export async function messageCounts(viewerId: string) {
  const { rows } = await db.execute<{ unread: number; requests: number }>(sql`
    SELECT
      count(*) FILTER (WHERE ${inboxSql(viewerId)} AND ${unreadSql(viewerId)})::int AS unread,
      count(*) FILTER (WHERE ${requestSql(viewerId)} AND (m.cleared_at IS NULL OR c.last_message_at > m.cleared_at))::int AS requests
    FROM ${schema.conversationMembers} m
    JOIN ${schema.conversations} c ON c.id = m.conversation_id
    WHERE m.user_id = ${viewerId}`);
  return { unreadMessages: rows[0]?.unread ?? 0, messageRequests: rows[0]?.requests ?? 0 };
}

// ─── Writing ─────────────────────────────────────────────────────────────────

export async function sendMessage(viewerId: string, username: string, body: string): Promise<Message> {
  const conv = await conversationForSending(viewerId, username);
  return insertMessage(conv.id, viewerId, { body });
}

/** Send a photo: re-encoded (location data stripped) and stored privately, readable only by the two people. */
export async function sendPhoto(viewerId: string, username: string, file: Buffer): Promise<Message> {
  const conv = await conversationForSending(viewerId, username);
  const img = await processPhoto(file, { full: 1600, thumb: 480 });
  const key = `messages/${conv.id}/${crypto.randomUUID()}`;
  await Promise.all([
    putObject(`${key}/full.webp`, img.full, "image/webp"),
    putObject(`${key}/thumb.webp`, img.thumb, "image/webp"),
  ]);
  return insertMessage(conv.id, viewerId, { photoKey: key, photoWidth: img.width, photoHeight: img.height });
}

/** Every check before sending (blocks, private accounts, request cap, limits); creates the chat if needed. */
async function conversationForSending(viewerId: string, username: string) {
  await rateLimit(`messages:${viewerId}`, MESSAGES_PER_MINUTE);
  const other = await requireUserByUsername(username);
  if (other.id === viewerId) throw badRequest("You can't message yourself.");
  const blocks = await blockState(viewerId, other.id);
  if (blocks.blockedByMe || blocks.blockedMe) throw forbidden("You can't message this account.");

  let conv = await findConversation(viewerId, other.id);
  if (!conv) {
    if (!(await mayStartChat(viewerId, other))) throw forbidden(`@${other.username}'s account is private.`);
    const [{ n }] = await db
      .select({ n: count() })
      .from(schema.conversations)
      .where(and(eq(schema.conversations.initiatorId, viewerId), gt(schema.conversations.createdAt, sql`now() - interval '1 day'`)));
    if (n >= NEW_CHATS_PER_DAY) throw new HttpError("RATE_LIMITED", "You've started a lot of new chats today. Try again tomorrow.");

    // Straight to the Inbox when they follow the sender, or (private accounts) approved the sender as a follower.
    const active = other.isPrivate || (await follows(other.id, viewerId));
    const [low, high] = pair(viewerId, other.id);
    conv = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(schema.conversations)
        .values({ userLowId: low, userHighId: high, initiatorId: viewerId, state: active ? "ACTIVE" : "REQUEST" })
        .onConflictDoNothing()
        .returning();
      if (!created) return null; // Both sent a first message at once; use theirs.
      await tx.insert(schema.conversationMembers).values([
        { conversationId: created.id, userId: viewerId },
        { conversationId: created.id, userId: other.id },
      ]);
      return created;
    });
    if (conv?.state === "REQUEST") await notify({ userId: other.id, actorUserId: viewerId, type: "MESSAGE_REQUEST" });
    conv ??= await findConversation(viewerId, other.id);
    if (!conv) throw new HttpError("INTERNAL", "Couldn't start the chat. Try again.");
  } else if (conv.state === "REQUEST") {
    if (conv.initiatorId === viewerId) {
      const [{ n }] = await db
        .select({ n: count() })
        .from(schema.messages)
        .where(and(eq(schema.messages.conversationId, conv.id), eq(schema.messages.senderId, viewerId)));
      if (n >= 1) throw forbidden(`You can send more messages once ${other.firstName} accepts your request.`);
    } else {
      // Replying to a request accepts it.
      await acceptConversation(conv.id, other.id, viewerId);
    }
  }

  return conv;
}

async function insertMessage(
  conversationId: string,
  senderId: string,
  content: { body?: string; photoKey?: string; photoWidth?: number; photoHeight?: number },
) {
  const now = new Date();
  const [message] = await db
    .insert(schema.messages)
    .values({ conversationId, senderId, ...content, createdAt: now })
    .returning();
  await Promise.all([
    db.update(schema.conversations).set({ lastMessageAt: now }).where(eq(schema.conversations.id, conversationId)),
    db
      .update(schema.conversationMembers)
      .set({ lastReadAt: now })
      .where(and(eq(schema.conversationMembers.conversationId, conversationId), eq(schema.conversationMembers.userId, senderId))),
  ]);
  return toMessage(message);
}

/** A message photo's storage key, if the viewer is one of the two people in the chat. */
export async function authorizeMessagePhoto(viewerId: string, messageId: string) {
  const [row] = await db
    .select({ key: schema.messages.photoKey, deletedAt: schema.messages.deletedAt })
    .from(schema.messages)
    .innerJoin(schema.conversationMembers, eq(schema.conversationMembers.conversationId, schema.messages.conversationId))
    .where(and(eq(schema.messages.id, messageId), eq(schema.conversationMembers.userId, viewerId)));
  if (!row?.key || row.deletedAt) throw notFound("Photo not found.");
  return row.key;
}

export const messagePhotoObjects = (key: string) => [`${key}/full.webp`, `${key}/thumb.webp`];

async function acceptConversation(conversationId: string, requesterId: string, viewerId: string) {
  await db.update(schema.conversations).set({ state: "ACTIVE" }).where(eq(schema.conversations.id, conversationId));
  await deleteRequestNotifications(requesterId, viewerId);
}

async function deleteRequestNotifications(actorId: string, userId: string) {
  await db
    .delete(schema.notifications)
    .where(
      and(
        eq(schema.notifications.userId, userId),
        eq(schema.notifications.actorUserId, actorId),
        inArray(schema.notifications.type, ["MESSAGE_REQUEST"]),
      ),
    );
}

/** Accept a message request: the chat moves to the Inbox. */
export async function acceptRequest(viewerId: string, username: string) {
  const other = await requireUserByUsername(username);
  const conv = await findConversation(viewerId, other.id);
  if (!conv || conv.state !== "REQUEST" || conv.initiatorId === viewerId) throw notFound("Request not found.");
  await acceptConversation(conv.id, other.id, viewerId);
}

/** "Delete chat": hides everything so far for the viewer only. */
export async function deleteChat(viewerId: string, username: string) {
  const other = await requireUserByUsername(username);
  const conv = await findConversation(viewerId, other.id);
  if (!conv) return;
  await clearFor(conv.id, viewerId);
  if (conv.state === "REQUEST" && conv.initiatorId !== viewerId) await deleteRequestNotifications(other.id, viewerId);
}

async function clearFor(conversationId: string, userId: string) {
  await db
    .update(schema.conversationMembers)
    .set({ clearedAt: new Date() })
    .where(and(eq(schema.conversationMembers.conversationId, conversationId), eq(schema.conversationMembers.userId, userId)));
}

/** "Unsend": removes one of the viewer's own messages for both people. */
export async function unsendMessage(viewerId: string, messageId: string) {
  const old = await db.query.messages.findFirst({
    where: and(eq(schema.messages.id, messageId), eq(schema.messages.senderId, viewerId)),
  });
  if (!old) throw notFound("Message not found.");
  await db.update(schema.messages).set({ body: "", deletedAt: new Date() }).where(eq(schema.messages.id, messageId));
  if (!old.photoKey || old.deletedAt) return;
  // A reported photo is kept for review; otherwise it's deleted for good.
  const reported = await db.query.messageReports.findFirst({ columns: { id: true }, where: eq(schema.messageReports.messageId, messageId) });
  if (!reported) await deleteObjects(messagePhotoObjects(old.photoKey)).catch((e) => console.error("[storage] delete failed", e));
}

// ─── Block & report ──────────────────────────────────────────────────────────

/** Block: no messages either way, follows removed both ways, the viewer's copy of the chat cleared. */
export async function block(viewerId: string, username: string) {
  const other = await requireUserByUsername(username);
  if (other.id === viewerId) throw badRequest("You can't block yourself.");
  await db.insert(schema.blocks).values({ blockerId: viewerId, blockedId: other.id }).onConflictDoNothing();
  await db
    .delete(schema.follows)
    .where(
      or(
        and(eq(schema.follows.followerId, viewerId), eq(schema.follows.followingId, other.id)),
        and(eq(schema.follows.followerId, other.id), eq(schema.follows.followingId, viewerId)),
      ),
    );
  const conv = await findConversation(viewerId, other.id);
  if (conv) await clearFor(conv.id, viewerId);
  await deleteRequestNotifications(other.id, viewerId);
}

export async function unblock(viewerId: string, username: string) {
  const other = await requireUserByUsername(username);
  await db.delete(schema.blocks).where(and(eq(schema.blocks.blockerId, viewerId), eq(schema.blocks.blockedId, other.id)));
}

export async function listBlocked(viewerId: string): Promise<UserSummary[]> {
  const rows = await db
    .select({ u: schema.users })
    .from(schema.blocks)
    .innerJoin(schema.users, eq(schema.users.id, schema.blocks.blockedId))
    .where(eq(schema.blocks.blockerId, viewerId))
    .orderBy(desc(schema.blocks.createdAt));
  return rows.map((r) => toUserSummary(r.u));
}

/** Keeps a copy of the reported message, so unsending it later can't hide abuse. */
export async function report(viewerId: string, username: string, input: z.infer<typeof reportSchema>) {
  const other = await requireUserByUsername(username);
  if (other.id === viewerId) throw badRequest("You can't report yourself.");
  const conv = await findConversation(viewerId, other.id);
  const message =
    input.messageId && conv
      ? await db.query.messages.findFirst({
          where: and(
            eq(schema.messages.id, input.messageId),
            eq(schema.messages.conversationId, conv.id),
            eq(schema.messages.senderId, other.id),
          ),
        })
      : undefined;
  await db.insert(schema.messageReports).values({
    reporterId: viewerId,
    reportedUserId: other.id,
    conversationId: conv?.id,
    messageId: message?.id,
    // Photos: keep the storage key so the image survives an unsend.
    messageBodyCopy: message ? [message.body, message.photoKey && `[photo ${message.photoKey}]`].filter(Boolean).join(" ") : undefined,
    reason: input.reason,
    details: input.details,
  });
}
