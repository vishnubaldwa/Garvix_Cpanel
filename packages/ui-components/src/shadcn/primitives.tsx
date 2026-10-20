import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils.js';

/* ==========================================================================
   1. shadcn/ui Button (Nebulix Light-Theme Design System)
   ========================================================================== */
export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-xs font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.99]',
  {
    variants: {
      variant: {
        default:
          'bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 text-white shadow-[0_10px_24px_-6px_rgba(79,70,229,0.5)] hover:-translate-y-0.5 hover:shadow-[0_14px_28px_-6px_rgba(79,70,229,0.65)]',
        nebulix:
          'bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 text-white shadow-[0_10px_24px_-6px_rgba(79,70,229,0.5)] hover:-translate-y-0.5 hover:shadow-[0_14px_28px_-6px_rgba(79,70,229,0.65)]',
        orange:
          'bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 text-white shadow-[0_10px_24px_-6px_rgba(79,70,229,0.5)] hover:-translate-y-0.5 hover:shadow-[0_14px_28px_-6px_rgba(79,70,229,0.65)]',
        blue: 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-[0_8px_20px_-6px_rgba(37,99,235,0.45)] hover:-translate-y-0.5',
        emerald:
          'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-[0_8px_20px_-6px_rgba(16,185,129,0.45)] hover:-translate-y-0.5',
        destructive: 'bg-red-600 text-white shadow-sm hover:bg-red-700',
        outline:
          'border border-indigo-200/90 bg-white text-indigo-950 shadow-2xs hover:border-indigo-300 hover:bg-indigo-50/60',
        secondary:
          'bg-indigo-50/90 text-indigo-800 border border-indigo-100 hover:bg-indigo-100/80',
        ghost: 'text-slate-600 hover:bg-indigo-50/80 hover:text-indigo-950',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 rounded-xl px-3 text-xs',
        lg: 'h-11 rounded-2xl px-6 text-sm',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
);
Button.displayName = 'Button';

/* ==========================================================================
   2. shadcn/ui Card Primitives (Nebulix Light Theme)
   ========================================================================== */
export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-2xl border border-indigo-100/90 bg-white text-slate-900 shadow-[0_10px_30px_-12px_rgba(99,102,241,0.12)] transition-all duration-200',
        className
      )}
      {...props}
    />
  )
);
Card.displayName = 'Card';

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col space-y-1.5 p-5', className)} {...props} />
  )
);
CardHeader.displayName = 'CardHeader';

export const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      'font-display text-base font-extrabold leading-none tracking-tight text-slate-900',
      className
    )}
    {...props}
  />
));
CardTitle.displayName = 'CardTitle';

export const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('text-xs text-slate-500', className)} {...props} />
));
CardDescription.displayName = 'CardDescription';

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-5 pt-0', className)} {...props} />
  )
);
CardContent.displayName = 'CardContent';

export const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex items-center p-5 pt-0', className)} {...props} />
  )
);
CardFooter.displayName = 'CardFooter';

/* ==========================================================================
   3. shadcn/ui Badge (Nebulix Light Theme)
   ========================================================================== */
export const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold transition-colors',
  {
    variants: {
      variant: {
        default: 'border-indigo-200/80 bg-indigo-50 text-indigo-700',
        secondary: 'border-slate-200 bg-slate-100 text-slate-700',
        success: 'border-emerald-200/90 bg-emerald-50 text-emerald-700',
        warning: 'border-amber-200/90 bg-amber-50 text-amber-800',
        destructive: 'border-red-200 bg-red-50 text-red-700',
        orange: 'border-violet-200/90 bg-violet-50 text-violet-700',
        blue: 'border-blue-200/90 bg-blue-50 text-blue-700',
        outline: 'border-indigo-200 text-indigo-800 bg-white',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

/* ==========================================================================
   4. shadcn/ui Input (Nebulix Light Theme)
   ========================================================================== */
export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type = 'text', ...props }, ref) => (
  <input
    type={type}
    ref={ref}
    className={cn(
      'flex h-10 w-full rounded-xl border border-indigo-100 bg-[#FAF9FE] px-3.5 py-2 text-sm text-slate-900 shadow-2xs transition-colors placeholder:text-slate-400 focus-visible:border-indigo-400 focus-visible:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-50',
      className
    )}
    {...props}
  />
));
Input.displayName = 'Input';

/* ==========================================================================
   5. shadcn/ui Progress & Separator (Nebulix Light Theme)
   ========================================================================== */
export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  indicatorClassName?: string;
}

export function Progress({ value, className, indicatorClassName, ...props }: ProgressProps) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      className={cn('relative h-2 w-full overflow-hidden rounded-full bg-indigo-100/80', className)}
      {...props}
    >
      <div
        className={cn(
          'h-full rounded-full bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 transition-all duration-500 ease-out',
          indicatorClassName
        )}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

export function Separator({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('h-[1px] w-full shrink-0 bg-indigo-100/80', className)} {...props} />
  );
}

/* ==========================================================================
   6. shadcn/ui DialogModal (Nebulix Light Theme)
   ========================================================================== */
export interface DialogModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  maxWidthClass?: string;
}

export function DialogModal({
  open,
  onClose,
  title,
  description,
  children,
  maxWidthClass = 'max-w-xl',
}: DialogModalProps) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={cn(
          'relative w-full rounded-3xl border border-indigo-100 bg-white p-6 text-slate-900 shadow-[0_25px_70px_-15px_rgba(79,70,229,0.28)]',
          maxWidthClass
        )}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
          aria-label="Close modal"
        >
          ✕
        </button>
        {title && (
          <div className="mb-4">
            <h2 className="font-display text-lg font-extrabold text-slate-900">{title}</h2>
            {description && <p className="mt-1 text-xs text-slate-500">{description}</p>}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
