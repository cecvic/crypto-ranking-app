import { Metadata } from 'next';
import { Chat } from '@/components/chat/chat';

export const metadata: Metadata = {
  title: 'AI Chat | Trendhubs',
  description: 'AI-powered crypto trading assistant',
};

export default function ChatPage() {
  return (
    <div className="container py-6 h-[calc(100vh-3.5rem)]">
      <div className="glass rounded-xl h-full overflow-hidden">
        <Chat />
      </div>
    </div>
  );
}
