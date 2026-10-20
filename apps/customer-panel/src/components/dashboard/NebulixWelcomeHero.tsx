import * as React from 'react';
import { Plus, Mail, Sparkles, ArrowUpRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { BlurText, GradientText } from '@garvix/ui-components';

export interface NebulixWelcomeHeroProps {
  onAddDomain: () => void;
  onCreateEmail: () => void;
  onOpenFileManager: () => void;
}

export const NebulixWelcomeHero: React.FC<NebulixWelcomeHeroProps> = ({
  onAddDomain,
  onCreateEmail,
  onOpenFileManager,
}) => {
  return (
    <section
      aria-label="Welcome Banner"
      className="relative overflow-hidden rounded-3xl border border-indigo-100/90 bg-gradient-to-br from-white via-[#F6F4FF] to-[#EEF4FF] p-6 shadow-[0_18px_50px_-15px_rgba(99,102,241,0.16)] sm:p-8"
    >
      {/* Decorative Ambient Lavender & Blue Orbs */}
      <div className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full bg-gradient-to-br from-violet-400/20 via-indigo-400/15 to-blue-400/20 blur-3xl animate-nebulix-pulse" />
      <div className="pointer-events-none absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-gradient-to-tr from-blue-400/15 to-purple-300/20 blur-3xl" />

      <div className="relative z-10 grid items-center gap-8 lg:grid-cols-[1.35fr_0.65fr]">
        {/* Left Column: Personalized Welcome + Quick Action Buttons */}
        <div className="min-w-0 space-y-5">
          <div className="inline-flex flex-wrap items-center gap-2 rounded-full border border-indigo-200/80 bg-white/90 px-3.5 py-1.5 text-xs font-semibold text-indigo-700 shadow-xs">
            <Sparkles className="h-3.5 w-3.5 text-violet-600" />
            <span>Nebulix Cloud Engine</span>
            <span className="text-slate-300">•</span>
            <GradientText
              colors={['#7C3AED', '#4F46E5', '#2563EB', '#7C3AED']}
              className="text-xs font-bold"
            >
              AlmaLinux 10 NVMe Cluster
            </GradientText>
          </div>

          <div className="space-y-2.5">
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl lg:text-[34px] lg:leading-[1.18]">
              <BlurText
                text="Welcome back, Vishnu! Your Cloud Hosting is Running Smoothly."
                delayMs={35}
              />
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-slate-600">
              Your primary production workspace{' '}
              <span className="font-mono font-semibold text-indigo-700">garvixcloud.in</span> is
              protected by AutoSSL TLS 1.3, isolated PHP-FPM 8.3 &amp; Node.js 20 pools, and daily
              Restic AES-256-GCM snapshots.
            </p>
          </div>

          {/* Trust & Isolation Pills */}
          <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-slate-600">
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200/80 bg-emerald-50/80 px-3 py-1 text-emerald-800">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              99.98% Uptime SLA
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200/70 bg-white/80 px-3 py-1 text-indigo-900">
              <ShieldCheck className="h-3.5 w-3.5 text-indigo-600" />
              13/13 Mail Preflight Verified
            </span>
          </div>

          {/* Hero Quick Action CTA Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={onAddDomain}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-[0_10px_25px_-6px_rgba(79,70,229,0.55)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-6px_rgba(79,70,229,0.7)] active:translate-y-0"
            >
              <Plus className="h-4 w-4" />
              Add New Domain
            </button>

            <button
              type="button"
              onClick={onCreateEmail}
              className="inline-flex items-center gap-2 rounded-2xl border border-indigo-200/90 bg-white px-4 py-2.5 text-xs font-bold text-indigo-950 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-300 hover:bg-indigo-50/50"
            >
              <Mail className="h-4 w-4 text-indigo-600" />
              Create Business Email
            </button>

            <button
              type="button"
              onClick={onOpenFileManager}
              className="inline-flex items-center gap-1.5 rounded-2xl border border-transparent bg-indigo-100/70 px-4 py-2.5 text-xs font-bold text-indigo-800 transition-colors hover:bg-indigo-100"
            >
              <span>Explore File Manager</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Right Column: Elegant Floating Cloud & Server Illustration */}
        <div className="relative mx-auto flex w-full max-w-[320px] items-center justify-center lg:max-w-none">
          <div className="relative w-full animate-nebulix-float">
            <svg
              viewBox="0 0 360 250"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="h-auto w-full drop-shadow-[0_20px_30px_rgba(99,102,241,0.18)]"
              role="img"
              aria-label="Nebulix Cloud Server Illustration"
            >
              <defs>
                <linearGradient id="nebGradPrimary" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#7C3AED" />
                  <stop offset="50%" stopColor="#4F46E5" />
                  <stop offset="100%" stopColor="#2563EB" />
                </linearGradient>
                <linearGradient id="nebGradSoft" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#EDE9FE" />
                  <stop offset="100%" stopColor="#DBEAFE" />
                </linearGradient>
                <linearGradient id="nebGradGlass" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="#F5F3FF" stopOpacity="0.88" />
                </linearGradient>
              </defs>

              {/* Soft Lavender Base Halo */}
              <ellipse cx="180" cy="210" rx="128" ry="22" fill="url(#nebGradSoft)" />

              {/* Back Cloud Silhouette */}
              <path
                d="M95 142C76 142 62 128 62 110C62 93 75 80 91 78C99 54 122 38 149 38C181 38 207 61 211 91C227 93 240 107 240 124C240 142 225 142 206 142H95Z"
                fill="url(#nebGradSoft)"
                opacity="0.85"
              />

              {/* Server Rack Stack Card */}
              <rect
                x="88"
                y="64"
                width="184"
                height="130"
                rx="22"
                fill="url(#nebGradGlass)"
                stroke="#C7D2FE"
                strokeWidth="2"
              />

              {/* Server Blade 1 */}
              <rect
                x="106"
                y="82"
                width="148"
                height="28"
                rx="9"
                fill="url(#nebGradPrimary)"
              />
              <circle cx="122" cy="96" r="4" fill="#34D399" />
              <circle cx="136" cy="96" r="4" fill="#A5B4FC" />
              <rect x="188" y="92" width="48" height="8" rx="4" fill="#FFFFFF" fillOpacity="0.45" />

              {/* Server Blade 2 */}
              <rect
                x="106"
                y="118"
                width="148"
                height="28"
                rx="9"
                fill="#EEF2FF"
                stroke="#C7D2FE"
                strokeWidth="1.5"
              />
              <circle cx="122" cy="132" r="4" fill="#10B981" />
              <circle cx="136" cy="132" r="4" fill="#6366F1" />
              <rect x="176" y="128" width="60" height="8" rx="4" fill="#818CF8" fillOpacity="0.45" />

              {/* Server Blade 3 */}
              <rect
                x="106"
                y="154"
                width="148"
                height="24"
                rx="8"
                fill="#F5F3FF"
                stroke="#DDD6FE"
                strokeWidth="1.5"
              />
              <circle cx="122" cy="166" r="3.5" fill="#10B981" />
              <rect x="160" y="162" width="76" height="7" rx="3.5" fill="#A78BFA" fillOpacity="0.4" />

              {/* Floating TLS Shield Badge (Top Right) */}
              <g className="animate-nebulix-float-delayed">
                <rect
                  x="244"
                  y="32"
                  width="86"
                  height="46"
                  rx="14"
                  fill="#FFFFFF"
                  stroke="#C7D2FE"
                  strokeWidth="1.5"
                />
                <circle cx="266" cy="55" r="11" fill="#ECFDF5" />
                <path
                  d="M262 55L265 58L271 52"
                  stroke="#059669"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <text
                  x="283"
                  y="52"
                  fill="#0F172A"
                  fontSize="9.5"
                  fontWeight="800"
                  fontFamily="Inter, sans-serif"
                >
                  TLS 1.3
                </text>
                <text
                  x="283"
                  y="64"
                  fill="#6366F1"
                  fontSize="8"
                  fontWeight="700"
                  fontFamily="Inter, sans-serif"
                >
                  AutoSSL
                </text>
              </g>

              {/* Floating NVMe Speed Badge (Bottom Left) */}
              <g className="animate-nebulix-float-delayed">
                <rect
                  x="30"
                  y="148"
                  width="92"
                  height="44"
                  rx="14"
                  fill="#FFFFFF"
                  stroke="#DDD6FE"
                  strokeWidth="1.5"
                />
                <circle cx="52" cy="170" r="10" fill="#EEF2FF" />
                <path
                  d="M52 164V170L56 173"
                  stroke="#4F46E5"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <text
                  x="68"
                  y="167"
                  fill="#0F172A"
                  fontSize="9.5"
                  fontWeight="800"
                  fontFamily="Inter, sans-serif"
                >
                  NVMe Gen4
                </text>
                <text
                  x="68"
                  y="179"
                  fill="#7C3AED"
                  fontSize="8"
                  fontWeight="700"
                  fontFamily="Inter, sans-serif"
                >
                  0.4ms IOPS
                </text>
              </g>
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
};
