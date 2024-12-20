import ChatPageContent from "@/app/(pages)/chat/[chatId]/chat-content";
import { api, HydrateClient } from "@/trpc/server";

export default async function ChatPage({
  params
}: {
  params: Promise<{ chatId: string }>;
}) {
  const awaitedParams = await params;
  void api.chat.getChatById.prefetch({ chatId: awaitedParams.chatId });

  return (
    <HydrateClient>
      <ChatPageContent params={awaitedParams} />
    </HydrateClient>
  );
}
