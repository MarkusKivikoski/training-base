import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { crc32 } from 'node:zlib';
import { Encoder, Profile, type Encodable, type FileIdMesg, type LapMesg, type RecordMesg } from '@garmin/fitsdk';
import { afterEach, beforeEach } from 'vitest';

/** A minimal fake FIT file: 14-byte header with the ".FIT" signature, then some payload. */
export function makeFit(payload = 'ride'): Uint8Array {
  const header = Buffer.from([14, 0x20, 0, 0, 0, 0, 0, 0, 0x2e, 0x46, 0x49, 0x54, 0, 0]);
  return new Uint8Array(Buffer.concat([header, Buffer.from(payload)]));
}

/** Builds an uncompressed (stored) ZIP archive in memory. */
export function makeZip(files: Record<string, Uint8Array | string>): Uint8Array {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const [name, content] of Object.entries(files)) {
    const data = Buffer.from(content);
    const nameBuf = Buffer.from(name);
    const crc = crc32(data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    locals.push(local, nameBuf, data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, nameBuf);

    offset += local.length + nameBuf.length + data.length;
  }
  const centralSize = centrals.reduce((n, b) => n + b.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(Object.keys(files).length, 8);
  end.writeUInt16LE(Object.keys(files).length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  return new Uint8Array(Buffer.concat([...locals, ...centrals, end]));
}

/** An unsigned JWT with the given payload. */
export function makeJwt(payload: Record<string, unknown>): string {
  const enc = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
  return `${enc({ alg: 'none', typ: 'JWT' })}.${enc(payload)}.sig`;
}

/** Gives each test a fresh temp directory and removes it afterwards. Call at module or describe level. */
export function useTempDir(): () => string {
  let dir: string | undefined;
  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'training-base-test-'));
  });
  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
  });
  return () => {
    if (!dir) throw new Error('useTempDir() directory is only available inside a test');
    return dir;
  };
}

/** Fake clock where sleep() advances time instantly. */
export function fakeClock(start = 1_700_000_000_000) {
  let t = start;
  const sleeps: number[] = [];
  return {
    now: () => t,
    sleep: async (ms: number) => {
      sleeps.push(ms);
      t += ms;
    },
    advance: (ms: number) => {
      t += ms;
    },
    sleeps,
  };
}

export const FIT_START = new Date('2026-11-01T07:00:00Z');
const DEG_TO_SEMICIRCLE = 2 ** 31 / 180;

export interface FitRec {
  offsetS: number;
  power?: number;
  heartRate?: number;
  cadence?: number;
  lat?: number;
  lng?: number;
  speed?: number;
  altitude?: number;
  /** Cumulative metres. */
  distance?: number;
}

/** Builds a real FIT file with the SDK's encoder. */
export function makeFitFile(
  records: FitRec[],
  laps: Array<{ offsetS: number; elapsedS: number; trigger?: string }> = [],
): Uint8Array {
  const enc = new Encoder();
  const fileId: Encodable<FileIdMesg> = {
    mesgNum: Profile.MesgNum['FILE_ID']!,
    type: 'activity',
    manufacturer: 'development',
    product: 0,
    timeCreated: FIT_START,
    serialNumber: 1234,
  };
  enc.writeMesg(fileId);
  for (const r of records) {
    const record: Encodable<RecordMesg> = {
      mesgNum: Profile.MesgNum['RECORD']!,
      timestamp: new Date(FIT_START.getTime() + r.offsetS * 1000),
      ...(r.power !== undefined ? { power: r.power } : {}),
      ...(r.heartRate !== undefined ? { heartRate: r.heartRate } : {}),
      ...(r.cadence !== undefined ? { cadence: r.cadence } : {}),
      ...(r.speed !== undefined ? { enhancedSpeed: r.speed } : {}),
      ...(r.altitude !== undefined ? { enhancedAltitude: r.altitude } : {}),
      ...(r.distance !== undefined ? { distance: r.distance } : {}),
      ...(r.lat !== undefined ? { positionLat: Math.round(r.lat * DEG_TO_SEMICIRCLE) } : {}),
      ...(r.lng !== undefined ? { positionLong: Math.round(r.lng * DEG_TO_SEMICIRCLE) } : {}),
    };
    enc.writeMesg(record);
  }
  for (const l of laps) {
    enc.writeMesg({
      mesgNum: Profile.MesgNum['LAP']!,
      timestamp: new Date(FIT_START.getTime() + (l.offsetS + l.elapsedS) * 1000),
      startTime: new Date(FIT_START.getTime() + l.offsetS * 1000),
      totalElapsedTime: l.elapsedS,
      totalTimerTime: l.elapsedS,
      lapTrigger: l.trigger ?? 'manual',
    } as Encodable<LapMesg>);
  }
  return enc.close();
}
