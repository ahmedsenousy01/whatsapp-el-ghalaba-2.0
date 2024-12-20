import { create } from "zustand";
import { persist } from "zustand/middleware";

interface State {
  privateKey?: string;
  publicKey?: string;
  setPrivateKey: (privateKey: string) => void;
  setPublicKey: (publicKey: string) => void;
}

export const useRSAKeyPairStore = create<State>()(
  persist(
    set => ({
      privateKey: undefined,
      publicKey: undefined,
      setPrivateKey: privateKey => set({ privateKey }),
      setPublicKey: publicKey => set({ publicKey })
    }),
    {
      name: "rsa-key-pair"
    }
  )
);
