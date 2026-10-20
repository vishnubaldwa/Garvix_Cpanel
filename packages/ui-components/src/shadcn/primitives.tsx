import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils.js';

/* ==========================================================================
   1. shadcn/ui Button
   ========================================================================== */
export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/60 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.99]',
  {
    variants: {
      variant: {
        default: 'bg-slate-900 text-white shadow-sm hover:bg-slate-800',
        orange: 'bg-gradient-to-r from-[#ff6c2c] to-orange-600 text-white shadow-md shadow-orange-500/20 hover:from-[#f05a18] hover:to-orange-700',
        blue: 'bg-blue-600 text-white shadow-md shadow-blue-600/20 hover:bg-blue-700',
        emerald: 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700',
        destructive: 'bg-red-600 text-white shadow-sm hover:bg-red-700',
        outline: 'border border-slate-200 bg-white text-slate-800 shadow-sm hover:bg-slate-50 hover:text-slate-950 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-100 dark:hover:bg-slate-800',
        secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700',
        ghost: 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-white',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-11 rounded-xl px-6 text-base',
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
   2. shadcn/ui Card Primitives
   ========================================================================== */
export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-2xl border border-slate-200/80 bg-white text-slate-950 shadow-sm transition-all duration-200 dark:border-slate-800/80 dark:bg-slate-900/90 dark:text-slate-50',
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

export const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn('text-base font-bold leading-none tracking-tight', className)}
      {...props}
    />
  )
);
CardTitle.displayName = 'CardTitle';

export const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('text-xs text-slate-500 dark:text-slate-400', className)} {...props} />
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
   3. shadcn/ui Badge
   ========================================================================== */
export const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-slate-900 text-slate-50 dark:bg-slate-100 dark:text-slate-900',
        secondary: 'border-transparent bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
        success: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
        warning: 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400',
        destructive: 'border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-400',
        orange: 'border-orange-500/25 bg-orange-500/10 text-[#ff6c2c]',
        blue: 'border-blue-500/25 bg-blue-500/10 text-blue-600 dark:text-blue-400',
        outline: 'border-slate-300 text-slate-700 dark:border-slate-700 dark:text-slate-300',
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
   4. shadcn/ui Input
   ========================================================================== */
export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type = 'text', ...props }, ref) => (
  <input
    type={type}
    ref={ref}
    className={cn(
      'flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus-visible:border-orange-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100',
      className
    )}
    {...props}
  />
));
Input.displayName = 'Input';

/* ==========================================================================
   5. shadcn/ui Progress & Separator
   ========================================================================== */
export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  indicatorClassName?: string;
}

export function Progress({ value, className, indicatorClassName, ...props }: ProgressProps) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      className={cn(
        'relative h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800',
        className
      )}
      {...props}
    >
      <div
        className={cn(
          'h-full rounded-full bg-gradient-to-r from-[#ff6c2c] to-orange-500 transition-all duration-500 ease-out',
          indicatorClassName
        )}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

export function Separator({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('h-[1px] w-full shrink-0 bg-slate-200 dark:bg-slate-800', className)}
      {...props}
    />
  );
}

/* ==========================================================================
   6. shadcn/ui DialogModal
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={cn(
          'relative w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900',
          maxWidthClass
        )}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
          aria-label="Close modal"
        >
          ✕
        </button>
        {title && (
          <div className="mb-4">
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">{title}</h2>
            {description && (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{description}</p>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
