import type { ComponentUsage } from '@/shared/lib/gear';
import { formatDate } from '@/shared/lib/formatters';
import { barPercent, STATUS_TEXT, usageText } from '../lib/gearText';

type ComponentRowProps = {
  usage: ComponentUsage;
  onEdit: () => void;
  onReplace: () => void;
};

const BAR_COLOR = {
  ok: 'bg-series-1',
  soon: 'bg-status-warning',
  due: 'bg-status-critical',
  untracked: 'bg-ink-3',
} as const;

const STATUS_ICON = { ok: '✓', soon: '▲', due: '✕', untracked: '•' } as const;

/** One component: its wear against its interval as a bar and in words, with Replace and Edit. */
export const ComponentRow = ({ usage, onEdit, onReplace }: ComponentRowProps) => {
  const { component, status } = usage;

  return (
    <li className="py-2.5">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-medium text-ink">{component.name}</span>
        <span className="text-xs text-ink-3">fitted {formatDate(component.installedOn)}</span>
        <span className="ml-auto flex gap-3 text-xs">
          <button type="button" onClick={onReplace} className="text-ink-2 hover:text-ink hover:underline">
            Replace
          </button>
          <button type="button" onClick={onEdit} className="text-ink-2 hover:text-ink hover:underline">
            Edit
          </button>
        </span>
      </div>
      <div className="mt-1 flex items-center gap-3">
        <div className="h-2 flex-1 rounded-full bg-surface-0" aria-hidden>
          <div
            className={`h-full rounded-full ${BAR_COLOR[status]}`}
            style={{ width: `${barPercent(usage.fraction)}%` }}
          />
        </div>
        <span className="w-24 shrink-0 text-right text-xs font-medium text-ink">
          <span aria-hidden className="mr-1">
            {STATUS_ICON[status]}
          </span>
          {STATUS_TEXT[status]}
          {usage.fraction !== null && ` · ${Math.round(usage.fraction * 100)}%`}
        </span>
      </div>
      <p className="mt-0.5 text-xs tabular-nums text-ink-3">{usageText(usage)}</p>
    </li>
  );
};
