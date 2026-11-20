import { readFile } from 'node:fs/promises';
import type { z } from 'zod';
import { atomicWrite } from './atomicWrite.js';

/**
 * Reads and validates a JSON cache file. Returns `fallback` when the file is missing.
 * Throws a message naming the file (never its contents) when it is invalid.
 */
export async function readJsonFile<S extends z.ZodType>(
  file: string,
  schema: S,
  fallback: () => z.infer<S>,
): Promise<z.infer<S>> {
  let text: string;
  try {
    text = await readFile(file, 'utf8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return fallback();
    throw err;
  }
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`${file} is not valid JSON`);
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    const where = parsed.error.issues
      .slice(0, 3)
      .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('; ');
    throw new Error(`${file} failed validation (${where})`);
  }
  return parsed.data;
}

export function writeJsonFile(file: string, value: unknown): Promise<void> {
  return atomicWrite(file, `${JSON.stringify(value, null, 2)}\n`);
}
