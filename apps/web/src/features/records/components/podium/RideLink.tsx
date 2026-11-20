import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { formatDate } from '@/shared/lib/formatters';
import type { RecordEntry } from '../../types';

type RideLinkProps = {
  entry: RecordEntry;
  /** Link text; the ride's date when left out. */
  children?: ReactNode;
};

/** A link to the record's ride (plain text when the record has no ride). */
export const RideLink = ({ entry, children }: RideLinkProps) => {
  const text = children ?? formatDate(entry.date);
  if (!entry.id) return <span>{text}</span>;

  return (
    <Link
      to="/activities/$activityId"
      params={{ activityId: entry.id }}
      className="hover:text-ink hover:underline"
      title={entry.name}
    >
      {text}
    </Link>
  );
};
