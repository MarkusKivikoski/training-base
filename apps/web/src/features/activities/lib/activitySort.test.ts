import { describe, expect, it } from 'vitest';
import { currentSort, sortAfterClick, sortSearchPatch } from './activitySort';

describe('currentSort', () => {
  it('is newest first without sort params', () => {
    expect(currentSort({})).toEqual({ column: 'date', order: 'desc' });
  });

  it('reads the column and direction from the URL', () => {
    expect(currentSort({ sort: 'distance', order: 'asc' })).toEqual({ column: 'distance', order: 'asc' });
  });
});

describe('sortAfterClick', () => {
  it('flips the sorted column', () => {
    expect(sortAfterClick({ column: 'power', order: 'desc' }, 'power')).toEqual({ column: 'power', order: 'asc' });
    expect(sortAfterClick({ column: 'power', order: 'asc' }, 'power')).toEqual({ column: 'power', order: 'desc' });
  });

  it('starts another column in its natural direction', () => {
    expect(sortAfterClick({ column: 'date', order: 'desc' }, 'distance')).toEqual({
      column: 'distance',
      order: 'desc',
    });
    expect(sortAfterClick({ column: 'date', order: 'desc' }, 'name')).toEqual({ column: 'name', order: 'asc' });
  });
});

describe('sortSearchPatch', () => {
  it('drops the default sort from the URL', () => {
    expect(sortSearchPatch({ column: 'date', order: 'desc' })).toEqual({ sort: undefined, order: undefined });
  });

  it('keeps any other sort', () => {
    expect(sortSearchPatch({ column: 'name', order: 'asc' })).toEqual({ sort: 'name', order: 'asc' });
    expect(sortSearchPatch({ column: 'date', order: 'asc' })).toEqual({ sort: undefined, order: 'asc' });
  });
});
