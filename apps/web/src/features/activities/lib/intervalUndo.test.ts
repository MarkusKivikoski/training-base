import { describe, expect, it } from 'vitest';
import { draftEditDescription, MAX_UNDO_STEPS, withoutLastStep, withUndoStep, type UndoHistory } from './intervalUndo';

const removed = { description: 'removed interval 3', before: null };
const trimmed = { description: 'trimmed interval 1', before: [{ startS: 600, endS: 900 }] };

describe('undo history', () => {
  it('keeps steps per ride, newest last, and undoes the newest first', () => {
    let history: UndoHistory = {};
    history = withUndoStep(history, '1', removed);
    history = withUndoStep(history, '1', trimmed);
    history = withUndoStep(history, '2', removed);
    expect(history['1']).toEqual([removed, trimmed]);
    expect(history['2']).toEqual([removed]);

    history = withoutLastStep(history, '1');
    expect(history['1']).toEqual([removed]);
    expect(withoutLastStep(withoutLastStep(history, '1'), '1')['1']).toEqual([]);
    expect(withoutLastStep({}, '3')['3']).toEqual([]);
  });

  it('drops the oldest step past the limit', () => {
    let history: UndoHistory = {};
    for (let i = 0; i <= MAX_UNDO_STEPS; i++) {
      history = withUndoStep(history, '1', { description: `step ${i}`, before: null });
    }
    const steps = history['1']!;
    expect(steps).toHaveLength(MAX_UNDO_STEPS);
    expect(steps[0]!.description).toBe('step 1');
    expect(steps.at(-1)!.description).toBe(`step ${MAX_UNDO_STEPS}`);
  });

  it('describes a saved draft', () => {
    expect(draftEditDescription({ start: '1:00', end: '2:00', editingIndex: null })).toBe('added an interval');
    expect(draftEditDescription({ start: '1:00', end: '2:00', editingIndex: 0 })).toBe('trimmed interval 1');
  });
});
