import { useSettings } from '@/shared/api/settings';
import { useSyncStatus } from '@/shared/api/sync';
import { ErrorMessage } from '@/shared/ui/ErrorMessage';
import { Loading } from '@/shared/ui/Loading';
import { HistoryCard } from './components/history/HistoryCard';
import { PlanPresetsCard } from './components/PlanPresetsCard';
import { PrivacyCard } from './components/PrivacyCard';
import { SETTING_KINDS } from './constants';
import { rebuildStatusText, settingEntries } from './lib/settingEntries';

/** FTP, LTHR and weight histories and the heatmap privacy trim, edited in place of `npm run settings`. */
export const SettingsPage = () => {
  const settings = useSettings();
  const sync = useSyncStatus();

  if (settings.isPending) return <Loading />;
  if (settings.error) return <ErrorMessage error={settings.error} />;

  const job = sync.data;
  const rebuildFailed = job?.state === 'failed' && job.kind === 'rebuild';

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-ink-2">
          Changes are saved to <code>data/settings/</code> and your stats are recomputed in the background, which takes
          a few seconds.{' '}
          <span role="status" className="font-medium text-ink">
            {rebuildStatusText(job)}
          </span>
          {rebuildFailed && <span className="block text-status-critical">{job.error?.message}</span>}
        </p>
      </div>
      {SETTING_KINDS.map((kind) => (
        <HistoryCard key={kind} kind={kind} entries={settingEntries(settings.data, kind)} today={settings.data.today} />
      ))}
      <PlanPresetsCard />
      <PrivacyCard metres={settings.data.privacyTrimM} />
    </div>
  );
};
