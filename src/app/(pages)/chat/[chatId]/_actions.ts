"use server";

import { eq } from "drizzle-orm";

import { getCurrentUser } from "@/server/auth";
import { db } from "@/server/db";
import { chats, messages, sessions } from "@/server/db/schema";
import { CryptoService } from "@/server/services/crypto";

export async function getChatById({ chatId }: { chatId: string }) {
  const chat = await db.query.chats.findFirst({
    where: (model, { eq }) => eq(model.id, chatId),
    with: {
      user: true,
      messages: {
        orderBy: (model, { asc }) => asc(model.createdAt)
      }
    }
  });

  return chat ?? null;
}

export async function getChatSession({ chatId }: { chatId: string }) {
  const session = await db.query.sessions.findFirst({
    where: (model, { eq, and, gt }) =>
      and(eq(model.chatId, chatId), gt(model.expiresAt, Date.now().toString())),
    orderBy: (model, { desc }) => desc(model.expiresAt)
  });

  return session ?? null;
}

export async function createChatSession({
  chatId,
  peerId,
  key
}: {
  chatId: string;
  peerId: string;
  key: string;
}) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("User not found");
  }
  const dbUser = await db.query.users.findFirst({
    where: (model, { eq }) => eq(model.id, user.id)
  });

  const chat = await db.query.chats.findFirst({
    where: (model, { eq }) => eq(model.id, chatId)
  });
  if (!chat) {
    return { error: "Chat not found", data: null };
  }

  const peer = await db.query.users.findFirst({
    where: (model, { eq }) => eq(model.id, peerId)
  });
  if (!peer) {
    return { error: "Peer not found", data: null };
  }

  let senderEncryptedSessionKey;
  let receiverEncryptedSessionKey;

  try {
    senderEncryptedSessionKey = CryptoService.encryptRSA(
      key,
      dbUser!.publicKey!
    );
    receiverEncryptedSessionKey = CryptoService.encryptRSA(
      key,
      peer.publicKey!
    );

    if (!senderEncryptedSessionKey.data || !receiverEncryptedSessionKey.data) {
      return { error: "Encryption failed: null result", data: null };
    }

    await db.insert(sessions).values({
      userId: user.id,
      peerId,
      chatId,
      senderEncryptedSessionKey: senderEncryptedSessionKey.data,
      receiverEncryptedSessionKey: receiverEncryptedSessionKey.data
    });
  } catch (error) {
    console.error(error);
    return {
      error: "[createChatSession], An unexpected error occurred",
      data: null
    };
  }

  const session = await db.query.sessions.findFirst({
    where: (model, { eq, gt, and }) =>
      and(eq(model.chatId, chatId), gt(model.expiresAt, Date.now().toString()))
  });

  return { error: null, data: session };
}

export async function createMessage({
  peerId,
  chatId,
  sessionId,
  encryptedMessageContent
}: {
  peerId: string;
  chatId: string;
  sessionId: string;
  encryptedMessageContent: string;
}) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("User not found");
  }

  // check if the session exists
  const session = await db.query.sessions.findFirst({
    where: (model, { eq }) => eq(model.id, sessionId)
  });
  if (!session) {
    throw new Error("Session not found");
  }

  // check if the chat exists
  const chat = await db.query.chats.findFirst({
    where: (model, { eq }) => eq(model.id, chatId)
  });
  if (!chat) {
    throw new Error("Chat not found");
  }

  try {
    // Create the message
    await db.insert(messages).values({
      senderId: user.id,
      receiverId: peerId,
      chatId,
      sessionId,
      content: encryptedMessageContent
    });

    // Update the chat's last message
    await db
      .update(chats)
      .set({
        lastMessage: encryptedMessageContent,
        lastMessageAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(chats.id, chatId))
      .execute();
  } catch (error) {
    console.error(error);
    throw new Error("[createMessage], An unexpected error occurred");
  }
}

export async function deleteChat({ chatId }: { chatId: string }) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("User not found");
  }

  try {
    // Delete all messages in the chat
    await db.delete(messages).where(eq(messages.chatId, chatId));

    // Delete all sessions in the chat
    await db.delete(sessions).where(eq(sessions.chatId, chatId));

    // Delete the chat itself
    await db.delete(chats).where(eq(chats.id, chatId));

    return { error: null };
  } catch (error) {
    console.error(error);
    return { error: "Failed to delete chat" };
  }
}
