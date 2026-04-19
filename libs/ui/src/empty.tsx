import * as React from 'react';
import { cn } from './cn';

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-dashed border-stone-300 bg-white p-12 text-center',
        className,
      )}
    >
      <h3 className="text-base font-semibold text-stone-800">{title}</h3>
      {description && <p className="mt-2 max-w-sm text-sm text-stone-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
