import { create } from "zustand";
import { persist } from "zustand/middleware";

interface State {
  sessionKeys: Record<
    string,
    {
      userId: string;
      peerId: string;
      key: string;
      sessionId: string;
    }
  >;
  setSessionKeys: (
    sessionKeys: Record<
      string,
      {
        userId: string;
        peerId: string;
        key: string;
        chatId: string;
        sessionId: string;
      }
    >
  ) => void;
  addSessionKey: (sessionKey: {
    userId: string;
    peerId: string;
    key: string;
    chatId: string;
    sessionId: string;
  }) => void;
}

export const useSessionKeysStore = create<State>()(
  persist(
    set => ({
      sessionKeys: {},
      setSessionKeys: sessionKeys => set({ sessionKeys }),
      addSessionKey: sessionKey => {
        set(state => ({
          sessionKeys: {
            ...state.sessionKeys,
            [sessionKey.chatId]: {
              userId: sessionKey.userId,
              peerId: sessionKey.peerId,
              key: sessionKey.key,
              sessionId: sessionKey.sessionId
            }
          }
        }));
      }
    }),
    {
      name: "session-keys"
    }
  )
);
