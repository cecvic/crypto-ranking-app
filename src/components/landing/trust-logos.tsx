'use client';

import { motion } from 'framer-motion';
import { FadeUpText } from './animated-text';

interface DataSource {
  name: string;
  // Using text-based logos since we don't have SVG assets
}

const DATA_SOURCES: DataSource[] = [
  { name: 'CoinGecko' },
  { name: 'LunarCrush' },
  { name: 'DefiLlama' },
  { name: 'TAAPI' },
  { name: 'Fear & Greed' },
];

function LogoItem({ name, index }: { name: string; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{
        duration: 0.5,
        delay: index * 0.1,
        ease: [0.21, 0.47, 0.32, 0.98],
      }}
      whileHover={{ scale: 1.05 }}
      className="group flex items-center justify-center"
    >
      <span className="text-sm md:text-base font-medium text-muted-foreground/60 group-hover:text-foreground transition-colors duration-300 tracking-wide">
        {name}
      </span>
    </motion.div>
  );
}

export function TrustLogos() {
  return (
    <section className="py-12 px-4 border-y border-white/5 bg-white/[0.01]">
      <div className="container max-w-5xl">
        <FadeUpText
          as="p"
          className="text-center text-xs uppercase tracking-widest text-muted-foreground/70 mb-8"
        >
          Real-time data from industry-leading sources
        </FadeUpText>

        <div className="flex items-center justify-center gap-8 md:gap-12 lg:gap-16 flex-wrap">
          {DATA_SOURCES.map((source, index) => (
            <LogoItem key={source.name} name={source.name} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
