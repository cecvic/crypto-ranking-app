'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CoinRanking } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ScoreCardsProps {
  scores: CoinRanking['scores'];
}

interface ScoreItemProps {
  title: string;
  score: number;
}

function getScoreColorClass(score: number): string {
  if (score >= 70) return 'text-green-500';
  if (score >= 50) return 'text-yellow-500';
  return 'text-red-500';
}

function getProgressColor(score: number): string {
  if (score >= 70) return '[&>div]:bg-green-500';
  if (score >= 50) return '[&>div]:bg-yellow-500';
  return '[&>div]:bg-red-500';
}

function ScoreItem({ title, score }: ScoreItemProps): React.ReactElement {
  const displayScore = Math.round(score ?? 0);

  return (
    <Card>
      <CardContent className="py-4 px-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">{title}</span>
          <span className={cn('text-xl font-bold', getScoreColorClass(displayScore))}>
            {displayScore}
          </span>
        </div>
        <Progress
          value={displayScore}
          className={cn('h-2', getProgressColor(displayScore))}
        />
      </CardContent>
    </Card>
  );
}

export function ScoreCards({ scores }: ScoreCardsProps): React.ReactElement {
  return (
    <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
      <ScoreItem title="Sentiment" score={scores.sentiment ?? 0} />
      <ScoreItem title="Technical" score={scores.technical ?? 0} />
      <ScoreItem title="Whale Activity" score={scores.whale ?? 0} />
      <ScoreItem title="AI Prediction" score={scores.ai ?? 0} />
      <ScoreItem title="Price Action" score={scores.pricePerformance ?? 0} />
    </div>
  );
}
