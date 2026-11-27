import type { BarcodeRenderer } from '../ports/barcode-renderer';
import type { CardRepository } from '../ports/card-repository';
import type { AddTileResult, LockScreen, LockScreenCard } from '../ports/lock-screen';

import { barcodeValueOf } from './barcode-value';
import { compareCards } from './card-order';

/**
 * Keeps the cards of the lock-screen tile up to date (F-08, ADR-0006): non-archived cards marked
 * "show on lock screen", favorites first, each with a pre-drawn barcode image.
 */
export class LockScreenService {
  private last: Promise<void> = Promise.resolve();
  private queued?: Promise<void>;

  constructor(
    private readonly lockScreen: LockScreen,
    private readonly repository: () => CardRepository,
    private readonly renderer: BarcodeRenderer,
  ) {}

  get available(): boolean {
    return this.lockScreen.available;
  }

  /** Rewrites the lock-screen cards. Calls while a sync runs are merged into one more sync. */
  sync(): Promise<void> {
    if (!this.lockScreen.available) {
      return Promise.resolve();
    }
    this.queued ??= this.last.then(() => {
      this.queued = undefined;
      return this.write();
    });
    const queued = this.queued;
    this.last = queued.catch(() => undefined);
    return queued;
  }

  requestAddTile(): Promise<AddTileResult> {
    return this.lockScreen.requestAddTile();
  }

  private async write(): Promise<void> {
    const cards = (await this.repository().findAll())
      .filter((card) => card.showOnLockScreen && !card.archived)
      .sort(compareCards);
    const entries: LockScreenCard[] = [];
    for (const card of cards) {
      const barcode = card.barcodeType
        ? await this.renderer.toPng(card.barcodeType, barcodeValueOf(card)).catch(() => undefined)
        : undefined;
      entries.push({ storeName: card.storeName, cardId: card.cardId, ...(barcode && { barcode }) });
    }
    await this.lockScreen.replaceCards(entries);
  }
}
