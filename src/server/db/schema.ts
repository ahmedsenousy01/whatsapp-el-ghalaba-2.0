import { type AdapterAccount } from "next-auth/adapters";

import { relations, sql } from "drizzle-orm";
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
      .references(() => users.id),
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
      .references(() => users.id),
    receiverId: varchar("receiver_id", { length: 255 })
      .notNull()
      .references(() => users.id),
    sessionKey: varchar("session_key", { length: 255 }).notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", {
      mode: "date",
      withTimezone: true
    }).$defaultFn(() => sql`CURRENT_TIMESTAMP`),
    status: messageStatusEnum("status").notNull().default("sent")
  },
  message => ({
    senderIdIndex: index("message_sender_id_index").on(message.senderId),
    receiverIdIndex: index("message_receiver_id_index").on(message.receiverId)
  })
);

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
      .references(() => users.id),
    peerId: varchar("peer_id", { length: 255 })
      .notNull()
      .references(() => users.id),
    sessionKey: varchar("session_key", { length: 255 }).notNull(),
    expiresAt: timestamp("expires_at", {
      mode: "date",
      withTimezone: true
    }).$defaultFn(() => sql`CURRENT_TIMESTAMP`)
  },
  session => ({
    userIdIndex: index("session_user_id_index").on(session.userId),
    peerIdIndex: index("session_peer_id_index").on(session.peerId)
  })
);

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    relationName: "session_user_relationship",
    fields: [sessions.userId],
    references: [users.id]
  }),
  peer: one(users, {
    relationName: "session_peer_relationship",
    fields: [sessions.peerId],
    references: [users.id]
  })
}));
