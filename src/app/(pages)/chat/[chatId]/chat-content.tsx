"use client";

import { useEffect, useState } from "react";

import { useSession } from "next-auth/react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { formatDistanceToNow } from "date-fns";
import { Loader2, Send } from "lucide-react";

import {
  createChatSession,
  createMessage,
  deleteChat,
  getChatById,
  getChatSession
} from "@/app/(pages)/chat/[chatId]/_actions";
import { useRSAKeyPairStore } from "@/app/_stores/rsa-key-pair.store";
import { useSessionKeysStore } from "@/app/_stores/session-keys.store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import type { SelectChatWithMessagesWithUser } from "@/server/db/schema";
import { CryptoService } from "@/server/services/crypto";
import { api } from "@/trpc/react";

export default function ChatPageContent({
  params
}: {
  params: { chatId: string };
}) {
  const { data: authSession } = useSession();
  const { sessionKeys, addSessionKey } = useSessionKeysStore(); // localStorage
  const { privateKey } = useRSAKeyPairStore(); // localStorage
  const router = useRouter();

  const chatSession = sessionKeys[params.chatId];
  const [chat, setChat] = useState<SelectChatWithMessagesWithUser | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [refetchVar, setRefetchVar] = useState(false);
  const [newMessage, setNewMessage] = useState("");

  const { data: currentUser, isLoading: isLoadingCurrentUser } =
    api.user.getById.useQuery(
      {
        id:
          (chat?.userId === authSession?.user?.id
            ? chat?.peerId
            : chat?.userId) ?? ""
      },
      {
        enabled: !!chat?.peerId
      }
    );
  const utils = api.useUtils();

  // Handle hydration
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Set up polling for new messages
  useEffect(() => {
    const interval = setInterval(() => {
      setRefetchVar(prev => !prev);
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isHydrated || !authSession?.user || !privateKey) return;

    async function main() {
      try {
        const dbChat = await getChatById({ chatId: params.chatId });

        if (!dbChat) {
          console.error("Chat not found");
          toast({
            description: "Chat not found",
            variant: "destructive"
          });
          void utils.chat.getChats.invalidate();
          router.push("/");
          return;
        }

        if (!authSession?.user?.id || !privateKey) {
          console.error("User not authenticated or missing keys");
          toast({
            description: "Please sign in to continue",
            variant: "destructive"
          });
          router.push("/");
          return;
        }

        // Determine if we're the chat creator or the peer
        const isCreator = dbChat.userId === authSession.user.id;
        const ourId = isCreator ? dbChat.userId : dbChat.peerId;
        const peerId = isCreator ? dbChat.peerId : dbChat.userId;

        // If we already have a session key for this chat, try to decrypt messages
        if (sessionKeys[params.chatId]) {
          const key = sessionKeys[params.chatId]!.key;
          const decryptedMessages = [];
          let decryptionFailed = false;

          for (const message of dbChat.messages) {
            const decrypted = CryptoService.decryptAES(message.content, key);
            if (decrypted.error) {
              console.error("Failed to decrypt message:", decrypted.error);
              decryptionFailed = true;
              break;
            }
            decryptedMessages.push({
              ...message,
              content: decrypted.data!
            });
          }

          if (!decryptionFailed) {
            setChat({ ...dbChat, messages: decryptedMessages });
            return;
          }

          // If decryption failed, delete the chat and redirect
          console.error("Decryption failed with current session key");
          const result = await deleteChat({ chatId: params.chatId });
          void utils.chat.getChats.invalidate();
          if (result.error) {
            toast({
              description: "Failed to delete corrupted chat",
              variant: "destructive"
            });
          } else {
            toast({
              description: "Chat was deleted due to decryption errors",
              variant: "destructive"
            });
          }
          router.push("/");
          return;
        }

        // Try to get an existing session from the server
        const existingSession = await getChatSession({
          chatId: params.chatId
        });

        if (existingSession) {
          try {
            // Determine if we're the sender or receiver and get the appropriate encrypted key
            const isOriginalSender =
              existingSession.userId === authSession.user.id;
            const encryptedKey = isOriginalSender
              ? existingSession.senderEncryptedSessionKey
              : existingSession.receiverEncryptedSessionKey;

            // Decrypt the session key using our private key
            const decryptedKeyResult = CryptoService.decryptRSA(
              encryptedKey,
              privateKey
            );
            if (decryptedKeyResult.error) {
              throw new Error(decryptedKeyResult.error);
            }

            const decryptedKey = decryptedKeyResult.data!;

            // Add the session key to our store
            addSessionKey({
              userId: ourId,
              peerId,
              key: decryptedKey,
              chatId: params.chatId,
              sessionId: existingSession.id
            });

            // Try to decrypt all messages with the session key
            const decryptedMessages = [];
            let decryptionFailed = false;

            for (const message of dbChat.messages) {
              const decrypted = CryptoService.decryptAES(
                message.content,
                decryptedKey
              );
              if (decrypted.error) {
                console.error("Failed to decrypt message:", decrypted.error);
                decryptionFailed = true;
                break;
              }
              decryptedMessages.push({
                ...message,
                content: decrypted.data!
              });
            }

            if (!decryptionFailed) {
              setChat({ ...dbChat, messages: decryptedMessages });
              toast({
                description: "Successfully joined existing chat session"
              });
              return;
            }

            // If decryption failed, delete the chat and redirect
            const result = await deleteChat({ chatId: params.chatId });
            void utils.chat.getChats.invalidate();
            if (result.error) {
              toast({
                description: "Failed to delete corrupted chat",
                variant: "destructive"
              });
            } else {
              toast({
                description: "Chat was deleted due to decryption errors",
                variant: "destructive"
              });
            }
            router.push("/");
            return;
          } catch (error) {
            console.error("Failed to decrypt session key:", error);
            // Delete chat and redirect on session key decryption error
            const result = await deleteChat({ chatId: params.chatId });

            void utils.chat.getChats.invalidate();

            if (result.error) {
              toast({
                description: "Failed to delete corrupted chat",
                variant: "destructive"
              });
            } else {
              toast({
                description:
                  "Chat was deleted due to session key decryption error",
                variant: "destructive"
              });
            }
            router.push("/");
            return;
          }
        }

        // If no existing session or decryption failed, create a new one
        const AESKey = CryptoService.generateAESKey({ length: 16 });
        const newSession = await createChatSession({
          chatId: params.chatId,
          peerId,
          key: AESKey
        });

        if (newSession.error) {
          toast({
            description: `Failed to create chat session: ${newSession.error}`,
            variant: "destructive"
          });
          router.push("/");
          return;
        }

        if (newSession.data) {
          // Add the new session key to our store
          addSessionKey({
            userId: ourId,
            peerId,
            key: AESKey,
            chatId: params.chatId,
            sessionId: newSession.data.id
          });

          // Set initial chat state with empty messages since we can't decrypt old ones
          setChat({ ...dbChat, messages: [] });

          toast({
            description:
              "Created new chat session. Previous messages are not accessible."
          });
        }
      } catch (error) {
        console.error("Error in chat initialization:", error);
        // Delete chat and redirect on any unhandled error
        const result = await deleteChat({ chatId: params.chatId });

        void utils.chat.getChats.invalidate();
        if (result.error) {
          toast({
            description: "Failed to delete corrupted chat",
            variant: "destructive"
          });
        } else {
          toast({
            description: "Chat was deleted due to an unexpected error",
            variant: "destructive"
          });
        }
        router.push("/");
      }
    }

    void main();
  }, [
    params.chatId,
    isHydrated,
    sessionKeys,
    addSessionKey,
    refetchVar,
    authSession?.user,
    privateKey,
    authSession,
    router,
    utils.chat.getChats
  ]);

  async function handleSendMessage() {
    if (!newMessage.trim() || !chatSession) return;

    const receiverId = chatSession.peerId;
    const plainSessionKey = chatSession.key;

    if (!receiverId || !plainSessionKey) {
      console.error("Invalid session");
      return;
    }

    try {
      // encrypt the message using the session key
      const encryptedResult = CryptoService.encryptAES(
        newMessage,
        plainSessionKey
      );

      if (encryptedResult.error || !encryptedResult.data) {
        throw new Error(encryptedResult.error ?? "Encryption failed");
      }

      // create a new message on the server
      await createMessage({
        peerId: receiverId,
        chatId: params.chatId,
        sessionId: chatSession.sessionId,
        encryptedMessageContent: encryptedResult.data
      });

      toast({
        description: "Message sent!"
      });
      setNewMessage("");
      void utils.chat.getChats.invalidate();
      setRefetchVar(!refetchVar);
    } catch (error) {
      console.error("Failed to send message:", error);
      toast({
        description: "Failed to send message",
        variant: "destructive"
      });
    }
  }

  if (!chat || !currentUser || isLoadingCurrentUser) {
    return (
      <div className="flex size-full items-center justify-center py-4">
        <Loader2 className="size-10 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <>
      {/* Chat header */}
      <div className="border-b bg-white p-4">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-full bg-gray-300">
            {currentUser?.image && (
              <Image
                src={currentUser.image}
                alt={currentUser.name ?? "User image"}
                width={40}
                height={40}
              />
            )}
          </div>
          <div>
            <p className="font-medium">{currentUser?.name}</p>
            <p className="text-sm text-gray-500">{currentUser?.email}</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {chat?.messages.map((message, index) => (
          <div
            key={index}
            className={`mb-4 flex ${
              message.senderId === authSession?.user?.id
                ? "justify-end"
                : "justify-start"
            }`}
          >
            <div
              className={`rounded-lg p-2 ${
                message.senderId === authSession?.user?.id
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200"
              }`}
            >
              <p>{message.content}</p>
              <p className="mt-1 text-xs text-gray-400">
                {message.createdAt &&
                  formatDistanceToNow(new Date(message.createdAt), {
                    addSuffix: true
                  })}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Message input */}
      <div className="border-t bg-white p-4">
        <div className="flex items-center space-x-2">
          <Input
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            placeholder="Type a message"
            className="flex-grow"
            onKeyDown={e => e.key === "Enter" && handleSendMessage()}
          />
          <Button onClick={handleSendMessage}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </>
  );
}
