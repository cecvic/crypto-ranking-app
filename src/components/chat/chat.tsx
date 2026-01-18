'use client';

import { useState, useMemo } from 'react';
import { useChat, Chat as AiChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { ChatInput } from './chat-input';
import { ChatMessages } from './chat-messages';
import { SuggestedPrompts } from './suggested-prompts';

export function Chat() {
  const [input, setInput] = useState('');

  const chat = useMemo(
    () =>
      new AiChat({
        transport: new DefaultChatTransport({
          api: '/api/chat',
        }),
      }),
    []
  );

  const { messages, sendMessage, status, stop } = useChat({
    chat,
    experimental_throttle: 50,
  });

  const isStreaming = status === 'streaming';

  const handleSend = async (text: string) => {
    if (!text.trim() || isStreaming) return;
    setInput('');
    await sendMessage({ text });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-hidden">
        {messages.length === 0 ? (
          <SuggestedPrompts onSendMessage={handleSend} />
        ) : (
          <ChatMessages messages={messages} isStreaming={isStreaming} />
        )}
      </div>
      <ChatInput
        input={input}
        setInput={setInput}
        onSend={handleSend}
        isStreaming={isStreaming}
        onStop={stop}
      />
    </div>
  );
}
