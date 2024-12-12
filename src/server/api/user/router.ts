import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { passwordSchema } from "@/schemas/auth";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure
} from "@/server/api/trpc";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";

export const userRouter = createTRPCRouter({
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input: { id } }) => {
      if (ctx.session.user.id !== id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authorized"
        });
      }

      return await db.query.users.findFirst({
        where: (model, { eq }) => eq(model.id, id)
      });
    }),
  getByEmail: protectedProcedure
    .input(z.object({ email: z.string() }))
    .query(async ({ ctx, input: { email } }) => {
      const [user] = await ctx.db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      return user ?? null;
    }),
  create: publicProcedure
    .input(
      z.object({
        firstName: z.string(),
        lastName: z.string(),
        email: z.string(),
        password: passwordSchema
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const existingUser = await ctx.db
          .select()
          .from(users)
          .where(eq(users.email, input.email))
          .limit(1);

        if (existingUser.length > 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Email already exists"
          });
        }

        const newUser = {
          id: crypto.randomUUID(),
          name: `${input.firstName} ${input.lastName}`,
          email: input.email,
          password: await bcrypt.hash(input.password, 10)
        };

        // Insert new user into the database
        await ctx.db.insert(users).values(newUser).execute();
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        } else {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "An unexpected error occurred"
          });
        }
      }
    }),
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        email: z.string().optional(),
        password: passwordSchema.optional(),
        publicKey: z.string().optional(),
        keyPairHash: z.string().optional()
      })
    )
    .mutation(
      async ({
        ctx,
        input: { id, name, email, password, publicKey, keyPairHash }
      }) => {
        if (ctx.session.user.id !== id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "User not authorized"
          });
        }

        try {
          if (name)
            await ctx.db
              .update(users)
              .set({ name })
              .where(eq(users.id, id))
              .execute();
          if (email)
            await ctx.db
              .update(users)
              .set({ email })
              .where(eq(users.id, id))
              .execute();
          if (password)
            await ctx.db
              .update(users)
              .set({ password })
              .where(eq(users.id, id))
              .execute();
          if (publicKey)
            await ctx.db
              .update(users)
              .set({ publicKey })
              .where(eq(users.id, id))
              .execute();
          if (keyPairHash)
            await ctx.db
              .update(users)
              .set({ keyPairHash })
              .where(eq(users.id, id))
              .execute();
        } catch (error) {
          if (error instanceof TRPCError) {
            throw error;
          } else {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "An unexpected error occurred"
            });
          }
        }
      }
    )
});
