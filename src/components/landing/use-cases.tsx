'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import {
  ZapIcon,
  TrendingUpIcon,
  SearchIcon,
  CheckIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { GradientText, FadeUpText } from './animated-text';
import { GlassCard } from './glass-card';

interface Persona {
  id: string;
  label: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  benefits: string[];
}

const PERSONAS: Persona[] = [
  {
    id: 'traders',
    label: 'Day Traders',
    icon: <ZapIcon className="h-4 w-4" />,
    title: 'Real-Time Edge',
    description:
      'Get instant alerts on momentum shifts, whale movements, and sentiment spikes. Our 60-second refresh rate means you never miss an opportunity.',
    benefits: [
      'Real-time sentiment tracking',
      'Whale transaction alerts',
      'Technical indicator signals',
    ],
  },
  {
    id: 'investors',
    label: 'Long-Term Investors',
    icon: <TrendingUpIcon className="h-4 w-4" />,
    title: 'Informed Decisions',
    description:
      'Cut through the noise with our AI-powered analysis. Focus on fundamentals and long-term trends instead of daily volatility.',
    benefits: [
      'AI price predictions',
      'Fundamental analysis',
      'Risk assessment scores',
    ],
  },
  {
    id: 'researchers',
    label: 'Researchers',
    icon: <SearchIcon className="h-4 w-4" />,
    title: 'Comprehensive Data',
    description:
      'Access aggregated data from multiple sources in one place. Compare metrics across coins and track market-wide trends.',
    benefits: [
      'Multi-source data aggregation',
      'Historical trend analysis',
      'Cross-coin comparisons',
    ],
  },
];

function TabButton({
  persona,
  isActive,
  onClick,
}: {
  persona: Persona;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300',
        isActive
          ? 'text-foreground'
          : 'text-muted-foreground hover:text-foreground/80 hover:bg-white/5'
      )}
    >
      {isActive && (
        <motion.div
          layoutId="activeTab"
          className="absolute inset-0 glass rounded-xl border border-white/10"
          transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
        />
      )}
      <span className="relative z-10">{persona.icon}</span>
      <span className="relative z-10 hidden sm:inline">{persona.label}</span>
    </button>
  );
}

function PersonaContent({ persona }: { persona: Persona }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="grid md:grid-cols-2 gap-6 md:gap-8"
    >
      <div className="space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-xs text-primary">
          {persona.icon}
          <span>{persona.label}</span>
        </div>
        <h3 className="text-fluid-2xl font-bold">
          <GradientText animated={false}>{persona.title}</GradientText>
        </h3>
        <p className="text-muted-foreground leading-relaxed">
          {persona.description}
        </p>
      </div>

      <div className="space-y-3">
        {persona.benefits.map((benefit, index) => (
          <motion.div
            key={benefit}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center gap-3 p-4 glass rounded-xl"
          >
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
              <CheckIcon className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm font-medium">{benefit}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

export function UseCasesSection() {
  const [activePersona, setActivePersona] = useState(PERSONAS[0]);

  return (
    <section className="py-24 px-4">
      <div className="container max-w-5xl">
        <FadeUpText as="div" className="text-center mb-12">
          <h2 className="text-fluid-3xl font-bold mb-4">
            Built for <GradientText animated={false}>Every Trader</GradientText>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Whether you are day trading or investing long-term, Trendhubs provides the insights you need.
          </p>
        </FadeUpText>

        {/* Tab buttons */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex items-center gap-1 p-1 glass rounded-2xl">
            {PERSONAS.map((persona) => (
              <TabButton
                key={persona.id}
                persona={persona}
                isActive={activePersona.id === persona.id}
                onClick={() => setActivePersona(persona)}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <GlassCard hover={false} className="p-6 md:p-8">
          <AnimatePresence mode="wait">
            <PersonaContent key={activePersona.id} persona={activePersona} />
          </AnimatePresence>
        </GlassCard>
      </div>
    </section>
  );
}
