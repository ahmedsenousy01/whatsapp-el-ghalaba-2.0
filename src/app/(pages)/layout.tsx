"use client";

import { useState } from "react";

import { signOut, useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";

import { formatDistanceToNow } from "date-fns";
import { Loader2, LogOut, MoreVertical } from "lucide-react";

import { useSessionKeysStore } from "@/app/_stores/session-keys.store";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";
import { CryptoService } from "@/server/services/crypto";
import { api } from "@/trpc/react";

export default function PagesLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const { data: authSession } = useSession();
  const { sessionKeys } = useSessionKeysStore();

  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 500);

  const { data: users, isLoading: isLoadingUsers } =
    api.user.searchByEmail.useQuery(
      {
        email: debouncedQuery
      },
      {
        enabled: !!debouncedQuery
      }
    );

  const { data: chats, isLoading: isLoadingChats } = api.chat.getChats.useQuery(
    undefined,
    {
      staleTime: 1000 * 60
    }
  );

  const isLoading = isLoadingUsers || isLoadingChats;

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
        </div>
      );
    }

    if (debouncedQuery && users?.length) {
      return users.map(user => (
        <Link
          key={user.id}
          className="flex items-center space-x-3 rounded-lg p-2 hover:bg-gray-100"
          href={`/user/${user.id}`}
        >
          <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-full bg-gray-300">
            {user?.image && (
              <Image
                src={user.image}
                alt={user.name ?? "User image"}
                width={40}
                height={40}
              />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-900">
              {user.name}
            </p>
            <p className="truncate text-sm text-gray-500">{user.email}</p>
          </div>
        </Link>
      ));
    }

    if (chats?.length) {
      return chats.map(chat => {
        const otherUser =
          chat.userId === authSession?.user?.id ? chat.peer : chat.user;

        if (!otherUser) return null;

        // Get the session key for this chat
        const chatSession = sessionKeys[chat.id];
        let lastMessageContent = chat.lastMessage;

        // Try to decrypt the last message if we have a session key
        if (chatSession?.key && lastMessageContent) {
          try {
            const { data, error } = CryptoService.decryptAES(
              lastMessageContent,
              chatSession.key
            );
            if (error) {
              console.error("Failed to decrypt last message:", error);
              lastMessageContent = "Message unavailable";
            } else {
              lastMessageContent = data;
            }
          } catch (error) {
            console.error("Failed to decrypt last message:", error);
            lastMessageContent = "Message unavailable";
          }
        }

        return (
          <Link
            key={chat.id}
            className="flex items-center space-x-3 rounded-lg p-2 hover:bg-gray-100"
            href={`/chat/${chat.id}`}
          >
            <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-full bg-gray-300">
              {otherUser.image && (
                <Image
                  src={otherUser.image}
                  alt={otherUser.name ?? "User image"}
                  width={40}
                  height={40}
                />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <p className="truncate text-sm font-medium text-gray-900">
                  {otherUser.name}
                </p>
              </div>
              {lastMessageContent && (
                <div className="flex items-center justify-between">
                  <p className="truncate text-sm text-gray-500">
                    {lastMessageContent}
                  </p>
                  {chat.lastMessageAt && (
                    <p className="ml-2 shrink-0 text-xs text-gray-400">
                      {formatDistanceToNow(new Date(chat.lastMessageAt), {
                        addSuffix: true
                      })}
                    </p>
                  )}
                </div>
              )}
            </div>
          </Link>
        );
      });
    }

    return (
      <p className="text-center text-gray-500">
        {debouncedQuery ? "No users found" : "No chats yet"}
      </p>
    );
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <div className="flex w-full max-w-md flex-col border-r bg-white p-4 sm:w-80">
        <Link
          href="/"
          className="mb-6 cursor-pointer text-2xl font-bold text-gray-800"
        >
          Whatsapp El Ghalaba
        </Link>

        {/* Search bar */}
        <div className="mb-4 flex items-center space-x-2">
          <Input
            value={query}
            type="text"
            placeholder="Search for a user"
            className="flex-grow"
            onChange={e => setQuery(e.target.value)}
          />
        </div>

        {/* User list */}
        <div
          className="flex-1 space-y-2 overflow-y-auto"
          style={{ maxHeight: "calc(100vh - 250px)" }}
        >
          {renderContent()}
        </div>

        {/* Current user profile */}
        <div className="mt-auto border-t pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-full bg-gray-300">
                {authSession?.user?.image && (
                  <Image
                    src={authSession.user.image}
                    alt={authSession.user.name ?? "Your profile"}
                    width={40}
                    height={40}
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">
                  {authSession?.user?.name}
                </p>
                <p className="truncate text-sm text-gray-500">
                  {authSession?.user?.email}
                </p>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-8 w-8 p-0"
                >
                  <span className="sr-only">Open menu</span>
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => {
                    void signOut({
                      callbackUrl: "/"
                    });
                  }}
                  className="cursor-pointer text-red-600"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden bg-gray-50">
        {children}
      </div>
    </div>
  );
}
