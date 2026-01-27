/**
 * Streaming chat API endpoint
 * Uses Vercel AI SDK with GPT-4o and crypto/defi tools
 */

import { streamText, stepCountIs, convertToModelMessages } from 'ai';
import { openai } from '@ai-sdk/openai';
import { cryptoTools, defiTools } from '@/lib/ai/tools';
import { systemPrompt } from '@/lib/ai/prompts';
import { Ratelimit } from '@upstash/ratelimit';
import { getRedis } from '@/lib/cache/redis';

// Combine all tools
const tools = { ...cryptoTools, ...defiTools };

// Rate limiter: 10 requests per minute per user
// Lazy initialization to avoid build-time env var access
let _ratelimit: Ratelimit | null = null;
function getRatelimit(): Ratelimit {
  if (!_ratelimit) {
    _ratelimit = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(10, '1 m'),
      analytics: true,
      prefix: 'chat-ratelimit',
    });
  }
  return _ratelimit;
}

export async function POST(req: Request) {
  // Rate limiting - use IP or user ID
  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'anonymous';
  const { success, limit, reset, remaining } = await getRatelimit().limit(ip);

  if (!success) {
    return new Response(
      JSON.stringify({
        error: 'Rate limit exceeded',
        limit,
        reset,
        remaining,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': reset.toString(),
        },
      }
    );
  }

  const { messages } = await req.json();

  // Convert UIMessages (from frontend) to ModelMessages (for streamText)
  const modelMessages = await convertToModelMessages(messages, {
    tools,
  });

  const result = streamText({
    model: openai('gpt-4o'),
    system: systemPrompt,
    messages: modelMessages,
    tools,
    stopWhen: stepCountIs(5), // Allow multi-step tool calls (v6 syntax)
  });

  return result.toUIMessageStreamResponse();
}
