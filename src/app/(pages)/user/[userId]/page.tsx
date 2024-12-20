import { redirect } from "next/navigation";

import { toast } from "@/hooks/use-toast";
import { getCurrentUser } from "@/server/auth";
import { api } from "@/trpc/server";

export default async function UserPage({
  params
}: {
  params: Promise<{ userId: string }>;
}) {
  const userId = (await params).userId;
  const user = await getCurrentUser();

  const existingChat = await api.chat.getChatByUserAndPeerId({
    userId: user!.id,
    peerId: userId
  });

  if (!existingChat || existingChat.length === 0) {
    let chat;
    try {
      chat = await api.chat.create({ userId: user!.id, peerId: userId });
    } catch (error) {
      console.error(error);
      toast({ title: "An error occurred", description: "Please try again" });
      redirect(`/`);
    }
    redirect(`/chat/${chat?.id}`);
  }

  redirect(`/chat/${existingChat[0]?.id}`);
}
