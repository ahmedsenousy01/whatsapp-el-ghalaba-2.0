import { type AdapterAccount } from "next-auth/adapters";

import {
  type InferInsertModel,
  type InferSelectModel,
  relations,
  sql
} from "drizzle-orm";
import {
  index,
  integer,
  pgEnum,
  pgTableCreator,
  primaryKey,
  text,
  timestamp,
  varchar
} from "drizzle-orm/pg-core";

export const createTable = pgTableCreator(
  name => `whatsapp-el-ghalaba_${name}`
);
export const users = createTable(
  "user",
  {
    id: varchar("id", { length: 255 })
      .notNull()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: varchar("name", { length: 255 }),
    email: varchar("email", { length: 255 }).notNull(),
    password: varchar("password", { length: 255 }),
    image: varchar("image", { length: 255 }),
    emailVerified: timestamp("email_verified", {
      mode: "date",
      withTimezone: true
    }).default(sql`CURRENT_TIMESTAMP`),
    publicKey: varchar("public_key", { length: 2048 }),
    keyPairHash: varchar("key_pair_hash", { length: 255 }),
    createdAt: timestamp("created_at", {
      mode: "date",
      withTimezone: true
    }).$defaultFn(() => sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at", {
      mode: "date",
      withTimezone: true
    })
  },
  user => ({
    emailIndex: index("user_email_idx").on(user.email)
  })
);

export type SelectUser = InferSelectModel<typeof users>;
export type InsertUser = InferInsertModel<typeof users>;

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sentMessages: many(messages, { relationName: "sender" }),
  receivedMessages: many(messages, { relationName: "receiver" })
}));

export const accounts = createTable(
  "account",
  {
    userId: varchar("user_id", { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 255 })
      .$type<AdapterAccount["type"]>()
      .notNull(),
    provider: varchar("provider", { length: 255 }).notNull(),
    providerAccountId: varchar("provider_account_id", {
      length: 255
    }).notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: varchar("token_type", { length: 255 }),
    scope: varchar("scope", { length: 255 }),
    id_token: text("id_token"),
    session_state: varchar("session_state", { length: 255 })
  },
  account => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId]
    }),
    userIdIdx: index("account_user_id_idx").on(account.userId)
  })
);

export type SelectAccount = InferSelectModel<typeof accounts>;
export type InsertAccount = InferInsertModel<typeof accounts>;

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] })
}));

export const messageStatusEnum = pgEnum("message_status", [
  "sent",
  "delivered",
  "read"
]);

export const messages = createTable(
  "message",
  {
    id: varchar("id", { length: 255 })
      .notNull()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    senderId: varchar("sender_id", { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    receiverId: varchar("receiver_id", { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sessionId: varchar("session_id", { length: 255 })
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    chatId: varchar("chat_id", { length: 255 })
      .notNull()
      .references(() => chats.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", {
      mode: "date",
      withTimezone: true
    }).$defaultFn(() => sql`CURRENT_TIMESTAMP`),
    status: messageStatusEnum("status").notNull().default("sent")
  },
  message => ({
    senderIdIndex: index("message_sender_id_index").on(message.senderId),
    receiverIdIndex: index("message_receiver_id_index").on(message.receiverId),
    sessionIdIndex: index("message_session_id_index").on(message.sessionId),
    chatIdIndex: index("message_chat_id_index").on(message.chatId)
  })
);

export type SelectMessage = InferSelectModel<typeof messages>;
export type InsertMessage = InferInsertModel<typeof messages>;

export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
    relationName: "sender"
  }),
  receiver: one(users, {
    fields: [messages.receiverId],
    references: [users.id],
    relationName: "receiver"
  }),
  session: one(sessions, {
    fields: [messages.sessionId],
    references: [sessions.id],
    relationName: "message_session_relationship"
  }),
  chat: one(chats, {
    fields: [messages.chatId],
    references: [chats.id],
    relationName: "message_chat_relationship"
  })
}));

export const sessions = createTable(
  "session",
  {
    id: varchar("id", { length: 255 })
      .notNull()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: varchar("user_id", { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    peerId: varchar("peer_id", { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    chatId: varchar("chat_id", { length: 255 })
      .notNull()
      .references(() => chats.id, { onDelete: "cascade" }),
    senderEncryptedSessionKey: varchar("sender_encrypted_session_key", {
      length: 2048
    }).notNull(),
    receiverEncryptedSessionKey: varchar("receiver_encrypted_session_key", {
      length: 2048
    }).notNull(),
    expiresAt: varchar("expires_at", { length: 255 })
      .notNull()
      .$defaultFn(() => (Date.now() + 1000 * 60 * 60 * 24 * 7).toString())
  },
  session => ({
    userIdIndex: index("session_user_id_index").on(session.userId),
    peerIdIndex: index("session_peer_id_index").on(session.peerId),
    chatIdIndex: index("session_chat_id_index").on(session.chatId)
  })
);

export type SelectSession = InferSelectModel<typeof sessions>;
export type InsertSession = InferInsertModel<typeof sessions>;

export const sessionsRelations = relations(sessions, ({ one, many }) => ({
  user: one(users, {
    relationName: "session_user_relationship",
    fields: [sessions.userId],
    references: [users.id]
  }),
  peer: one(users, {
    relationName: "session_peer_relationship",
    fields: [sessions.peerId],
    references: [users.id]
  }),
  chat: one(chats, {
    relationName: "session_chat_relationship",
    fields: [sessions.chatId],
    references: [chats.id]
  }),
  messages: many(messages, {
    relationName: "message_session_relationship"
  })
}));

export const chats = createTable(
  "chat",
  {
    id: varchar("id", { length: 255 })
      .notNull()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: varchar("user_id", { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    peerId: varchar("peer_id", { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    lastMessage: text("last_message"),
    lastMessageAt: timestamp("last_message_at", {
      mode: "date",
      withTimezone: true
    }).$onUpdate(() => sql`CURRENT_TIMESTAMP`),
    createdAt: timestamp("created_at", {
      mode: "date",
      withTimezone: true
    }).$defaultFn(() => sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at", {
      mode: "date",
      withTimezone: true
    }).$onUpdate(() => sql`CURRENT_TIMESTAMP`)
  },
  chat => ({
    userIdIndex: index("chat_user_id_index").on(chat.userId),
    peerIdIndex: index("chat_peer_id_index").on(chat.peerId)
  })
);

export type SelectChat = InferSelectModel<typeof chats>;
export type SelectChatWithMessagesWithUser = SelectChat & {
  messages: SelectMessage[];
  user: SelectUser;
};
export type InsertChat = InferInsertModel<typeof chats>;

export const chatsRelations = relations(chats, ({ one, many }) => ({
  user: one(users, {
    fields: [chats.userId],
    references: [users.id],
    relationName: "chat_user_relationship"
  }),
  peer: one(users, {
    fields: [chats.peerId],
    references: [users.id],
    relationName: "chat_peer_relationship"
  }),
  sessions: many(sessions, {
    relationName: "session_chat_relationship"
  }),
  messages: many(messages, {
    relationName: "message_chat_relationship"
  })
}));

export const chatLatestMessage = createTable(
  "chat_latest_message",
  {
    chatId: varchar("chat_id", { length: 255 })
      .notNull()
      .references(() => chats.id, { onDelete: "cascade" }),
    messageId: varchar("message_id", { length: 255 })
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" })
  },
  chatLatestMessage => ({
    chatIdIndex: index("chat_latest_message_chat_id_index").on(
      chatLatestMessage.chatId
    ),
    messageIdIndex: index("chat_latest_message_message_id_index").on(
      chatLatestMessage.messageId
    )
  })
);

export type SelectChatLatestMessage = InferSelectModel<
  typeof chatLatestMessage
>;
export type InsertChatLatestMessage = InferInsertModel<
  typeof chatLatestMessage
>;

export const chatLatestMessageRelations = relations(
  chatLatestMessage,
  ({ one }) => ({
    chat: one(chats, {
      fields: [chatLatestMessage.chatId],
      references: [chats.id],
      relationName: "chat_latest_message_chat_relationship"
    }),
    message: one(messages, {
      fields: [chatLatestMessage.messageId],
      references: [messages.id],
      relationName: "chat_latest_message_message_relationship"
    })
  })
);
