import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

export const sessionRouter = createTRPCRouter({
  getSessionById: protectedProcedure
    .input(
      z.object({
        sessionId: z.string()
      })
    )
    .query(({ ctx, input: { sessionId } }) => {
      const session = ctx.db.query.sessions.findFirst({
        where: (model, { eq }) => eq(model.id, sessionId)
      });

      return session ?? null;
    }),
  getSessionsByUserId: protectedProcedure
    .input(
      z.object({
        userId: z.string()
      })
    )
    .query(({ ctx, input: { userId } }) => {
      const sessions = ctx.db.query.sessions.findMany({
        where: (model, { eq, or }) =>
          or(eq(model.userId, userId), eq(model.peerId, userId))
      });

      return sessions;
    }),
  getActiveSessionByPeerId: protectedProcedure
    .input(
      z.object({
        peerId: z.string()
      })
    )
    .query(({ ctx, input: { peerId } }) => {
      const session = ctx.db.query.sessions.findFirst({
        where: (model, { eq, and, gt }) =>
          and(
            eq(model.userId, ctx.session.user.id),
            eq(model.peerId, peerId),
            gt(model.expiresAt, Date.now().toString())
          )
      });

      return session ?? null;
    })
});
