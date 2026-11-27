/** A card shown over the lock screen (F-08, ADR-0006). */
export interface LockScreenCard {
  storeName: string;
  cardId: string;
  /** PNG image of the barcode; missing if the card has no barcode type or it can't be drawn. */
  barcode?: Uint8Array;
}

/** Result of asking Android to add the Quick Settings tile. */
export type AddTileResult = 'added' | 'alreadyAdded' | 'notAdded' | 'failed';

/** The native Quick Settings tile and the cards its lock-screen screen shows (ADR-0006). */
export interface LockScreen {
  /** False in the browser, where there is no tile. */
  readonly available: boolean;
  /** Replaces the cards shown over the lock screen, in display order. */
  replaceCards(cards: readonly LockScreenCard[]): Promise<void>;
  /** Shows Android's prompt to add the tile to Quick Settings. */
  requestAddTile(): Promise<AddTileResult>;
}
