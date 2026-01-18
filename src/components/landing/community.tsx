'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { TwitterIcon, MailIcon, CheckCircleIcon } from 'lucide-react';
import { GlassCard } from './glass-card';
import { GradientText, FadeUpText } from './animated-text';

// Discord icon component since lucide doesn't have it
function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

export function CommunitySection() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) return;

    setStatus('loading');
    // Simulate API call - in production, connect to your email service
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setStatus('success');
    setEmail('');

    // Reset after showing success
    setTimeout(() => setStatus('idle'), 3000);
  };

  return (
    <section className="py-24 px-4">
      <div className="container max-w-4xl">
        <GlassCard hover={false} className="text-center py-12 px-6 md:px-8 relative overflow-hidden">
          {/* Background glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />

          <FadeUpText as="div" className="relative z-10">
            <h2 className="text-fluid-2xl font-bold mb-3">
              Join the <GradientText animated={false}>Community</GradientText>
            </h2>
            <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
              Get weekly alpha, market insights, and early access to new features.
            </p>

            {/* Email signup form */}
            <form
              onSubmit={handleSubmit}
              className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto mb-8"
            >
              <div className="relative flex-1">
                <MailIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  disabled={status === 'loading' || status === 'success'}
                  className="w-full glass rounded-xl pl-11 pr-4 py-3 text-sm border border-white/10 focus:border-primary focus:outline-none transition-colors disabled:opacity-50"
                />
              </div>
              <motion.button
                type="submit"
                disabled={status === 'loading' || status === 'success'}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm glow-primary hover:glow-primary-hover transition-all duration-300 shine-btn disabled:opacity-50"
              >
                {status === 'loading' ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                  />
                ) : status === 'success' ? (
                  <>
                    <CheckCircleIcon className="h-4 w-4" />
                    Subscribed
                  </>
                ) : (
                  'Subscribe'
                )}
              </motion.button>
            </form>

            {/* Success message */}
            {status === 'success' && (
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-emerald-400 mb-6"
              >
                Thanks for subscribing! Check your inbox soon.
              </motion.p>
            )}

            {/* Social links */}
            <div className="flex items-center justify-center gap-4">
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 glass rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all duration-300"
              >
                <TwitterIcon className="h-4 w-4" />
                <span className="text-sm">Twitter</span>
              </a>
              <a
                href="https://discord.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 glass rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all duration-300"
              >
                <DiscordIcon className="h-4 w-4" />
                <span className="text-sm">Discord</span>
              </a>
            </div>
          </FadeUpText>
        </GlassCard>
      </div>
    </section>
  );
}
