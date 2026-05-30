'use client';

import { ChatWorkspace } from '@/components/dashboard/ChatWorkspace';

type PageProps = {
  params: { chatId: string };
};

export default function ChatThreadPage({ params }: PageProps) {
  return <ChatWorkspace urlChatId={params.chatId} />;
}
