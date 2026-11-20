import { useState } from 'react';
import type { ClimbDetail } from '@/shared/api/client';
import { climbTitle } from '@/shared/lib/climbs';
import { ClimbNameForm } from './ClimbNameForm';

type ClimbNameProps = {
  climb: ClimbDetail;
};

/** The climb's name as the page heading, with a button to name or rename it. */
export const ClimbName = ({ climb }: ClimbNameProps) => {
  const [isEditing, setIsEditing] = useState(false);

  // The form starts from the current name each time it opens.
  if (isEditing) return <ClimbNameForm climb={climb} onDone={() => setIsEditing(false)} />;

  return (
    <div className="mt-1 flex flex-wrap items-baseline gap-3">
      <h1 className="text-2xl font-bold tracking-tight">{climbTitle(climb)}</h1>
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        className="text-xs text-ink-2 hover:text-ink hover:underline"
      >
        {climb.name ? 'Rename' : 'Name this climb'}
      </button>
    </div>
  );
};
