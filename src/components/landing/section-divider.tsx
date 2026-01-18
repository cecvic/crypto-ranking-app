'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SectionDividerProps {
  variant?: 'gradient' | 'glow' | 'dots';
  className?: string;
}

export function SectionDivider({ variant = 'gradient', className }: SectionDividerProps) {
  if (variant === 'dots') {
    return (
      <div className={cn('py-8 flex items-center justify-center gap-2', className)}>
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3, delay: i * 0.1 }}
            className="w-1.5 h-1.5 rounded-full bg-primary/50"
          />
        ))}
      </div>
    );
  }

  if (variant === 'glow') {
    return (
      <div className={cn('py-8 overflow-hidden', className)}>
        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          whileInView={{ scaleX: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="h-px w-full max-w-lg mx-auto relative"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary to-transparent blur-sm" />
        </motion.div>
      </div>
    );
  }

  // Default gradient variant
  return (
    <div className={cn('py-8 overflow-hidden', className)}>
      <motion.div
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1, ease: 'easeOut' }}
        className="h-px w-full max-w-2xl mx-auto bg-gradient-to-r from-transparent via-primary/50 to-transparent"
      />
    </div>
  );
}
