import { Outlet } from '@tanstack/react-router';
import { ThresholdUpdatePrompt } from '@/features/threshold-update/components/ThresholdUpdatePrompt';
import { NavLinks } from './components/NavLinks';
import { SyncButton } from './components/SyncButton';
import { ThemeToggle } from './components/ThemeToggle';

/** The app shell: a sidebar on desktop, a header with scrollable nav below `md`, and the page. */
export const Layout = () => (
  <div className="min-h-dvh md:flex">
    <aside className="hidden w-56 shrink-0 flex-col border-r border-line bg-surface-1 p-4 md:sticky md:top-0 md:flex md:h-dvh">
      <p className="mb-6 px-3 text-base font-bold tracking-tight">Training Base</p>
      <nav aria-label="Main" className="flex flex-col gap-1">
        <NavLinks orientation="vertical" />
      </nav>
      <div className="mt-auto space-y-3 pt-4">
        <ThemeToggle />
        <SyncButton />
      </div>
    </aside>

    <header className="sticky top-0 z-10 border-b border-line bg-surface-1 md:hidden">
      <div className="flex items-center justify-between gap-3 px-4 pt-3">
        <p className="text-base font-bold tracking-tight">Training Base</p>
        <div className="flex items-center gap-2">
          <ThemeToggle compact />
          <SyncButton compact />
        </div>
      </div>
      <nav aria-label="Main" className="flex gap-1 overflow-x-auto px-2 py-2">
        <NavLinks orientation="horizontal" />
      </nav>
    </header>

    <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
      <Outlet />
    </main>

    {/* Asks to update the FTP or LTHR when a synced ride beats it; can open on any page. */}
    <ThresholdUpdatePrompt />
  </div>
);
