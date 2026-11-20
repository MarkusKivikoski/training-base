import yauzl from 'yauzl';
import { FitExtractError } from './errors.js';

/** FIT files carry the ASCII signature ".FIT" at bytes 8-11 of the file header. */
export function isFit(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 12 &&
    bytes[8] === 0x2e && // .
    bytes[9] === 0x46 && // F
    bytes[10] === 0x49 && // I
    bytes[11] === 0x54 // T
  );
}

/** Generous upper bound for a single activity FIT file. Guards against zip bombs. */
const MAX_FIT_BYTES = 256 * 1024 * 1024;

/**
 * Returns the FIT file from a Garmin activity download. Garmin sends a ZIP containing
 * the FIT file. A bare FIT is accepted as-is in case the format changes.
 * The returned bytes are exactly the archived file, unmodified.
 */
export async function extractFit(download: Uint8Array): Promise<Uint8Array> {
  if (isFit(download)) return download;

  const entries = await readZip(download, (name) => name.toLowerCase().endsWith('.fit'));
  if (entries.length === 0) throw new FitExtractError('Download contains no .fit file');
  if (entries.length > 1) {
    throw new FitExtractError(`Download contains ${entries.length} .fit files; expected exactly one`);
  }
  const fit = entries[0]!.data;
  if (!isFit(fit)) throw new FitExtractError('Archived .fit file has no valid FIT header');
  return fit;
}

/** Lists the file names in a ZIP (used by the probe). */
export async function listZipEntries(zip: Uint8Array): Promise<string[]> {
  const names: string[] = [];
  await readZip(zip, (name) => {
    names.push(name);
    return false;
  });
  return names;
}

interface ZipEntry {
  name: string;
  data: Uint8Array;
}

/** Reads the file entries that `shouldRead` selects. Directories are skipped. */
function readZip(zip: Uint8Array, shouldRead: (name: string) => boolean): Promise<ZipEntry[]> {
  return new Promise((resolve, reject) => {
    const fail = (err: unknown) =>
      reject(err instanceof FitExtractError ? err : new FitExtractError(`Invalid ZIP: ${(err as Error).message}`));

    yauzl.fromBuffer(Buffer.from(zip), { lazyEntries: true }, (openErr, zipfile) => {
      if (openErr || !zipfile) return fail(openErr ?? new Error('could not open archive'));
      const out: ZipEntry[] = [];
      zipfile.on('error', fail);
      zipfile.on('end', () => resolve(out));
      zipfile.on('entry', (entry: yauzl.Entry) => {
        if (entry.fileName.endsWith('/') || !shouldRead(entry.fileName)) {
          zipfile.readEntry();
          return;
        }
        if (entry.uncompressedSize > MAX_FIT_BYTES) {
          return fail(new FitExtractError(`${entry.fileName} is too large (${entry.uncompressedSize} bytes)`));
        }
        zipfile.openReadStream(entry, (streamErr, stream) => {
          if (streamErr || !stream) return fail(streamErr ?? new Error('could not read entry'));
          const chunks: Buffer[] = [];
          stream.on('data', (c: Buffer) => chunks.push(c));
          stream.on('error', fail);
          stream.on('end', () => {
            out.push({ name: entry.fileName, data: new Uint8Array(Buffer.concat(chunks)) });
            zipfile.readEntry();
          });
        });
      });
      zipfile.readEntry();
    });
  });
}
