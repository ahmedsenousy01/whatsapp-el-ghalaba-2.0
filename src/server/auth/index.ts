import { cache } from "react";

import NextAuth from "next-auth";
import { useSession } from "next-auth/react";

import { authConfig } from "./config";

const { auth: uncachedAuth, handlers, signIn, signOut } = NextAuth(authConfig);

const auth = cache(uncachedAuth);

export { auth, handlers, signIn, signOut };

export const getCurrentUser = async () => {
  const session = await auth();
  return session?.user;
};

export function useCurrentUser() {
  const { data: session } = useSession();
  return session?.user;
}
