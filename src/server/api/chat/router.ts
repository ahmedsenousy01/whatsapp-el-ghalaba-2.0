import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { chats } from "@/server/db/schema";

export const chatRouter = createTRPCRouter({
  getChats: protectedProcedure.query(async ({ ctx }) => {
    const chats = await ctx.db.query.chats.findMany({
      where: (model, { eq, or }) =>
        or(
          eq(model.userId, ctx.session.user.id),
          eq(model.peerId, ctx.session.user.id)
        ),
      orderBy: (model, { desc }) => desc(model.updatedAt),
      with: {
        user: true,
        peer: true
      }
    });

    const actualChats = chats.filter(chat => chat.lastMessage !== null);

    return actualChats;
  }),
  getChatById: protectedProcedure
    .input(z.object({ chatId: z.string() }))
    .query(async ({ ctx, input: { chatId } }) => {
      const chat = await ctx.db.query.chats.findFirst({
        where: (model, { eq }) => eq(model.id, chatId),
        with: {
          user: true,
          peer: true,
          messages: {
            orderBy: (model, { desc }) => desc(model.createdAt)
          }
        }
      });

      return chat ?? null;
    }),
  getChatByUserAndPeerId: protectedProcedure
    .input(z.object({ userId: z.string(), peerId: z.string() }))
    .query(async ({ ctx, input }) => {
      const chats = await ctx.db.query.chats.findMany({
        where: (model, { and, or, eq }) =>
          and(
            or(eq(model.userId, input.userId), eq(model.peerId, input.userId)),
            or(eq(model.userId, input.peerId), eq(model.peerId, input.peerId))
          ),
        orderBy: (model, { desc }) => desc(model.createdAt)
      });

      return chats;
    }),
  create: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        peerId: z.string()
      })
    )
    .mutation(async ({ ctx, input: { userId, peerId } }) => {
      try {
        await ctx.db
          .insert(chats)
          .values({
            userId,
            peerId
          })
          .execute();
        return await ctx.db.query.chats.findFirst({
          where: (model, { eq, and }) =>
            and(eq(model.userId, userId), eq(model.peerId, peerId))
        });
      } catch (error) {
        console.error(error);
        return null;
      }
    })
});
