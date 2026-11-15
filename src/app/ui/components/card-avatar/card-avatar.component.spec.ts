import { TestBed } from '@angular/core/testing';

import { cardColorOf } from '../../../domain/model/card-appearance';

import { CardAvatarComponent } from './card-avatar.component';

describe('CardAvatarComponent', () => {
  function render(inputs: Record<string, string | undefined>): HTMLElement {
    const fixture = TestBed.createComponent(CardAvatarComponent);
    for (const [name, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(name, value);
    }
    fixture.detectChanges();
    return (fixture.nativeElement as HTMLElement).querySelector('.avatar')!;
  }

  const rgb = (hex: string): string => `rgb(${[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', ')})`;

  it('shows the first letter on the derived color by default', () => {
    const avatar = render({ storeName: 'bakery' });

    expect(avatar.textContent?.trim()).toBe('B');
    expect(avatar.style.backgroundColor).toBe(rgb(cardColorOf({ storeName: 'bakery' })));
  });

  it('uses the chosen color', () => {
    expect(render({ storeName: 'Bakery', color: '#C62828' }).style.backgroundColor).toBe('rgb(198, 40, 40)');
  });

  it('treats an empty color as not chosen', () => {
    const avatar = render({ storeName: 'Bakery', color: '' });

    expect(avatar.style.backgroundColor).toBe(rgb(cardColorOf({ storeName: 'Bakery' })));
  });

  it('shows the chosen icon instead of the letter', () => {
    const avatar = render({ storeName: 'Bakery', icon: 'cafe' });

    expect(avatar.querySelector('ion-icon')).not.toBeNull();
    expect(avatar.textContent?.trim()).toBe('');
  });

  it('falls back to the letter for an unknown icon', () => {
    expect(render({ storeName: 'Bakery', icon: 'unknown' }).textContent?.trim()).toBe('B');
  });
});
