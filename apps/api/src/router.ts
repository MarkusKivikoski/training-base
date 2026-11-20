import { TRPCError } from '@trpc/server';
import {
  bikeSchema,
  disciplineSchema,
  effectiveOn,
  gearComponentSchema,
  tyreSchema,
  ftpEntrySchema,
  goalSchema,
  lthrEntrySchema,
  plannedEventSchema,
  plannedSessionSchema,
  planPresetsSchema,
  weightEntrySchema,
  type ActivityId,
  type Climb,
  type RecordEntry,
} from '@app/shared';
import { z } from 'zod';
import { activitySortSchema, sortActivities, sortOrderSchema } from './activitySort.js';
import { repeatsRouter } from './routers/repeats.js';
import { rideMergesRouter } from './routers/rideMerges.js';
import { withWorkoutTypeOverride, workoutTypesRouter } from './routers/workoutTypes.js';
import { t } from './trpc.js';

export type { ApiContext } from './trpc.js';

/*
 * A thin layer: it filters and pages cached data, and computes nothing. Training math
 * lives in @app/metrics, and derived data is produced by `npm run rebuild`.
 */

/** One podium place of a ride: which record, in which scope ("all" or a year), and its rank. */
interface RidePlace {
  scope: string;
  kind:
    | 'effort'
    | 'maxSpeed'
    | 'longestDistance'
    | 'longestTime'
    | 'power'
    | 'elevation'
    | 'avgSpeed'
    | 'maxHr'
    | 'hilliest'
    | 'earliestStart'
    | 'longestBreak';
  /** Distance (m) for efforts, duration (s) for power. */
  key?: number;
  rank: number;
  value: number;
  extra?: number;
}

const isoDate = z.iso.date();
const gearIdInput = z.string().regex(/^[a-z0-9-]{1,40}$/);

/** A climb without its line, profile and efforts, plus how often and how fast it has been ridden. */
function climbSummary(c: Climb, names: Record<string, string>) {
  const best = c.efforts.find((e) => e.rank === 1)!;
  return {
    id: c.id,
    name: names[c.id] ?? null,
    lengthM: c.lengthM,
    gainM: c.gainM,
    avgGrade: c.avgGrade,
    maxGrade: c.maxGrade,
    score: c.score,
    start: c.start,
    rides: new Set(c.efforts.map((e) => e.activityId)).size,
    efforts: c.efforts.length,
    best: { timeS: best.timeS, date: best.date, activityId: best.activityId },
    firstDate: c.efforts[0]!.date,
    lastDate: c.efforts.at(-1)!.date,
  };
}

const climbId = z.string().regex(/^[1-9][0-9]*-[0-9]+$/);

const listInput = z.object({
  /** "cycling" (default) or every activity type. */
  sport: z.enum(['cycling', 'all']).default('cycling'),
  /** Inclusive local-date bounds. */
  from: isoDate.optional(),
  to: isoDate.optional(),
  limit: z.number().int().min(1).max(1000).default(50),
  /** Offset into the filtered, sorted list. */
  cursor: z.number().int().min(0).default(0),
  /** Column to sort by; newest first by default. Activities without a value go last. */
  sort: activitySortSchema.default('date'),
  order: sortOrderSchema.default('desc'),
  /** Case-insensitive text in the activity name. */
  q: z.string().max(100).optional(),
  /** Garmin activity types (typeKey), any of. */
  types: z.array(z.string().max(60)).max(30).optional(),
  environment: z.enum(['indoor', 'outdoor']).optional(),
  /** Distance bounds in km, inclusive. */
  minKm: z.number().min(0).max(10_000).optional(),
  maxKm: z.number().min(0).max(10_000).optional(),
  /** Only activities recorded with power. */
  hasPower: z.boolean().optional(),
});

export const appRouter = t.router({
  activities: t.router({
    list: t.procedure.input(listInput).query(async ({ ctx, input }) => {
      const { activities } = await ctx.index.get();
      const inSport = activities.filter((a) => input.sport === 'all' || a.isCycling);
      const q = input.q?.trim().toLocaleLowerCase();
      const km = (a: (typeof activities)[number]) => (a.distanceM ?? 0) / 1000;
      const filtered = inSport.filter(
        (a) =>
          (!input.from || a.date >= input.from) &&
          (!input.to || a.date <= input.to) &&
          (!q || a.name.toLocaleLowerCase().includes(q)) &&
          (!input.types?.length || input.types.includes(a.sport)) &&
          (!input.environment || a.isIndoor === (input.environment === 'indoor')) &&
          (input.minKm === undefined || km(a) >= input.minKm) &&
          (input.maxKm === undefined || km(a) <= input.maxKm) &&
          (!input.hasPower || a.hasPower),
      );
      const workoutTypeOverrides = await ctx.settings.readWorkoutTypeOverrides();
      // Overrides go on before sorting, so the Type column sorts by the type shown.
      const listed = filtered.map((activity) => withWorkoutTypeOverride(activity, workoutTypeOverrides));
      const sorted = sortActivities(listed, input.sort, input.order);
      const items = sorted.slice(input.cursor, input.cursor + input.limit);
      const next = input.cursor + items.length;
      // Activity types in the chosen sport scope, most common first, for the type filter.
      const counts = new Map<string, number>();
      for (const a of inSport) counts.set(a.sport, (counts.get(a.sport) ?? 0) + 1);
      const types = [...counts]
        .map(([type, count]) => ({ type, count }))
        .sort((x, y) => y.count - x.count || x.type.localeCompare(y.type));
      return { items, total: filtered.length, nextCursor: next < filtered.length ? next : null, types };
    }),

    get: t.procedure.input(z.object({ id: z.string().regex(/^[1-9][0-9]*$/) })).query(async ({ ctx, input }) => {
      const { activities } = await ctx.index.get();
      const activity = activities.find((a) => a.id === input.id);
      if (!activity) throw new TRPCError({ code: 'NOT_FOUND', message: `Activity ${input.id} not found` });
      return withWorkoutTypeOverride(activity, await ctx.settings.readWorkoutTypeOverrides());
    }),

    /** Per-second columnar streams for one activity. */
    streams: t.procedure.input(z.object({ id: z.string().regex(/^[1-9][0-9]*$/) })).query(async ({ ctx, input }) => {
      const stream = await ctx.streams.read(input.id as ActivityId);
      if (!stream) throw new TRPCError({ code: 'NOT_FOUND', message: `No streams for activity ${input.id}` });
      return stream;
    }),

    /** Mean-max curves of powered rides in a date range, for the Power Curve (combined client-side). */
    meanMax: t.procedure
      .input(z.object({ from: isoDate.optional(), to: isoDate.optional() }))
      .query(async ({ ctx, input }) => {
        const { activities } = await ctx.index.get();
        return activities
          .filter(
            (a) =>
              a.meanMaxPower !== null && (!input.from || a.date >= input.from) && (!input.to || a.date <= input.to),
          )
          .map((a) => ({
            id: a.id,
            date: a.date,
            name: a.name,
            meanMaxPower: a.meanMaxPower,
            lthrEstimate: a.lthrEstimate,
          }));
      }),
  }),

  settings: t.router({
    current: t.procedure.query(async ({ ctx }) => {
      const today = ctx.today();
      const [ftp, weight, lthr, app] = await Promise.all([
        ctx.settings.readFtp(),
        ctx.settings.readWeight(),
        ctx.settings.readLthr(),
        ctx.settings.readApp(),
      ]);
      return {
        today,
        ftp: effectiveOn(ftp, today),
        weight: effectiveOn(weight, today),
        lthr: effectiveOn(lthr, today),
        ftpHistory: ftp,
        lthrHistory: lthr,
        weightHistory: weight,
        privacyTrimM: app.privacyTrimM,
        dismissedFtpRides: app.dismissedFtpRides,
        dismissedLthrRides: app.dismissedLthrRides,
      };
    }),
  }),

  /**
   * Writes to settings/ (the same files `npm run settings` edits), then recomputes derived data
   * in the background (an incremental rebuild via the sync job). Returns the job status.
   */
  settingsEdit: t.router({
    /** Adds an entry, or replaces the one with the same start date. */
    save: t.procedure
      .input(
        z.discriminatedUnion('kind', [
          z.object({
            kind: z.literal('ftp'),
            entry: ftpEntrySchema.extend({ watts: z.number().int().min(30).max(2000) }),
          }),
          z.object({ kind: z.literal('lthr'), entry: lthrEntrySchema }),
          z.object({ kind: z.literal('weight'), entry: weightEntrySchema.extend({ kg: z.number().min(20).max(300) }) }),
        ]),
      )
      .mutation(async ({ ctx, input }) => {
        if (input.entry.from > ctx.today())
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'The start date can’t be in the future.' });
        if (input.kind === 'ftp') await ctx.settings.upsertFtp(input.entry);
        else if (input.kind === 'lthr') await ctx.settings.upsertLthr(input.entry);
        else await ctx.settings.upsertWeight(input.entry);
        return ctx.syncJob.requestRebuild();
      }),
    remove: t.procedure
      .input(z.object({ kind: z.enum(['ftp', 'lthr', 'weight']), from: isoDate }))
      .mutation(async ({ ctx, input }) => {
        if (input.kind === 'ftp') await ctx.settings.removeFtp(input.from);
        else if (input.kind === 'lthr') await ctx.settings.removeLthr(input.from);
        else await ctx.settings.removeWeight(input.from);
        return ctx.syncJob.requestRebuild();
      }),
    /**
     * Declines the FTP suggested from a ride's 20-minute best, so it isn't suggested again. Only a
     * list in settings/app.json changes, so nothing is recomputed.
     */
    dismissFtpSuggestion: t.procedure
      .input(z.object({ activityId: z.string().regex(/^[1-9][0-9]*$/) }))
      .mutation(async ({ ctx, input }) => {
        const app = await ctx.settings.readApp();
        if (!app.dismissedFtpRides.includes(input.activityId)) {
          await ctx.settings.writeApp({ ...app, dismissedFtpRides: [...app.dismissedFtpRides, input.activityId] });
        }
        return { dismissedFtpRides: (await ctx.settings.readApp()).dismissedFtpRides };
      }),
    /** Declines the LTHR suggested from a ride, so it isn't suggested again. Nothing is recomputed. */
    dismissLthrSuggestion: t.procedure
      .input(z.object({ activityId: z.string().regex(/^[1-9][0-9]*$/) }))
      .mutation(async ({ ctx, input }) => {
        const app = await ctx.settings.readApp();
        if (!app.dismissedLthrRides.includes(input.activityId)) {
          await ctx.settings.writeApp({ ...app, dismissedLthrRides: [...app.dismissedLthrRides, input.activityId] });
        }
        return { dismissedLthrRides: (await ctx.settings.readApp()).dismissedLthrRides };
      }),

    /** Heatmap: metres hidden at the start and end of every route. */
    privacyTrim: t.procedure
      .input(z.object({ metres: z.number().int().min(0).max(5000) }))
      .mutation(async ({ ctx, input }) => {
        await ctx.settings.writeApp({ ...(await ctx.settings.readApp()), privacyTrimM: input.metres });
        return ctx.syncJob.requestRebuild();
      }),
  }),

  load: t.router({
    /** Daily TSS/CTL/ATL/TSB from derived/daily-load.json, optionally limited to a date range. */
    daily: t.procedure
      .input(z.object({ from: isoDate.optional(), to: isoDate.optional() }))
      .query(async ({ ctx, input }) => {
        const { days, allActivities, generatedAt } = await ctx.load.read();
        const inRange = (d: { date: string }) =>
          (!input.from || d.date >= input.from) && (!input.to || d.date <= input.to);
        return { generatedAt, days: days.filter(inRange), allActivities: allActivities.filter(inRange) };
      }),
  }),

  heatmap: t.router({
    /**
     * Outdoor routes from derived/heatmap.json for rides (the default), runs or both, filtered by
     * year or date range and sport type, plus the filter options within that choice.
     */
    routes: t.procedure
      .input(
        z.object({
          discipline: z.enum([...disciplineSchema.options, 'all']).default('cycling'),
          year: z.number().int().min(1990).max(2100).optional(),
          /** Inclusive local-date bounds; combine with or instead of `year`. */
          from: isoDate.optional(),
          to: isoDate.optional(),
          sports: z.array(z.string()).optional(),
        }),
      )
      .query(async ({ ctx, input }) => {
        const file = await ctx.heatmap.read();
        const { trimM, generatedAt } = file;
        const routes = file.routes.filter((r) => input.discipline === 'all' || r.discipline === input.discipline);
        const years = [...new Set(routes.map((r) => Number(r.date.slice(0, 4))))].sort((a, b) => b - a);
        const sports = [...new Set(routes.map((r) => r.sport))].sort();
        const filtered = routes.filter(
          (r) =>
            (input.year === undefined || r.date.startsWith(`${input.year}-`)) &&
            (!input.from || r.date >= input.from) &&
            (!input.to || r.date <= input.to) &&
            (!input.sports || input.sports.length === 0 || input.sports.includes(r.sport)),
        );
        return { generatedAt, trimM, years, sports, routes: filtered };
      }),
  }),

  trends: t.router({
    /** Long-term volume and fitness markers from derived/trends.json. */
    get: t.procedure.query(({ ctx }) => ctx.trends.read()),
  }),

  records: t.router({
    /** One discipline's records (cycling by default) for one year, or all time without a year, plus its years. */
    get: t.procedure
      .input(
        z.object({
          year: z.number().int().min(1990).max(2100).optional(),
          discipline: disciplineSchema.default('cycling'),
        }),
      )
      .query(async ({ ctx, input }) => {
        const file = await ctx.records.read();
        const { years, scopes } = file.disciplines[input.discipline];
        const scope = scopes[input.year === undefined ? 'all' : String(input.year)] ?? null;
        return { generatedAt: file.generatedAt, years, scope };
      }),

    /**
     * The podium places one ride or run holds, all time and in its year. Filtering only: it looks
     * the activity's id up in the precomputed records (an id is only ever in one discipline's).
     */
    forActivity: t.procedure
      .input(z.object({ id: z.string().regex(/^[1-9][0-9]*$/) }))
      .query(async ({ ctx, input }) => {
        const file = await ctx.records.read();
        const places: RidePlace[] = [];
        const scoped = disciplineSchema.options.flatMap((discipline) => {
          const { years, scopes } = file.disciplines[discipline];
          // All time first, then years newest first (number-like object keys would otherwise come first).
          const scopeKeys = ['all', ...years.map(String)].filter((k) => scopes[k]);
          return scopeKeys.map((scopeKey) => ({ scopeKey, scope: scopes[scopeKey]! }));
        });
        for (const { scopeKey, scope } of scoped) {
          const add = (kind: RidePlace['kind'], top: readonly RecordEntry[], key?: number) => {
            const rank = top.findIndex((e) => e.id === input.id);
            if (rank === -1) return;
            const e = top[rank]!;
            places.push({
              scope: scopeKey,
              kind,
              ...(key === undefined ? {} : { key }),
              rank: rank + 1,
              value: e.value,
              ...(e.extra === undefined ? {} : { extra: e.extra }),
            });
          };
          for (const ef of scope.efforts) add('effort', ef.top, ef.distanceM);
          add('maxSpeed', scope.maxSpeed);
          add('longestDistance', scope.longestDistance);
          add('longestTime', scope.longestTime);
          for (const p of scope.power) add('power', p.top, p.durationS);
          add('elevation', scope.highs.elevation);
          add('avgSpeed', scope.highs.avgSpeed);
          add('maxHr', scope.highs.maxHr);
          add('hilliest', scope.highs.hilliest);
          add('earliestStart', scope.highs.earliestStart);
          add('longestBreak', scope.breaks);
        }
        return places;
      }),
  }),

  goals: t.router({
    /** The user's riding goals (settings/goals.json). Progress is computed in the web app. */
    list: t.procedure.query(({ ctx }) => ctx.settings.readGoals()),
    /** Replaces all goals. Ids must be unique. */
    save: t.procedure
      .input(
        z.object({
          goals: z
            .array(goalSchema)
            .max(12)
            .refine((g) => new Set(g.map((x) => x.id)).size === g.length, 'Goal ids must be unique'),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        await ctx.settings.writeGoals(input.goals);
        return input.goals;
      }),
  }),

  gear: t.router({
    /** Bikes, components, per-ride bike overrides, tyres and per-ride tyre tags (settings/gear.json). Usage is computed in the web app. */
    get: t.procedure.query(({ ctx }) => ctx.settings.readGear()),

    /** Adds a bike, or replaces the one with the same id. */
    saveBike: t.procedure.input(bikeSchema).mutation(async ({ ctx, input }) => {
      const gear = await ctx.settings.readGear();
      const bikes = gear.bikes.some((bike) => bike.id === input.id)
        ? gear.bikes.map((bike) => (bike.id === input.id ? input : bike))
        : [...gear.bikes, input];
      await ctx.settings.writeGear({ ...gear, bikes });
      return ctx.settings.readGear();
    }),

    /** Removes a bike with its components and any rides set to it. */
    removeBike: t.procedure.input(z.object({ id: gearIdInput })).mutation(async ({ ctx, input }) => {
      const gear = await ctx.settings.readGear();
      const overrides = Object.fromEntries(Object.entries(gear.overrides).filter(([, bikeId]) => bikeId !== input.id));
      await ctx.settings.writeGear({
        ...gear,
        bikes: gear.bikes.filter((bike) => bike.id !== input.id),
        components: gear.components.filter((component) => component.bikeId !== input.id),
        overrides,
      });
      return ctx.settings.readGear();
    }),

    /** Adds a component, or replaces the one with the same id. Its bike must exist. */
    saveComponent: t.procedure.input(gearComponentSchema).mutation(async ({ ctx, input }) => {
      const gear = await ctx.settings.readGear();
      if (!gear.bikes.some((bike) => bike.id === input.bikeId)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'That bike doesn’t exist.' });
      }
      const others = gear.components.filter((component) => component.id !== input.id);
      await ctx.settings.writeGear({ ...gear, components: [...others, input] });
      return ctx.settings.readGear();
    }),

    removeComponent: t.procedure.input(z.object({ id: gearIdInput })).mutation(async ({ ctx, input }) => {
      const gear = await ctx.settings.readGear();
      await ctx.settings.writeGear({ ...gear, components: gear.components.filter((c) => c.id !== input.id) });
      return ctx.settings.readGear();
    }),

    /** Sets one ride's bike ("none" for no bike), or clears the override so its type decides again. */
    setRideBike: t.procedure
      .input(z.object({ activityId: z.string().regex(/^[1-9][0-9]*$/), bikeId: z.string().nullable() }))
      .mutation(async ({ ctx, input }) => {
        const gear = await ctx.settings.readGear();
        const isKnown =
          input.bikeId === null || input.bikeId === 'none' || gear.bikes.some((b) => b.id === input.bikeId);
        if (!isKnown) throw new TRPCError({ code: 'BAD_REQUEST', message: 'That bike doesn’t exist.' });
        const overrides = { ...gear.overrides };
        if (input.bikeId === null) delete overrides[input.activityId];
        else overrides[input.activityId] = input.bikeId;
        await ctx.settings.writeGear({ ...gear, overrides });
        return ctx.settings.readGear();
      }),
  }),

  tyres: t.router({
    /** Adds a set of tyres, or renames the one with the same id. */
    save: t.procedure.input(tyreSchema).mutation(async ({ ctx, input }) => {
      const gear = await ctx.settings.readGear();
      const tyres = gear.tyres.some((tyre) => tyre.id === input.id)
        ? gear.tyres.map((tyre) => (tyre.id === input.id ? input : tyre))
        : [...gear.tyres, input];
      await ctx.settings.writeGear({ ...gear, tyres });
      return ctx.settings.readGear();
    }),

    /** Removes a set of tyres and its tag from every ride. */
    remove: t.procedure.input(z.object({ id: gearIdInput })).mutation(async ({ ctx, input }) => {
      const gear = await ctx.settings.readGear();
      const rideTyres = Object.fromEntries(Object.entries(gear.rideTyres).filter(([, tyreId]) => tyreId !== input.id));
      await ctx.settings.writeGear({ ...gear, tyres: gear.tyres.filter((tyre) => tyre.id !== input.id), rideTyres });
      return ctx.settings.readGear();
    }),

    /** Tags one ride with the tyres it was on, or clears the tag with null. */
    setForRide: t.procedure
      .input(z.object({ activityId: z.string().regex(/^[1-9][0-9]*$/), tyreId: gearIdInput.nullable() }))
      .mutation(async ({ ctx, input }) => {
        const gear = await ctx.settings.readGear();
        const isKnown = input.tyreId === null || gear.tyres.some((tyre) => tyre.id === input.tyreId);
        if (!isKnown) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Those tyres don’t exist.' });
        const rideTyres = { ...gear.rideTyres };
        if (input.tyreId === null) delete rideTyres[input.activityId];
        else rideTyres[input.activityId] = input.tyreId;
        await ctx.settings.writeGear({ ...gear, rideTyres });
        return ctx.settings.readGear();
      }),
  }),

  notes: t.router({
    /** How one activity felt (settings/activity-notes.json), or null without a note. */
    forActivity: t.procedure
      .input(z.object({ id: z.string().regex(/^[1-9][0-9]*$/) }))
      .query(async ({ ctx, input }) => (await ctx.settings.readActivityNotes())[input.id] ?? null),

    /** Saves an activity's rating and note; leaving both out removes them. Nothing is recomputed. */
    save: t.procedure
      .input(
        z.object({
          id: z.string().regex(/^[1-9][0-9]*$/),
          rpe: z.number().int().min(1).max(10).nullable(),
          note: z.string().max(500),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const text = input.note.trim();
        const note = { ...(input.rpe === null ? {} : { rpe: input.rpe }), ...(text ? { note: text } : {}) };
        await ctx.settings.setActivityNote(input.id, note);
        return (await ctx.settings.readActivityNotes())[input.id] ?? null;
      }),
  }),

  plan: t.router({
    /** Planned sessions and preset TSS values (settings/plan.json). The forecast is computed in the web app. */
    get: t.procedure.query(({ ctx }) => ctx.settings.readPlan()),

    /** Adds a session, or replaces the one with the same id. */
    saveSession: t.procedure.input(plannedSessionSchema).mutation(async ({ ctx, input }) => {
      const plan = await ctx.settings.readPlan();
      const sessions = plan.sessions.filter((session) => session.id !== input.id);
      sessions.push(input);
      sessions.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
      await ctx.settings.writePlan({ ...plan, sessions });
      return ctx.settings.readPlan();
    }),

    removeSession: t.procedure
      .input(z.object({ id: z.string().regex(/^[a-z0-9-]{1,40}$/) }))
      .mutation(async ({ ctx, input }) => {
        const plan = await ctx.settings.readPlan();
        await ctx.settings.writePlan({ ...plan, sessions: plan.sessions.filter((session) => session.id !== input.id) });
        return ctx.settings.readPlan();
      }),

    /** Adds a target event, or replaces the one with the same id. */
    saveEvent: t.procedure.input(plannedEventSchema).mutation(async ({ ctx, input }) => {
      const plan = await ctx.settings.readPlan();
      const events = plan.events.filter((event) => event.id !== input.id);
      events.push(input);
      events.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
      await ctx.settings.writePlan({ ...plan, events });
      return ctx.settings.readPlan();
    }),

    removeEvent: t.procedure
      .input(z.object({ id: z.string().regex(/^[a-z0-9-]{1,40}$/) }))
      .mutation(async ({ ctx, input }) => {
        const plan = await ctx.settings.readPlan();
        await ctx.settings.writePlan({ ...plan, events: plan.events.filter((event) => event.id !== input.id) });
        return ctx.settings.readPlan();
      }),

    /** The TSS that Easy, Medium and Hard sessions count as. */
    setPresets: t.procedure.input(planPresetsSchema).mutation(async ({ ctx, input }) => {
      await ctx.settings.writePlan({ ...(await ctx.settings.readPlan()), presets: input });
      return ctx.settings.readPlan();
    }),
  }),

  climbs: t.router({
    /** Every climb found in outdoor rides, with the names the user gave them. */
    list: t.procedure.query(async ({ ctx }) => {
      const [file, names] = await Promise.all([ctx.climbs.read(), ctx.settings.readClimbNames()]);
      return { generatedAt: file.generatedAt, climbs: file.climbs.map((c) => climbSummary(c, names)) };
    }),

    /** One climb with its line, profile and every effort. */
    get: t.procedure.input(z.object({ id: climbId })).query(async ({ ctx, input }) => {
      const [file, names] = await Promise.all([ctx.climbs.read(), ctx.settings.readClimbNames()]);
      const climb = file.climbs.find((c) => c.id === input.id);
      if (!climb) throw new TRPCError({ code: 'NOT_FOUND', message: `Climb ${input.id} not found` });
      return { ...climb, name: names[climb.id] ?? null };
    }),

    /** The climbs one ride went up, in ride order, with its efforts and how they rank. */
    forActivity: t.procedure
      .input(z.object({ id: z.string().regex(/^[1-9][0-9]*$/) }))
      .query(async ({ ctx, input }) => {
        const [file, names] = await Promise.all([ctx.climbs.read(), ctx.settings.readClimbNames()]);
        return file.climbs
          .map((c) => ({ climb: climbSummary(c, names), efforts: c.efforts.filter((e) => e.activityId === input.id) }))
          .filter((x) => x.efforts.length > 0)
          .sort((a, b) => a.efforts[0]!.startS - b.efforts[0]!.startS);
      }),

    /** Names a climb (settings/climb-names.json); an empty name removes it. */
    rename: t.procedure.input(z.object({ id: climbId, name: z.string().max(80) })).mutation(async ({ ctx, input }) => {
      await ctx.settings.setClimbName(input.id, input.name);
      return { id: input.id, name: input.name.trim() || null };
    }),
  }),

  repeats: repeatsRouter,
  rideMerges: rideMergesRouter,

  workoutTypes: workoutTypesRouter,

  garmin: t.router({
    /** Result of the last `npm run check-deleted`: cached activities Garmin no longer lists. */
    deletedCheck: t.procedure.query(({ ctx }) => ctx.garminCheck.read()),
  }),

  sync: t.router({
    /** Starts a background sync (or returns the running one). Never waits for Garmin. */
    start: t.procedure.mutation(async ({ ctx }) => ({
      ...ctx.syncJob.start(),
      lastSyncAt: (await ctx.syncState.read()).lastSyncAt,
    })),
    /** Progress of the current or last sync, plus when the data was last synced. */
    status: t.procedure.query(async ({ ctx }) => ({
      ...ctx.syncJob.status(),
      lastSyncAt: (await ctx.syncState.read()).lastSyncAt,
    })),
  }),

  status: t.procedure.query(async ({ ctx }) => {
    const { generatedAt, activities } = await ctx.index.get();
    return { generatedAt, activityCount: activities.length, today: ctx.today() };
  }),
});

export type AppRouter = typeof appRouter;
