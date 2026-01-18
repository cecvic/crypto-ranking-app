'use client';

import { motion } from 'framer-motion';
import {
  TrendingUpIcon,
  TrendingDownIcon,
  ActivityIcon,
  BarChart3Icon,
} from 'lucide-react';

// Mock data for the preview
const MOCK_COINS = [
  { rank: 1, name: 'Bitcoin', symbol: 'BTC', score: 87, change: 2.4, trend: 'up' },
  { rank: 2, name: 'Ethereum', symbol: 'ETH', score: 82, change: 1.8, trend: 'up' },
  { rank: 3, name: 'Solana', symbol: 'SOL', score: 78, change: -0.5, trend: 'down' },
  { rank: 4, name: 'Avalanche', symbol: 'AVAX', score: 75, change: 3.2, trend: 'up' },
];

function MockCoinRow({
  rank,
  name,
  symbol,
  score,
  change,
  trend,
}: {
  rank: number;
  name: string;
  symbol: string;
  score: number;
  change: number;
  trend: 'up' | 'down';
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.9 + rank * 0.1 }}
      className="flex items-center justify-between py-2.5 px-3 hover:bg-white/5 rounded-lg transition-colors"
    >
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground w-4">{rank}</span>
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/40 to-accent/40 flex items-center justify-center">
          <span className="text-[10px] font-bold text-white/90">{symbol.slice(0, 2)}</span>
        </div>
        <div>
          <div className="text-sm font-medium">{name}</div>
          <div className="text-xs text-muted-foreground">{symbol}</div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <div className="text-sm font-bold gradient-text">{score}</div>
          <div className="text-[10px] text-muted-foreground">Score</div>
        </div>
        <div
          className={`flex items-center gap-1 text-xs ${
            trend === 'up' ? 'text-emerald-400' : 'text-red-400'
          }`}
        >
          {trend === 'up' ? (
            <TrendingUpIcon className="h-3 w-3" />
          ) : (
            <TrendingDownIcon className="h-3 w-3" />
          )}
          <span>{change > 0 ? '+' : ''}{change}%</span>
        </div>
      </div>
    </motion.div>
  );
}

function MockStatCard({
  icon,
  label,
  value,
  delay,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay }}
      className="glass rounded-lg p-3 text-center"
    >
      <div className="text-primary mb-1">{icon}</div>
      <div className="text-lg font-bold gradient-text">{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </motion.div>
  );
}

export function DashboardPreview() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.8, duration: 0.8 }}
      className="mt-16 relative max-w-4xl mx-auto px-4"
    >
      {/* Glow behind the preview */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-accent/20 to-cyan-500/20 blur-3xl rounded-3xl opacity-50" />

      {/* Dashboard container with perspective */}
      <div
        className="relative glass rounded-2xl overflow-hidden border border-white/10"
        style={{
          transform: 'perspective(1000px) rotateX(2deg)',
          transformOrigin: 'center bottom',
        }}
      >
        {/* Header bar */}
        <div className="flex items-center justify-between p-4 border-b border-white/5 bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500/60" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
            <div className="w-3 h-3 rounded-full bg-green-500/60" />
          </div>
          <div className="text-xs text-muted-foreground">trendhubs.app/rankings</div>
          <div className="w-16" />
        </div>

        {/* Dashboard content */}
        <div className="p-4 md:p-6">
          {/* Stats row */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            <MockStatCard
              icon={<BarChart3Icon className="h-4 w-4 mx-auto" />}
              label="Tracked"
              value="100+"
              delay={0.85}
            />
            <MockStatCard
              icon={<ActivityIcon className="h-4 w-4 mx-auto" />}
              label="Refresh"
              value="60s"
              delay={0.9}
            />
            <MockStatCard
              icon={<TrendingUpIcon className="h-4 w-4 mx-auto" />}
              label="Bullish"
              value="64%"
              delay={0.95}
            />
            <MockStatCard
              icon={<TrendingDownIcon className="h-4 w-4 mx-auto" />}
              label="Bearish"
              value="36%"
              delay={1.0}
            />
          </div>

          {/* Rankings table */}
          <div className="glass rounded-xl p-3">
            <div className="flex items-center justify-between mb-3 px-3">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Top Ranked
              </span>
              <span className="text-[10px] text-primary">Live</span>
            </div>
            <div className="space-y-1">
              {MOCK_COINS.map((coin) => (
                <MockCoinRow
                  key={coin.symbol}
                  rank={coin.rank}
                  name={coin.name}
                  symbol={coin.symbol}
                  score={coin.score}
                  change={coin.change}
                  trend={coin.trend as 'up' | 'down'}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Gradient overlay at bottom */}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#0f0f23] to-transparent pointer-events-none" />
      </div>

      {/* Label */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="text-center mt-4"
      >
        <span className="text-xs text-muted-foreground uppercase tracking-wider">
          Live Dashboard Preview
        </span>
      </motion.div>
    </motion.div>
  );
}
