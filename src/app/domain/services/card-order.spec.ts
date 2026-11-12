import { aCard } from '../../../testing/card-builder';

import { compareCards } from './card-order';

describe('compareCards', () => {
  it('puts favorites first, then sorts by store name ignoring case', () => {
    const cards = [
      aCard({ storeName: 'beta' }),
      aCard({ storeName: 'Zeta', favorite: true }),
      aCard({ storeName: 'alpha' }),
      aCard({ storeName: 'Gamma', favorite: true }),
    ];

    const names = [...cards].sort(compareCards).map((c) => c.storeName);

    expect(names).toEqual(['Gamma', 'Zeta', 'alpha', 'beta']);
  });
});
