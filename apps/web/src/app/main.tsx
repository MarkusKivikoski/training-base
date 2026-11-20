import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { router } from './router';
import './styles.css';

/** Data only changes after a sync, so a short stale time is plenty. */
const STALE_TIME_MS = 30_000;

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: STALE_TIME_MS } } });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
