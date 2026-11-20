import path from 'node:path';
import {
  activityNotesFileSchema,
  appSettingsSchema,
  climbNamesSchema,
  goalsFileSchema,
  DEFAULT_APP_SETTINGS,
  ftpHistorySchema,
  gearFileSchema,
  lthrHistorySchema,
  planFileSchema,
  rideMergesFileSchema,
  SETTINGS_SCHEMA_VERSION,
  weightHistorySchema,
  workoutTypeOverridesFileSchema,
  type ActivityNote,
  type AppSettings,
  type AppSettingsInput,
  type FtpEntry,
  type GearFile,
  type Goal,
  type LthrEntry,
  type PlanFile,
  type RideMerge,
  type WeightEntry,
} from '../schemas/settings.js';
import type { WorkoutType } from '../schemas/activity.js';
import { rideGroupsFileSchema, type RideGroupsFile, type WorkoutOverride } from '../schemas/repeats.js';
import { readJsonFile, writeJsonFile } from './jsonFile.js';

/** `data/settings/`: user-entered settings. Not derived; never deleted by rebuild. */
export function createSettingsStore(dataDir: string) {
  const ftpFile = path.join(dataDir, 'settings', 'ftp-history.json');
  const weightFile = path.join(dataDir, 'settings', 'weight-history.json');
  const lthrFile = path.join(dataDir, 'settings', 'lthr-history.json');
  const appFile = path.join(dataDir, 'settings', 'app.json');
  const climbNamesFile = path.join(dataDir, 'settings', 'climb-names.json');
  const goalsFile = path.join(dataDir, 'settings', 'goals.json');
  const planFile = path.join(dataDir, 'settings', 'plan.json');
  const notesFile = path.join(dataDir, 'settings', 'activity-notes.json');
  const gearFile = path.join(dataDir, 'settings', 'gear.json');
  const rideGroupsFile = path.join(dataDir, 'settings', 'ride-groups.json');
  const workoutTypesFile = path.join(dataDir, 'settings', 'workout-types.json');
  const rideMergesFile = path.join(dataDir, 'settings', 'ride-merges.json');
  const empty = () => ({ schemaVersion: SETTINGS_SCHEMA_VERSION, entries: [] as never[] });

  return {
    ftpFile,
    weightFile,
    lthrFile,
    appFile,
    async readGoals(): Promise<Goal[]> {
      return (
        await readJsonFile(goalsFile, goalsFileSchema, () => ({ schemaVersion: SETTINGS_SCHEMA_VERSION, goals: [] }))
      ).goals;
    },
    /** Replaces all goals. */
    async writeGoals(goals: readonly Goal[]): Promise<void> {
      await writeJsonFile(goalsFile, goalsFileSchema.parse({ schemaVersion: SETTINGS_SCHEMA_VERSION, goals }));
    },
    /** Planned sessions and preset TSS values; an empty plan when there is no file yet. */
    readPlan: (): Promise<PlanFile> =>
      readJsonFile(planFile, planFileSchema, () => planFileSchema.parse({ schemaVersion: SETTINGS_SCHEMA_VERSION })),
    /** Replaces the whole plan. */
    writePlan: (plan: PlanFile) => writeJsonFile(planFile, planFileSchema.parse(plan)),
    /** Bikes, components, per-ride bike overrides, tyres and per-ride tyre tags; no bikes when there is no file yet. */
    readGear: (): Promise<GearFile> =>
      readJsonFile(gearFile, gearFileSchema, () => gearFileSchema.parse({ schemaVersion: SETTINGS_SCHEMA_VERSION })),
    /** Replaces the whole gear file. */
    writeGear: (gear: GearFile) => writeJsonFile(gearFile, gearFileSchema.parse(gear)),
    /** Notes and effort ratings by activity id. */
    async readActivityNotes(): Promise<Record<string, ActivityNote>> {
      const empty = () => ({ schemaVersion: SETTINGS_SCHEMA_VERSION, notes: {} });
      return (await readJsonFile(notesFile, activityNotesFileSchema, empty)).notes;
    },
    /** Saves one activity's note; an empty note (no rating, no text) removes it. */
    async setActivityNote(id: string, note: ActivityNote): Promise<void> {
      const notes = { ...(await this.readActivityNotes()) };
      const isEmpty = note.rpe === undefined && note.note === undefined;
      if (isEmpty) delete notes[id];
      else notes[id] = note;
      await writeJsonFile(notesFile, activityNotesFileSchema.parse({ schemaVersion: SETTINGS_SCHEMA_VERSION, notes }));
    },
    /** Workout types set by hand, by activity id. */
    async readWorkoutTypeOverrides(): Promise<Record<string, WorkoutType>> {
      const empty = () => ({ schemaVersion: SETTINGS_SCHEMA_VERSION, overrides: {} });
      return (await readJsonFile(workoutTypesFile, workoutTypeOverridesFileSchema, empty)).overrides;
    },
    /** Sets one ride's workout type by hand; null goes back to the detected type. */
    async setWorkoutTypeOverride(id: string, type: WorkoutType | null): Promise<void> {
      const overrides = { ...(await this.readWorkoutTypeOverrides()) };
      if (type === null) delete overrides[id];
      else overrides[id] = type;
      await writeJsonFile(
        workoutTypesFile,
        workoutTypeOverridesFileSchema.parse({ schemaVersion: SETTINGS_SCHEMA_VERSION, overrides }),
      );
    },
    /** Rides joined from several recordings, each earliest part first; none when there is no file yet. */
    async readRideMerges(): Promise<RideMerge[]> {
      const empty = () => ({ schemaVersion: SETTINGS_SCHEMA_VERSION, merges: [] });
      return (await readJsonFile(rideMergesFile, rideMergesFileSchema, empty)).merges;
    },
    /** Replaces all merges. */
    async writeRideMerges(merges: readonly RideMerge[]): Promise<void> {
      await writeJsonFile(
        rideMergesFile,
        rideMergesFileSchema.parse({ schemaVersion: SETTINGS_SCHEMA_VERSION, merges }),
      );
    },
    async readClimbNames(): Promise<Record<string, string>> {
      return (
        await readJsonFile(climbNamesFile, climbNamesSchema, () => ({
          schemaVersion: SETTINGS_SCHEMA_VERSION,
          names: {},
        }))
      ).names;
    },
    /** Names a climb; an empty name removes the name. */
    async setClimbName(id: string, name: string): Promise<void> {
      const names = { ...(await this.readClimbNames()) };
      const trimmed = name.trim();
      if (trimmed) names[id] = trimmed;
      else delete names[id];
      await writeJsonFile(climbNamesFile, climbNamesSchema.parse({ schemaVersion: SETTINGS_SCHEMA_VERSION, names }));
    },
    /** Workout and route names, and rides placed in a workout by hand; empty when there is no file yet. */
    readRideGroups: (): Promise<RideGroupsFile> =>
      readJsonFile(rideGroupsFile, rideGroupsFileSchema, () =>
        rideGroupsFileSchema.parse({ schemaVersion: SETTINGS_SCHEMA_VERSION }),
      ),
    /** Names a workout or a route; an empty name removes the name. */
    async setRideGroupName(groupId: string, name: string): Promise<void> {
      const groups = await this.readRideGroups();
      const names = { ...groups.names };
      const trimmed = name.trim();
      if (trimmed) names[groupId] = trimmed;
      else delete names[groupId];
      await writeJsonFile(rideGroupsFile, rideGroupsFileSchema.parse({ ...groups, names }));
    },
    /** Places a ride in a workout by hand ("own" keeps it apart); null lets matching decide again. */
    async setWorkoutOverride(activityId: string, override: WorkoutOverride | null): Promise<void> {
      const groups = await this.readRideGroups();
      const workoutOverrides = { ...groups.workoutOverrides };
      if (override === null) delete workoutOverrides[activityId];
      else workoutOverrides[activityId] = override;
      await writeJsonFile(rideGroupsFile, rideGroupsFileSchema.parse({ ...groups, workoutOverrides }));
    },
    readApp: (): Promise<AppSettings> => readJsonFile(appFile, appSettingsSchema, () => ({ ...DEFAULT_APP_SETTINGS })),
    writeApp: (value: AppSettingsInput) => writeJsonFile(appFile, appSettingsSchema.parse(value)),
    async readLthr(): Promise<LthrEntry[]> {
      return (await readJsonFile(lthrFile, lthrHistorySchema, empty)).entries;
    },
    async upsertLthr(entry: LthrEntry): Promise<void> {
      const entries = (await this.readLthr()).filter((e) => e.from !== entry.from);
      entries.push(entry);
      entries.sort((a, b) => a.from.localeCompare(b.from));
      await writeJsonFile(lthrFile, lthrHistorySchema.parse({ schemaVersion: SETTINGS_SCHEMA_VERSION, entries }));
    },
    async readFtp(): Promise<FtpEntry[]> {
      return (await readJsonFile(ftpFile, ftpHistorySchema, empty)).entries;
    },
    async readWeight(): Promise<WeightEntry[]> {
      return (await readJsonFile(weightFile, weightHistorySchema, empty)).entries;
    },
    /** Adds an entry, replacing any existing entry with the same `from` date. */
    async upsertFtp(entry: FtpEntry): Promise<void> {
      const entries = (await this.readFtp()).filter((e) => e.from !== entry.from);
      entries.push(entry);
      entries.sort((a, b) => a.from.localeCompare(b.from));
      await writeJsonFile(ftpFile, ftpHistorySchema.parse({ schemaVersion: SETTINGS_SCHEMA_VERSION, entries }));
    },
    /** Removes the entry starting on `from` (no-op if there is none). */
    async removeFtp(from: string): Promise<void> {
      const entries = (await this.readFtp()).filter((e) => e.from !== from);
      await writeJsonFile(ftpFile, ftpHistorySchema.parse({ schemaVersion: SETTINGS_SCHEMA_VERSION, entries }));
    },
    async removeLthr(from: string): Promise<void> {
      const entries = (await this.readLthr()).filter((e) => e.from !== from);
      await writeJsonFile(lthrFile, lthrHistorySchema.parse({ schemaVersion: SETTINGS_SCHEMA_VERSION, entries }));
    },
    async removeWeight(from: string): Promise<void> {
      const entries = (await this.readWeight()).filter((e) => e.from !== from);
      await writeJsonFile(weightFile, weightHistorySchema.parse({ schemaVersion: SETTINGS_SCHEMA_VERSION, entries }));
    },
    async upsertWeight(entry: WeightEntry): Promise<void> {
      const entries = (await this.readWeight()).filter((e) => e.from !== entry.from);
      entries.push(entry);
      entries.sort((a, b) => a.from.localeCompare(b.from));
      await writeJsonFile(weightFile, weightHistorySchema.parse({ schemaVersion: SETTINGS_SCHEMA_VERSION, entries }));
    },
  };
}

export type SettingsStore = ReturnType<typeof createSettingsStore>;
