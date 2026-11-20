/** 754 -> "12:34", 3754 -> "1:02:34". For CLI output only. */
export function formatClockS(seconds: number): string {
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const mm = String(Math.floor((s % 3600) / 60)).padStart(h ? 2 : 1, '0');
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
