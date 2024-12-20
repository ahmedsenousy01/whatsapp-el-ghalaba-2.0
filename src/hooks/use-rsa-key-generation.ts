import { useEffect } from "react";

import { useSession } from "next-auth/react";

import { useRSAKeyPairStore } from "@/app/_stores/rsa-key-pair.store";
import { CryptoService } from "@/server/services/crypto";
import { api } from "@/trpc/react";

export function useRSAKeyGeneration() {
  const session = useSession();
  const user = session.data?.user;
  const { data: keyPairHash } = api.user.getKeyPairHash.useQuery(
    {
      userId: user?.id ?? ""
    },
    {
      // Prevent unnecessary refetches
      enabled: !!user?.id,
      staleTime: Infinity
    }
  );

  const { mutateAsync: updateUserKey } = api.user.update.useMutation();
  const { setPrivateKey } = useRSAKeyPairStore();

  useEffect(() => {
    if (!user?.id) return; // Early exit if no user

    async function main() {
      try {
        const storedPrivateKeyData = localStorage.getItem("privateKey");
        let localUserId = null;
        let localHash = null;
        let localKey = null;

        if (storedPrivateKeyData) {
          const parsedData = JSON.parse(storedPrivateKeyData) as {
            userId: string;
            hash: string;
            key: string;
          };
          localUserId = parsedData.userId;
          localHash = parsedData.hash;
          localKey = parsedData.key;

          // If key exists for current user, set it
          if (localUserId === user?.id) {
            setPrivateKey(localKey);
          }
        }

        // this is an edge case where the key pair hash is undefined on first render
        if (localHash && keyPairHash === undefined) return;

        // Additional check to prevent unnecessary key generation
        if (localHash && localHash === keyPairHash) return;

        // Generate new key pair conditions
        const shouldGenerateNewKeys =
          !storedPrivateKeyData ||
          localUserId !== user?.id ||
          localHash !== keyPairHash;

        if (shouldGenerateNewKeys) {
          const { publicKey, privateKey } = CryptoService.generateRSAKeyPair();
          const newHash = CryptoService.generateHash();

          // Store new private key
          localStorage.setItem(
            "privateKey",
            JSON.stringify({
              key: privateKey,
              hash: newHash,
              userId: user?.id
            })
          );

          // Update user key on server
          await updateUserKey({
            id: user!.id,
            publicKey,
            keyPairHash: newHash
          });

          // Update local store
          setPrivateKey(privateKey);
        }
      } catch (error) {
        console.error("Key generation error:", error);
      }
    }

    void main();
  }, [keyPairHash, updateUserKey, user?.id, setPrivateKey, user]);
}
