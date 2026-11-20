import { createInterface } from 'node:readline/promises';
import { parseArgs } from 'node:util';
import { setTimeout as sleep } from 'node:timers/promises';
import { createGarminCheckStore, createIndexStore, createQuarantineStore, type ActivityId } from '@app/shared';
import { describeRebuild, rebuild } from '../rebuild/rebuild.js';
import { createClientFromConfig, loadConfig } from '../setup.js';
import { checkRange, findDeleted } from '../sync/checkDeleted.js';
import { assertIsoDate, localToday } from '../sync/dates.js';
import { acquireSyncLock } from '../sync/lock.js';

const USAGE = `Usage: npm run check-deleted [-- --since YYYY-MM-DD] [--quarantine [--yes]]

Lists your activities in Garmin Connect (list requests only, paced for the rate limits) and
reports the ones cached here that Garmin no longer has. The result shows in the app.

  --since       Only check activities from this date (default: all of them).
  --quarantine  Move the missing activities' raw and FIT files to data/quarantine/ and rebuild.
                Asks first; nothing is deleted, so moving the files back undoes it.
  --yes         Don't ask (for non-interactive use).`;

/** More than this share missing looks like a Garmin or network problem, not deletions. */
const MAX_MISSING_SHARE = 0.2;

async function confirm(question: string): Promise<boolean> {
  if (!process.stdin.isTTY) return false;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return /^y(es)?$/i.test((await rl.question(question)).trim());
  } finally {
    rl.close();
  }
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      since: { type: 'string' },
      quarantine: { type: 'boolean', default: false },
      yes: { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
  });
  if (values.help) {
    console.log(USAGE);
    return;
  }
  try {
    const config = loadConfig();
    const release = await acquireSyncLock(config.dataDir);
    try {
      const local = (await createIndexStore(config.dataDir).read()).activities.map((a) => ({
        id: a.id,
        date: a.date,
        name: a.name,
      }));
      const today = localToday();
      const range = values.since ? { from: assertIsoDate(values.since), to: today } : checkRange(local, today);
      if (!range) {
        console.log('No activities cached yet; nothing to check.');
        return;
      }
      console.log(`Listing Garmin activities ${range.from} .. ${range.to} (list requests only)…`);
      const { missing, listed } = await findDeleted(
        { client: createClientFromConfig(config), log: (m) => console.log(m), pause: () => sleep(500) },
        local,
        range,
      );
      const inRange = local.filter((a) => a.date >= range.from && a.date <= range.to).length;

      const checks = createGarminCheckStore(config.dataDir);
      const previous = await checks.read();
      const result = { ...previous, checkedAt: new Date().toISOString(), from: range.from, to: range.to, missing };
      await checks.write(result);

      console.log(`Garmin lists ${listed} activities; ${inRange} cached here in that range.`);
      if (missing.length === 0) {
        console.log('Nothing missing: every cached activity is still in Garmin Connect.');
        return;
      }
      console.log(
        `${missing.length} cached ${missing.length === 1 ? 'activity is' : 'activities are'} no longer listed by Garmin:`,
      );
      for (const a of missing) console.log(`  ${a.date}  ${a.id}  ${a.name}`);

      if (!values.quarantine) {
        console.log('They are flagged in the app. To remove them: npm run check-deleted -- --quarantine');
        return;
      }
      if (listed === 0 || missing.length > inRange * MAX_MISSING_SHARE) {
        console.error(
          `Not quarantining: ${listed === 0 ? 'Garmin listed nothing' : `${missing.length} of ${inRange} missing`} looks like a Garmin or network problem. Try again later.`,
        );
        process.exitCode = 1;
        return;
      }
      const ok =
        values.yes ||
        (await confirm(
          `Move ${missing.length} ${missing.length === 1 ? 'activity' : 'activities'} to data/quarantine/ and rebuild? [y/N] `,
        ));
      if (!ok) {
        console.log(
          process.stdin.isTTY ? 'Left as they are.' : 'Not a terminal: add --yes to quarantine without asking.',
        );
        return;
      }
      const store = createQuarantineStore(config.dataDir);
      for (const a of missing) {
        const moved = await store.move(a.id as ActivityId);
        console.log(`  ${a.id}: moved ${moved.join(', ') || 'nothing (already gone)'}`);
      }
      await checks.write({
        ...result,
        missing: [],
        quarantined: [...new Set([...previous.quarantined, ...missing.map((a) => a.id)])],
      });
      const rebuilt = await rebuild(config.dataDir, (m) => console.log(m), { mode: 'incremental' });
      console.log(describeRebuild(rebuilt));
      console.log(
        `Done. To restore one, move its files from data/quarantine/<id>/ back to raw/ and fit/, then npm run rebuild.`,
      );
    } finally {
      await release();
    }
  } catch (err) {
    // Messages from the Garmin client are built to be secret-free.
    console.error(`Check failed: ${err instanceof Error ? err.message : String(err)}`);
    process.exitCode = 1;
  }
}

void main();
