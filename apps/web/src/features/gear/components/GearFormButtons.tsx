/** Shared look of the gear forms' inputs. */
export const GEAR_FIELD_CLASS = 'rounded-lg border border-line bg-surface-1 px-2 py-1.5 text-sm text-ink';

type GearFormButtonsProps = {
  isEditing: boolean;
  canSave: boolean;
  isBusy: boolean;
  saveLabel: string;
  onDelete: () => void;
  onClose: () => void;
};

/** Delete (when editing), Cancel and the submit button at the bottom of a gear form. */
export const GearFormButtons = ({ isEditing, canSave, isBusy, saveLabel, onDelete, onClose }: GearFormButtonsProps) => (
  <div className="mt-5 flex flex-wrap items-center gap-2">
    {isEditing && (
      <button
        type="button"
        disabled={isBusy}
        onClick={onDelete}
        className="mr-auto text-sm text-ink-2 hover:text-status-critical hover:underline"
      >
        Delete
      </button>
    )}
    <button
      type="button"
      onClick={onClose}
      className="ml-auto rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-ink hover:bg-surface-0"
    >
      Cancel
    </button>
    <button
      type="submit"
      disabled={!canSave || isBusy}
      className="rounded-lg bg-ink px-3 py-1.5 text-sm font-medium text-surface-1 disabled:opacity-50"
    >
      {saveLabel}
    </button>
  </div>
);
