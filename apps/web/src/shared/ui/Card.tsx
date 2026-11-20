import type { ReactNode } from 'react';

type CardProps = {
  title?: ReactNode;
  /** Controls on the right of the title, e.g. a toggle. */
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

/** The app's dashboard card: a bordered surface with an optional title row. */
export const Card = ({ title, action, children, className = '' }: CardProps) => {
  const hasHeader = Boolean(title) || Boolean(action);

  return (
    <section className={`rounded-xl border border-line bg-surface-1 p-4 sm:p-5 ${className}`}>
      {hasHeader && (
        <header className="mb-3 flex items-center justify-between gap-3">
          {title && <h2 className="text-sm font-semibold text-ink">{title}</h2>}
          {action}
        </header>
      )}
      {children}
    </section>
  );
};
