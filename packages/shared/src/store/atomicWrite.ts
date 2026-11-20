import { randomBytes } from 'node:crypto';
import { mkdir, open, rename, rm } from 'node:fs/promises';
import path from 'node:path';

const RENAME_RETRIES = 5;

/**
 * Writes a file atomically: write a sibling temp file, fsync it, then rename it over
 * the target. Readers see either the old file or the new one, never a partial write.
 */
export async function atomicWrite(file: string, data: string | Uint8Array): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp-${process.pid}-${randomBytes(4).toString('hex')}`;
  try {
    const fh = await open(tmp, 'w');
    try {
      await fh.writeFile(data);
      await fh.sync();
    } finally {
      await fh.close();
    }
    await renameWithRetry(tmp, file);
  } catch (err) {
    await rm(tmp, { force: true });
    throw err;
  }
}

// On Windows, rename can fail briefly with EPERM/EACCES/EBUSY while another process
// (antivirus, search indexer) holds the target open.
async function renameWithRetry(from: string, to: string): Promise<void> {
  for (let attempt = 0; ; attempt++) {
    try {
      await rename(from, to);
      return;
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      const transient = code === 'EPERM' || code === 'EACCES' || code === 'EBUSY';
      if (!transient || attempt >= RENAME_RETRIES) throw err;
      await new Promise((r) => setTimeout(r, 50 * 2 ** attempt));
    }
  }
}
