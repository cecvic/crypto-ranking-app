'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  glow?: 'primary' | 'accent' | 'cyan' | 'none';
  delay?: number;
}

export function GlassCard({
  children,
  className,
  hover = true,
  glow = 'none',
  delay = 0,
}: GlassCardProps) {
  const glowClasses = {
    primary: 'hover:glow-primary',
    accent: 'hover:glow-accent',
    cyan: 'hover:glow-cyan',
    none: '',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{
        duration: 0.5,
        delay,
        ease: [0.21, 0.47, 0.32, 0.98],
      }}
      whileHover={hover ? { y: -5, scale: 1.02 } : undefined}
      className={cn(
        'glass rounded-2xl p-6 transition-all duration-300',
        hover && 'glass-hover cursor-pointer',
        glowClasses[glow],
        className
      )}
    >
      {children}
    </motion.div>
  );
}

interface GlassCardWithBorderProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export function GlassCardWithBorder({
  children,
  className,
  delay = 0,
}: GlassCardWithBorderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{
        duration: 0.5,
        delay,
        ease: [0.21, 0.47, 0.32, 0.98],
      }}
      className={cn('border-gradient p-6', className)}
    >
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay?: number;
}

export function FeatureCard({ icon, title, description, delay = 0 }: FeatureCardProps) {
  return (
    <GlassCard hover glow="primary" delay={delay}>
      <div className="flex flex-col gap-4">
        <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
          {icon}
        </div>
        <div>
          <h3 className="text-lg font-semibold mb-2">{title}</h3>
          <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
        </div>
      </div>
    </GlassCard>
  );
}

interface StatCardProps {
  value: string | number;
  label: string;
  suffix?: string;
  delay?: number;
}

export function StatCard({ value, label, suffix, delay = 0 }: StatCardProps) {
  return (
    <GlassCard hover={false} delay={delay} className="text-center py-8">
      <div className="text-fluid-4xl font-bold gradient-text font-mono-nums">
        {value}
        {suffix && <span className="text-fluid-2xl">{suffix}</span>}
      </div>
      <div className="text-muted-foreground mt-2">{label}</div>
    </GlassCard>
  );
}
