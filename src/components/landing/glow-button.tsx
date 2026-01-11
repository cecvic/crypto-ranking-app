'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface GlowButtonProps {
  children: React.ReactNode;
  href: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'default' | 'lg' | 'xl';
  className?: string;
  icon?: React.ReactNode;
}

export function GlowButton({
  children,
  href,
  variant = 'primary',
  size = 'default',
  className,
  icon,
}: GlowButtonProps) {
  const baseStyles =
    'inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-300 shine-btn';

  const variants = {
    primary:
      'bg-primary text-primary-foreground glow-primary hover:glow-primary-hover hover:scale-105',
    secondary:
      'glass border border-white/10 hover:bg-white/10 hover:border-white/20',
    ghost: 'hover:bg-white/5 text-muted-foreground hover:text-foreground',
  };

  const sizes = {
    default: 'px-6 py-3 text-sm',
    lg: 'px-8 py-4 text-base',
    xl: 'px-10 py-5 text-lg',
  };

  return (
    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
      <Link
        href={href}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
      >
        {children}
        {icon && <span className="ml-1">{icon}</span>}
      </Link>
    </motion.div>
  );
}

interface AnimatedButtonGroupProps {
  children: React.ReactNode;
  className?: string;
}

export function AnimatedButtonGroup({ children, className }: AnimatedButtonGroupProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.6,
        delay: 0.4,
        ease: [0.21, 0.47, 0.32, 0.98],
      }}
      className={cn('flex flex-col sm:flex-row items-center gap-4', className)}
    >
      {children}
    </motion.div>
  );
}

interface PulseIndicatorProps {
  value: number;
  label: string;
  className?: string;
}

export function PulseIndicator({ value, label, className }: PulseIndicatorProps) {
  const getColor = (val: number) => {
    if (val <= 25) return 'from-red-500 to-orange-500';
    if (val <= 45) return 'from-orange-500 to-yellow-500';
    if (val <= 55) return 'from-yellow-500 to-green-500';
    if (val <= 75) return 'from-green-500 to-emerald-500';
    return 'from-emerald-500 to-cyan-500';
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.6 }}
      className={cn('glass rounded-2xl p-6 inline-flex flex-col items-center gap-3', className)}
    >
      <div className="relative">
        {/* Pulse ring */}
        <motion.div
          className={cn(
            'absolute inset-0 rounded-full bg-gradient-to-r opacity-50 blur-md',
            getColor(value)
          )}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 0.3, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        {/* Value circle */}
        <div
          className={cn(
            'relative w-20 h-20 rounded-full bg-gradient-to-br flex items-center justify-center',
            getColor(value)
          )}
        >
          <span className="text-2xl font-bold text-white font-mono-nums">{value}</span>
        </div>
      </div>
      <div className="text-center">
        <div className="text-sm font-medium capitalize">{label}</div>
        <div className="text-xs text-muted-foreground">Fear & Greed Index</div>
      </div>
    </motion.div>
  );
}
