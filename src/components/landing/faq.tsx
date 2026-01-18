'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { ChevronDownIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GradientText, FadeUpText } from './animated-text';

interface FAQItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    question: "How does the 5-factor analysis work?",
    answer: "We combine sentiment analysis, technical indicators, whale tracking, AI predictions, and real-time market data to generate a comprehensive score for each cryptocurrency. Each factor is weighted and normalized to produce a final ranking that reflects both short-term signals and longer-term trends."
  },
  {
    question: "What data sources do you use?",
    answer: "We aggregate data from CoinGecko, LunarCrush, TAAPI, DefiLlama, and other premium sources to provide accurate, real-time analytics. This multi-source approach ensures reliability and comprehensive market coverage."
  },
  {
    question: "Is Trendhubs free to use?",
    answer: "Yes! Our core features are completely free. Sign up with Google OAuth in seconds - no credit card required. We believe in providing value upfront while developing premium features for power users."
  },
  {
    question: "How often is data updated?",
    answer: "Our rankings refresh every 60 seconds, ensuring you always have access to the latest market insights. Whale alerts and confluence signals are monitored continuously for real-time notifications."
  },
  {
    question: "What cryptocurrencies do you track?",
    answer: "We provide comprehensive analysis of the top 100 cryptocurrencies by market cap, with plans to expand coverage. Each coin is analyzed across all five factors for a complete picture."
  },
];

function FAQAccordionItem({
  item,
  isOpen,
  onToggle,
  index
}: {
  item: FAQItem;
  isOpen: boolean;
  onToggle: () => void;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{
        duration: 0.5,
        delay: index * 0.1,
        ease: [0.21, 0.47, 0.32, 0.98],
      }}
      className="glass rounded-xl overflow-hidden"
    >
      <button
        onClick={onToggle}
        className={cn(
          'w-full flex items-center justify-between p-5 text-left transition-colors',
          'hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset'
        )}
        aria-expanded={isOpen}
      >
        <span className="font-medium pr-4">{item.question}</span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="shrink-0"
        >
          <ChevronDownIcon className="h-5 w-5 text-muted-foreground" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.21, 0.47, 0.32, 0.98] }}
          >
            <div className="px-5 pb-5 text-muted-foreground text-sm leading-relaxed border-t border-white/5 pt-4">
              {item.answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="py-24 px-4">
      <div className="container max-w-3xl">
        <FadeUpText as="div" className="text-center mb-12">
          <h2 className="text-fluid-3xl font-bold mb-4">
            Frequently Asked <GradientText animated={false}>Questions</GradientText>
          </h2>
          <p className="text-muted-foreground">
            Everything you need to know about Trendhubs
          </p>
        </FadeUpText>

        <div className="space-y-3">
          {FAQ_ITEMS.map((item, index) => (
            <FAQAccordionItem
              key={index}
              item={item}
              index={index}
              isOpen={openIndex === index}
              onToggle={() => setOpenIndex(openIndex === index ? null : index)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
