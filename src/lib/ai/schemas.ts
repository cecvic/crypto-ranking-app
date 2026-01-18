import { z } from 'zod';

export const analysisRowSchema = z.object({
  category: z.enum(['Momentum', 'Structure', 'Flow', 'Synthesis'])
    .describe('Analysis category'),
  metric: z.string().describe('Specific metric being measured'),
  signal: z.enum(['bullish', 'neutral', 'bearish'])
    .describe('Signal interpretation'),
  context: z.string().describe('Brief explanation of what this means'),
});

export const analysisSchema = z.object({
  summary: z.string()
    .describe('2-3 sentence executive summary of the analysis'),
  table: z.array(analysisRowSchema)
    .describe('Structured analysis table with 4-8 rows'),
  takeaway: z.string()
    .describe('Key insight or next consideration for the trader'),
  data_timestamp: z.string()
    .describe('When the underlying data was fetched'),
});
