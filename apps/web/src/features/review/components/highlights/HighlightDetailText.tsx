import { Link } from '@tanstack/react-router';
import type { HighlightDetail } from '../../lib/highlights';

type HighlightDetailTextProps = {
  detail: HighlightDetail;
};

const LINK_CLASS = 'hover:text-ink hover:underline';

/** A highlight's detail line: text, or a link to the ride, activity or climb it refers to. */
export const HighlightDetailText = ({ detail }: HighlightDetailTextProps) => {
  switch (detail.kind) {
    case 'text':
      return <>{detail.text}</>;

    case 'ride':
      if (!detail.entry.id) return <>{detail.text}</>;
      return (
        <Link to="/activities/$activityId" params={{ activityId: detail.entry.id }} className={LINK_CLASS}>
          {detail.text}
        </Link>
      );

    case 'activity':
      return (
        <Link to="/activities/$activityId" params={{ activityId: detail.activityId }} className={LINK_CLASS}>
          {detail.text}
        </Link>
      );

    case 'climb':
      return (
        <>
          {detail.prefix}
          <Link to="/climbs/$climbId" params={{ climbId: detail.climbId }} className={LINK_CLASS}>
            {detail.text}
          </Link>
        </>
      );
  }
};
