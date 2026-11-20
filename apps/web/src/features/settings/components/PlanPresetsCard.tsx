import { useEffect, useState, type FormEvent } from 'react';
import type { PlanPresets } from '@/shared/api/client';
import { usePlan, useSetPlanPresets } from '@/shared/api/plan';
import { INTENSITY_LABELS } from '@/shared/lib/plan';
import { Card } from '@/shared/ui/Card';
import { ErrorMessage } from '@/shared/ui/ErrorMessage';

const PRESET_KEYS = ['easy', 'medium', 'hard'] as const;
const MAX_TSS = 600;

type PresetTexts = Record<(typeof PRESET_KEYS)[number], string>;

const toTexts = (presets: PlanPresets): PresetTexts => ({
  easy: String(presets.easy),
  medium: String(presets.medium),
  hard: String(presets.hard),
});

/** The typed presets, or null if any isn't a whole number from 0 to 600. */
const parsePresets = (texts: PresetTexts): PlanPresets | null => {
  const values = PRESET_KEYS.map((key) => Number(texts[key]));
  const isValid = values.every((value, i) => texts[PRESET_KEYS[i]!].trim() !== '' && Number.isInteger(value));
  if (!isValid || values.some((value) => value < 0 || value > MAX_TSS)) return null;
  return { easy: values[0]!, medium: values[1]!, hard: values[2]! };
};

/** The TSS that Easy, Medium and Hard planned sessions count as in the forecast. */
export const PlanPresetsCard = () => {
  const plan = usePlan();
  const setPresets = useSetPlanPresets();
  const [texts, setTexts] = useState<PresetTexts | null>(null);

  // Start from the saved presets once they load.
  useEffect(() => {
    if (plan.data && texts === null) setTexts(toTexts(plan.data.presets));
  }, [plan.data, texts]);

  if (!plan.data || !texts) return null;

  const presets = parsePresets(texts);
  const saved = plan.data.presets;
  const isChanged = presets !== null && PRESET_KEYS.some((key) => presets[key] !== saved[key]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (presets && isChanged) setPresets.mutate(presets);
  };

  return (
    <Card title="Planned session presets">
      <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
        {PRESET_KEYS.map((key) => (
          <label key={key} className="flex flex-col gap-1 text-xs text-ink-2">
            {INTENSITY_LABELS[key]} (TSS)
            <input
              inputMode="numeric"
              value={texts[key]}
              onChange={(event) => setTexts({ ...texts, [key]: event.target.value })}
              aria-invalid={presets === null}
              className="w-20 rounded-lg border border-line bg-surface-1 px-2 py-1.5 text-sm tabular-nums text-ink"
            />
          </label>
        ))}
        <button
          type="submit"
          disabled={!isChanged || setPresets.isPending}
          className="rounded-lg bg-ink px-3 py-1.5 text-sm font-medium text-surface-1 disabled:opacity-50"
        >
          Save
        </button>
      </form>
      {setPresets.error && <ErrorMessage error={setPresets.error} />}
      <p className="mt-3 text-xs text-ink-3">
        Sessions you plan on the Calendar as Easy, Medium or Hard count as this much TSS in the Fitness &amp; form
        forecast. Changing a preset updates every session that uses it. For reference, an hour at FTP is 100 TSS.
      </p>
    </Card>
  );
};
