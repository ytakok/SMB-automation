import { deepMerge } from './deep-merge';

describe('deepMerge', () => {
  it('merges nested translations and lets tenant values override shared values', () => {
    expect(
      deepMerge(
        { nav: { home: 'Home', contact: 'Contact' }, footer: 'Shared' },
        { nav: { home: 'Start' }, footer: 'Tenant' },
      ),
    ).toEqual({
      nav: { home: 'Start', contact: 'Contact' },
      footer: 'Tenant',
    });
  });

  it('replaces arrays instead of merging their indexes', () => {
    expect(deepMerge({ list: ['one', 'two'] }, { list: ['custom'] })).toEqual({
      list: ['custom'],
    });
  });
});
