import { useState } from 'react';
import { RepeatNameForm } from './RepeatNameForm';

type RepeatNameProps = {
  /** The workout's or route's id. */
  groupId: string;
  name: string | null;
  /** What to show: the name, or a label built from the workout's or route's shape. */
  title: string;
  noun: 'workout' | 'route';
};

/** The name of a workout or a route, or a label from its shape, with a button to name or rename it. */
export const RepeatName = ({ groupId, name, title, noun }: RepeatNameProps) => {
  const [isEditing, setIsEditing] = useState(false);

  // The form starts from the current name each time it opens.
  if (isEditing) {
    return (
      <RepeatNameForm
        groupId={groupId}
        name={name}
        placeholder={title}
        noun={noun}
        onDone={() => setIsEditing(false)}
      />
    );
  }

  return (
    <div className="flex flex-wrap items-baseline gap-3">
      <p className="text-base font-semibold">{title}</p>
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        className="text-xs text-ink-2 hover:text-ink hover:underline"
      >
        {name ? 'Rename' : `Name this ${noun}`}
      </button>
    </div>
  );
};
