import { parseArgs } from 'node:util';
import { describeRebuild, rebuild } from '../rebuild/rebuild.js';
import { loadConfig } from '../setup.js';

async function main(): Promise<void> {
  const { values } = parseArgs({ options: { incremental: { type: 'boolean', default: false } } });
  const config = loadConfig();
  const mode = values.incremental ? 'incremental' : 'full';
  console.log(`Rebuilding derived data in ${config.dataDir} (${mode})`);
  const result = await rebuild(config.dataDir, (m) => console.log(m), { mode });
  console.log(describeRebuild(result));
  if (result.failed.length > 0) process.exitCode = 1;
}

main().catch((err: unknown) => {
  console.error(`Rebuild failed: ${err instanceof Error ? err.message : String(err)}`);
  process.exitCode = 1;
});
