'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { AIPrediction } from '@/lib/types';
import { cn } from '@/lib/utils';
import { BrainCircuitIcon } from 'lucide-react';

interface AIPredictionsCardProps {
  ai: AIPrediction | null;
  aiScore: number;
}

function PredictionRow({
  label,
  changePercent,
  confidence,
}: {
  label: string;
  changePercent: number;
  confidence: number;
}): React.ReactElement {
  const isPositive = changePercent >= 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span
          className={cn(
            'text-sm font-medium',
            isPositive ? 'text-green-500' : 'text-red-500'
          )}
        >
          {isPositive ? '+' : ''}{changePercent.toFixed(2)}%
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Progress
          value={confidence * 100}
          className="h-1.5 flex-1 [&>div]:bg-blue-500"
        />
        <span className="text-xs text-muted-foreground w-10 text-right">
          {(confidence * 100).toFixed(0)}%
        </span>
      </div>
    </div>
  );
}

export function AIPredictionsCard({ ai, aiScore }: AIPredictionsCardProps): React.ReactElement {
  if (!ai) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BrainCircuitIcon className="h-5 w-5" />
            AI Predictions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No AI prediction data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BrainCircuitIcon className="h-5 w-5" />
            AI Predictions
          </CardTitle>
          <span
            className={cn(
              'text-lg font-bold',
              aiScore >= 70 ? 'text-green-500' : aiScore >= 50 ? 'text-yellow-500' : 'text-red-500'
            )}
          >
            {Math.round(aiScore)}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <PredictionRow
          label="24h Forecast"
          changePercent={ai.prediction24h.changePercent}
          confidence={ai.prediction24h.confidence}
        />
        <PredictionRow
          label="7d Forecast"
          changePercent={ai.prediction7d.changePercent}
          confidence={ai.prediction7d.confidence}
        />
        {ai.prediction30d && (
          <PredictionRow
            label="30d Forecast"
            changePercent={ai.prediction30d.changePercent}
            confidence={ai.prediction30d.confidence}
          />
        )}
      </CardContent>
    </Card>
  );
}
