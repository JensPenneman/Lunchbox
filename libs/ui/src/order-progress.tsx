import * as React from 'react';
import { cn } from './cn';

const STEPS = [
  { key: 'PENDING_PAYMENT', label: 'Awaiting payment' },
  { key: 'PAID', label: 'Paid' },
  { key: 'ACCEPTED', label: 'Accepted by shop' },
  { key: 'PREPARING', label: 'Preparing' },
  { key: 'READY', label: 'Ready for pickup' },
  { key: 'FULFILLED', label: 'Picked up' },
] as const;

type StepKey = (typeof STEPS)[number]['key'];

export function OrderProgress({
  status,
  className,
}: {
  status: StepKey | 'CANCELLED';
  className?: string;
}) {
  if (status === 'CANCELLED') {
    return (
      <div
        className={cn('rounded-md bg-red-50 p-3 text-sm text-red-800', className)}
      >
        This order was cancelled.
      </div>
    );
  }
  const currentIdx = STEPS.findIndex((s) => s.key === status);

  return (
    <ol className={cn('flex flex-col gap-3', className)}>
      {STEPS.map((step, idx) => {
        const state =
          idx < currentIdx ? 'done' : idx === currentIdx ? 'current' : 'pending';
        return (
          <li key={step.key} className="flex items-center gap-3">
            <span
              className={cn(
                'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                state === 'done' && 'bg-emerald-500 text-white',
                state === 'current' && 'bg-amber-500 text-white ring-4 ring-amber-200',
                state === 'pending' && 'bg-stone-200 text-stone-500',
              )}
            >
              {state === 'done' ? '✓' : idx + 1}
            </span>
            <span
              className={cn(
                'text-sm',
                state === 'done' && 'text-stone-500 line-through',
                state === 'current' && 'font-medium text-stone-900',
                state === 'pending' && 'text-stone-400',
              )}
            >
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
