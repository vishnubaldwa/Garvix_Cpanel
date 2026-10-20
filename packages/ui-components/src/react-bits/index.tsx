import * as React from 'react';
import { cn } from '../lib/utils.js';

/**
 * ============================================================================
 * React Bits (https://reactbits.dev) — TypeScript + Tailwind Component Library
 * Lightweight, hardware-accelerated interactive UI & text components:
 * 1. SpotlightCard  (https://reactbits.dev/components/spotlight-card)
 * 2. BlurText       (https://reactbits.dev/text-animations/blur-text)
 * 3. ShinyText      (https://reactbits.dev/text-animations/shiny-text)
 * 4. GradientText   (https://reactbits.dev/text-animations/gradient-text)
 * 5. CountUp        (https://reactbits.dev/text-animations/count-up)
 * 6. DecryptedText  (https://reactbits.dev/text-animations/decrypted-text)
 * 7. AuroraBackground (https://reactbits.dev/backgrounds/aurora)
 * 8. StarBorder     (https://reactbits.dev/animations/star-border)
 * 9. TiltedCard     (https://reactbits.dev/components/tilted-card)
 * 10. AnimatedContent (https://reactbits.dev/animations/animated-content)
 * ============================================================================
 */

/* --------------------------------------------------------------------------
   1. SpotlightCard (React Bits)
   -------------------------------------------------------------------------- */
export interface SpotlightCardProps extends React.HTMLAttributes<HTMLDivElement> {
  spotlightColor?: string;
  children: React.ReactNode;
}

export function SpotlightCard({
  children,
  className,
  spotlightColor = 'rgba(99, 102, 241, 0.12)',
  ...props
}: SpotlightCardProps) {
  const divRef = React.useRef<HTMLDivElement>(null);
  const [position, setPosition] = React.useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = React.useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!divRef.current) return;
    const rect = divRef.current.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setOpacity(1)}
      onMouseLeave={() => setOpacity(0)}
      className={cn(
        'relative overflow-hidden rounded-2xl border border-indigo-100/90 bg-white p-5 text-slate-900 shadow-[0_10px_30px_-12px_rgba(99,102,241,0.12)] transition-all duration-300 hover:border-indigo-300/80 hover:shadow-[0_18px_38px_-12px_rgba(99,102,241,0.20)]',
        className
      )}
      {...props}
    >
      <div
        className="pointer-events-none absolute -inset-px transition-opacity duration-500"
        style={{
          opacity,
          background: `radial-gradient(480px circle at ${position.x}px ${position.y}px, ${spotlightColor}, transparent 45%)`,
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

/* --------------------------------------------------------------------------
   2. BlurText (React Bits)
   -------------------------------------------------------------------------- */
export interface BlurTextProps {
  text: string;
  delayMs?: number;
  animateBy?: 'words' | 'letters';
  className?: string;
}

export function BlurText({
  text,
  delayMs = 20,
  animateBy = 'words',
  className,
}: BlurTextProps) {
  const segments = animateBy === 'words' ? text.split(' ') : text.split('');

  return (
    <span className={cn('inline-flex flex-wrap items-center', className)}>
      {segments.map((segment, index) => (
        <span
          key={`${segment}-${index}`}
          style={{
            animationDelay: `${Math.min(index * delayMs, 140)}ms`,
          }}
          className="inline-block animate-[nebulix-bar-rise_320ms_cubic-bezier(0.16,1,0.3,1)_both]"
        >
          {segment}
          {animateBy === 'words' && index < segments.length - 1 ? '\u00A0' : ''}
        </span>
      ))}
    </span>
  );
}

/* --------------------------------------------------------------------------
   3. ShinyText (React Bits)
   -------------------------------------------------------------------------- */
export interface ShinyTextProps {
  text: string;
  disabled?: boolean;
  speedSeconds?: number;
  className?: string;
}

export function ShinyText({
  text,
  disabled = false,
  speedSeconds = 3.5,
  className,
}: ShinyTextProps) {
  return (
    <span
      style={{
        backgroundImage:
          'linear-gradient(120deg, rgba(255,255,255,0) 35%, rgba(255,255,255,0.85) 50%, rgba(255,255,255,0) 65%)',
        backgroundSize: '200% 100%',
        WebkitBackgroundClip: 'text',
        animationDuration: `${speedSeconds}s`,
      }}
      className={cn(
        'inline-block bg-clip-text font-bold',
        !disabled && 'animate-[rb-shine_3.5s_linear_infinite]',
        className
      )}
    >
      {text}
    </span>
  );
}

/* --------------------------------------------------------------------------
   4. GradientText (React Bits)
   -------------------------------------------------------------------------- */
export interface GradientTextProps {
  children: React.ReactNode;
  colors?: string[];
  className?: string;
}

export function GradientText({
  children,
  colors = ['#ff6c2c', '#f97316', '#38bdf8', '#ff6c2c'],
  className,
}: GradientTextProps) {
  return (
    <span
      style={{
        backgroundImage: `linear-gradient(90deg, ${colors.join(', ')})`,
        backgroundSize: '250% 100%',
      }}
      className={cn(
        'bg-clip-text font-extrabold text-transparent animate-[rb-gradient_6s_ease_infinite]',
        className
      )}
    >
      {children}
    </span>
  );
}

/* --------------------------------------------------------------------------
   5. CountUp (React Bits)
   -------------------------------------------------------------------------- */
export interface CountUpProps {
  to: number;
  from?: number;
  durationMs?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  separator?: string;
  className?: string;
}

export function CountUp({
  to,
  from = 0,
  durationMs = 550,
  decimals = 0,
  prefix = '',
  suffix = '',
  separator = ',',
  className,
}: CountUpProps) {
  const [current, setCurrent] = React.useState(from);

  React.useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ) {
      setCurrent(to);
      return;
    }

    const totalSteps = 20;
    const stepInterval = Math.max(16, Math.floor(durationMs / totalSteps));
    let stepCount = 0;

    const timer = setInterval(() => {
      stepCount += 1;
      const progress = Math.min(stepCount / totalSteps, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(from + (to - from) * eased);
      if (progress >= 1) {
        clearInterval(timer);
        setCurrent(to);
      }
    }, stepInterval);

    return () => clearInterval(timer);
  }, [to, from, durationMs]);

  const formatted = React.useMemo(() => {
    const fixed = current.toFixed(decimals);
    const [intPart, decPart] = fixed.split('.');
    const withSep = (intPart ?? '0').replace(/\B(?=(\d{3})+(?!\d))/g, separator);
    return decPart !== undefined ? `${withSep}.${decPart}` : withSep;
  }, [current, decimals, separator]);

  return (
    <span className={cn('tabular-nums', className)}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}

/* --------------------------------------------------------------------------
   6. DecryptedText (React Bits)
   -------------------------------------------------------------------------- */
export interface DecryptedTextProps {
  text: string;
  speedMs?: number;
  characters?: string;
  className?: string;
}

export function DecryptedText({
  text,
  speedMs = 24,
  characters = 'ABCDEF0123456789#-*GVX',
  className,
}: DecryptedTextProps) {
  const [displayText, setDisplayText] = React.useState(text);

  const triggerDecrypt = React.useCallback(() => {
    let iteration = 0;
    const interval = setInterval(() => {
      setDisplayText(
        text
          .split('')
          .map((char, index) => {
            if (char === ' ' || char === '-') return char;
            if (index < iteration) return text[index];
            return characters[Math.floor(Math.random() * characters.length)];
          })
          .join('')
      );
      iteration += 1 / 2;
      if (iteration >= text.length) {
        clearInterval(interval);
        setDisplayText(text);
      }
    }, speedMs);
    return () => clearInterval(interval);
  }, [text, speedMs, characters]);

  React.useEffect(() => {
    return triggerDecrypt();
  }, [triggerDecrypt]);

  return (
    <span
      onMouseEnter={triggerDecrypt}
      className={cn('cursor-pointer font-mono tracking-tight', className)}
      title="Hover to re-verify cryptographic string"
    >
      {displayText}
    </span>
  );
}

/* --------------------------------------------------------------------------
   7. AuroraBackground (React Bits — Nebulix Light-Theme Edition)
   -------------------------------------------------------------------------- */
export interface AuroraBackgroundProps extends React.HTMLAttributes<HTMLDivElement> {
  colorStops?: [string, string, string];
  children?: React.ReactNode;
}

export function AuroraBackground({
  colorStops = ['#8B5CF6', '#6366F1', '#3B82F6'],
  children,
  className,
  ...props
}: AuroraBackgroundProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-3xl border border-indigo-100/90 bg-gradient-to-br from-white via-[#F6F4FF] to-[#EEF4FF] text-slate-900 shadow-[0_18px_50px_-15px_rgba(99,102,241,0.16)]',
        className
      )}
      {...props}
    >
      <div
        className="pointer-events-none absolute -top-28 -left-24 h-72 w-72 rounded-full opacity-20 blur-3xl transition-all duration-1000"
        style={{ background: colorStops[0] }}
      />
      <div
        className="pointer-events-none absolute -right-20 top-8 h-72 w-72 rounded-full opacity-15 blur-3xl transition-all duration-1000"
        style={{ background: colorStops[1] }}
      />
      <div
        className="pointer-events-none absolute -bottom-24 left-1/3 h-64 w-64 rounded-full opacity-15 blur-3xl transition-all duration-1000"
        style={{ background: colorStops[2] }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

/* --------------------------------------------------------------------------
   8. StarBorder (React Bits — Nebulix Light-Theme Edition)
   -------------------------------------------------------------------------- */
export interface StarBorderProps extends React.HTMLAttributes<HTMLDivElement> {
  color?: string;
  children: React.ReactNode;
}

export function StarBorder({
  color = '#6366F1',
  children,
  className,
  ...props
}: StarBorderProps) {
  return (
    <div
      className={cn(
        'relative rounded-2xl p-[1.5px] shadow-[0_12px_34px_-12px_rgba(99,102,241,0.18)] transition-transform duration-300',
        className
      )}
      style={{
        background: `linear-gradient(135deg, ${color}, rgba(59,130,246,0.45), ${color})`,
      }}
      {...props}
    >
      <div className="h-full w-full rounded-[15px] bg-white text-slate-900">{children}</div>
    </div>
  );
}

/* --------------------------------------------------------------------------
   9. TiltedCard (React Bits)
   -------------------------------------------------------------------------- */
export interface TiltedCardProps extends React.HTMLAttributes<HTMLDivElement> {
  maxTiltDeg?: number;
  children: React.ReactNode;
}

export function TiltedCard({
  maxTiltDeg = 4,
  children,
  className,
  ...props
}: TiltedCardProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [transform, setTransform] = React.useState('perspective(900px) rotateX(0deg) rotateY(0deg)');

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    const rotX = (-y * maxTiltDeg * 2).toFixed(2);
    const rotY = (x * maxTiltDeg * 2).toFixed(2);
    setTransform(`perspective(900px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale3d(1.01,1.01,1.01)`);
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setTransform('perspective(900px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)')}
      style={{ transform, transition: 'transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1)' }}
      className={cn('will-change-transform', className)}
      {...props}
    >
      {children}
    </div>
  );
}

/* --------------------------------------------------------------------------
   10. AnimatedContent (React Bits)
   -------------------------------------------------------------------------- */
export interface AnimatedContentProps {
  children: React.ReactNode;
  delayMs?: number;
  className?: string;
}

export function AnimatedContent({ children, delayMs = 0, className }: AnimatedContentProps) {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setVisible(true), Math.min(delayMs, 120));
    return () => clearTimeout(timer);
  }, [delayMs]);

  return (
    <div
      className={cn(
        'transition-all duration-300 ease-out motion-reduce:transition-none motion-reduce:opacity-100 motion-reduce:translate-y-0',
        visible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-95',
        className
      )}
    >
      {children}
    </div>
  );
}
