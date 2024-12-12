"use client";

import React from "react";

import { useSession } from "next-auth/react";

import { CryptoService } from "@/server/services/crypto";
import { api } from "@/trpc/react";

export function RSAKeyGenerationProvider({
  children
}: {
  children: React.ReactNode;
}) {
  const session = useSession();
  const user = session.data?.user;
  const { data: { keyPairHash } = {} } = api.user.getById.useQuery({
    id: user?.id ?? ""
  });
  const { mutateAsync: updateUserKey } = api.user.update.useMutation();

  React.useEffect(() => {
    async function main() {
      const privateKey = localStorage.getItem("privateKey");

      let userId = null;
      let hash = null;
      if (privateKey) {
        const { userId: userIdFromStorage, hash: hashFromStorage } = JSON.parse(
          privateKey
        ) as {
          userId: string;
          hash: string;
          key: string;
        };
        userId = userIdFromStorage;
        hash = hashFromStorage;
      }

      if (!privateKey || userId !== user?.id || hash !== keyPairHash) {
        const { publicKey, privateKey } = CryptoService.generateRSAKeyPair();
        const hash = CryptoService.generateHash();
        localStorage.setItem(
          "privateKey",
          JSON.stringify({
            key: `${privateKey.n.toString(16)}:${privateKey.d.toString(16)}`,
            hash,
            userId: user!.id
          })
        );
        await updateUserKey({
          id: user!.id,
          publicKey: `${publicKey.n.toString(16)}:${publicKey.e.toString(16)}`,
          keyPairHash: hash
        });
      }
    }

    void main();
  }, [keyPairHash, updateUserKey, user]);

  return <>{children}</>;
}
