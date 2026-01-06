declare module 'sentiment' {
  interface SentimentResult {
    score: number;
    comparative: number;
    calculation: Array<{ [word: string]: number }>;
    tokens: string[];
    words: string[];
    positive: string[];
    negative: string[];
  }

  interface SentimentOptions {
    extras?: Record<string, number>;
    language?: string;
  }

  interface LanguageInput {
    labels: Record<string, number>;
  }

  class Sentiment {
    analyze(phrase: string, options?: SentimentOptions): SentimentResult;
    registerLanguage(languageCode: string, language: LanguageInput): void;
  }

  export = Sentiment;
}

declare module 'simple-statistics' {
  export function linearRegression(data: [number, number][]): { m: number; b: number };
  export function linearRegressionLine(mb: { m: number; b: number }): (x: number) => number;
  export function standardDeviation(data: number[]): number;
  export function mean(data: number[]): number;
  export function median(data: number[]): number;
  export function mode(data: number[]): number;
  export function variance(data: number[]): number;
  export function sampleCorrelation(x: number[], y: number[]): number;
  export function min(data: number[]): number;
  export function max(data: number[]): number;
  export function sum(data: number[]): number;
  export function quantile(data: number[], p: number): number;
}
