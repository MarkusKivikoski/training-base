import { formatDate } from '@/shared/lib/formatters';
import type { SettingKind } from '../../constants';

type SettingRuleProps = {
  kind: SettingKind;
  /** Date of the earliest entry, if any. */
  firstFrom: string | null;
};

/** How the setting is used, and how rides before the first entry are treated. */
export const SettingRule = ({ kind, firstFrom }: SettingRuleProps) => {
  const firstEntry = firstFrom ? formatDate(firstFrom) : 'your first entry';

  if (kind === 'ftp') {
    return (
      <>
        Used for IF, TSS and training load from each entry's date until the next one. Rides before {firstEntry} get no
        TSS: an FTP is never back-dated. Time in zones does use the earliest entry for older rides.
      </>
    );
  }
  if (kind === 'lthr') {
    return (
      <>
        Used for heart-rate TSS (rides without power) and heart-rate zones. Like FTP it is never back-dated for TSS:
        activities before {firstEntry} get no heart-rate load. <code>npm run estimate-lthr</code> can suggest a value
        from a hard ride.
      </>
    );
  }
  return (
    <>
      Used for W/kg and the VO₂ max estimate, with the weight in effect on each ride's date. The earliest entry also
      applies before it.
    </>
  );
};
