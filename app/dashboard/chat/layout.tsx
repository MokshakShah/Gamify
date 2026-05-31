'use client';

import { useParams } from 'next/navigation';
import { ChatWorkspace } from '@/components/dashboard/ChatWorkspace';

type ChatLayoutParams = {
  chatId?: string[];
};

type ChatLayoutProps = {
  children: React.ReactNode;
};

export default function ChatLayout({ children }: ChatLayoutProps) {
  const params = useParams<ChatLayoutParams>();
  const chatId = params?.chatId?.[0];

  return (
    <>
      <ChatWorkspace urlChatId={chatId} />
      {children}
    </>
  );
}
