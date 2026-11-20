import { Card } from '@/shared/ui/Card';

/** Shown for any URL that doesn't match a page. */
export const NotFoundPage = () => (
  <div className="mx-auto max-w-3xl">
    <h1 className="mb-4 text-2xl font-bold tracking-tight">Not found</h1>
    <Card>
      <p className="text-sm text-ink-2">This page doesn’t exist.</p>
    </Card>
  </div>
);
