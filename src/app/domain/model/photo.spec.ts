import { arePhotosValid, centerSquare, fitWithin, photoOf, withPhoto } from './photo';

describe('photo rules', () => {
  it('scales the longer edge down to the limit, keeping the aspect ratio', () => {
    expect(fitWithin({ width: 4000, height: 3000 }, 1600)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin({ width: 3000, height: 4000 }, 1600)).toEqual({ width: 1200, height: 1600 });
  });

  it('never scales up', () => {
    expect(fitWithin({ width: 800, height: 600 }, 1600)).toEqual({ width: 800, height: 600 });
  });

  it('keeps at least one pixel per side', () => {
    expect(fitWithin({ width: 10000, height: 1 }, 1600)).toEqual({ width: 1600, height: 1 });
  });

  it('finds the centered square', () => {
    expect(centerSquare({ width: 400, height: 300 })).toEqual({ x: 50, y: 0, size: 300 });
    expect(centerSquare({ width: 300, height: 401 })).toEqual({ x: 0, y: 50, size: 300 });
  });

  it('replaces, adds and removes the photo of a single role in place', () => {
    const photos = [
      { id: 'f', role: 'front' as const },
      { id: 'b', role: 'back' as const },
    ];

    expect(withPhoto(photos, 'front', 'f2')).toEqual([{ id: 'f2', role: 'front' }, photos[1]]);
    expect(withPhoto(photos, 'icon', 'i')).toEqual([...photos, { id: 'i', role: 'icon' }]);
    expect(withPhoto(photos, 'front', undefined)).toEqual([photos[1]]);
    expect(photoOf(photos, 'back')).toEqual(photos[1]);
    expect(photoOf(photos, 'icon')).toBeUndefined();
  });

  it('allows any number of other photos but one front, back and icon', () => {
    expect(
      arePhotosValid([
        { id: '1', role: 'other' },
        { id: '2', role: 'other' },
        { id: '3', role: 'front' },
      ]),
    ).toBe(true);
    expect(
      arePhotosValid([
        { id: '1', role: 'icon' },
        { id: '2', role: 'icon' },
      ]),
    ).toBe(false);
    expect(
      arePhotosValid([
        { id: '1', role: 'other' },
        { id: '1', role: 'back' },
      ]),
    ).toBe(false);
  });
});
