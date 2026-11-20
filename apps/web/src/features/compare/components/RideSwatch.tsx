import { COMPARE_SLOTS } from '../constants';
import type { RideSlot } from '../search';

type RideSwatchProps = {
  slot: RideSlot;
};

/** The small colour square of ride A or B, matching its chart lines. */
export const RideSwatch = ({ slot }: RideSwatchProps) => (
  <span
    aria-hidden
    className="inline-block size-2.5 rounded-sm"
    style={{ background: `var(${COMPARE_SLOTS[slot]})` }}
  />
);
