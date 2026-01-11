'use client';

import { motion } from 'framer-motion';

interface FloatingOrbProps {
  className: string;
  delay?: number;
  duration?: number;
  size?: number;
  x?: string;
  y?: string;
}

function FloatingOrb({
  className,
  delay = 0,
  duration = 8,
  size = 300,
  x = '0%',
  y = '0%',
}: FloatingOrbProps) {
  return (
    <motion.div
      className={`orb ${className}`}
      style={{
        width: size,
        height: size,
        left: x,
        top: y,
      }}
      animate={{
        y: [0, -30, 0],
        x: [0, 15, 0],
        scale: [1, 1.1, 1],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  );
}

export function AnimatedBackground({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Base gradient background */}
      <div className="absolute inset-0 mesh-gradient" />

      {/* Floating orbs */}
      <FloatingOrb
        className="orb-primary"
        size={400}
        x="10%"
        y="20%"
        delay={0}
        duration={10}
      />
      <FloatingOrb
        className="orb-accent"
        size={350}
        x="70%"
        y="10%"
        delay={2}
        duration={12}
      />
      <FloatingOrb
        className="orb-cyan"
        size={250}
        x="80%"
        y="60%"
        delay={4}
        duration={8}
      />
      <FloatingOrb
        className="orb-primary"
        size={200}
        x="20%"
        y="70%"
        delay={1}
        duration={9}
      />
      <FloatingOrb
        className="orb-accent"
        size={150}
        x="50%"
        y="40%"
        delay={3}
        duration={11}
      />

      {/* Noise overlay for texture */}
      <div
        className="absolute inset-0 opacity-[0.015] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export function GradientOverlay() {
  return (
    <>
      {/* Top gradient fade */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-[#0f0f23] to-transparent pointer-events-none z-20" />
      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0f0f23] to-transparent pointer-events-none z-20" />
    </>
  );
}
