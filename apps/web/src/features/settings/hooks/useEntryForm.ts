import { useState, type FormEvent } from 'react';
import { useSaveSetting } from '@/shared/api/settings';
import type { SettingKind } from '../constants';
import { parseSettingValue, saveInput, type SettingEntry } from '../lib/settingEntries';

/** The add/replace form of one setting's history. `edit` fills it from an existing entry. */
export const useEntryForm = (kind: SettingKind, today: string) => {
  const save = useSaveSetting();
  const [from, setFrom] = useState(today);
  const [valueText, setValueText] = useState('');
  const [note, setNote] = useState('');
  const [isEstimated, setIsEstimated] = useState(false);

  const value = parseSettingValue(valueText, kind);
  const isValid = value !== null && from <= today;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (value === null || !isValid) return;
    save.mutate(saveInput(kind, { from, value, note, isEstimated }), {
      onSuccess: () => {
        setValueText('');
        setNote('');
      },
    });
  };

  const edit = (entry: SettingEntry) => {
    setFrom(entry.from);
    setValueText(String(entry.value));
    setNote(entry.note ?? '');
    setIsEstimated(entry.source === 'estimated');
  };

  return {
    from,
    setFrom,
    valueText,
    setValueText,
    note,
    setNote,
    isEstimated,
    setIsEstimated,
    isValid,
    isSaving: save.isPending,
    saveError: save.error,
    submit,
    edit,
  };
};

export type EntryFormState = ReturnType<typeof useEntryForm>;
