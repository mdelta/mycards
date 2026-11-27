import type { FilesystemPlugin } from '@capacitor/filesystem';
import { Directory, Encoding } from '@capacitor/filesystem';

import type { AddTileResult, LockScreen, LockScreenCard } from '../../domain/ports/lock-screen';
import { toBase64 } from '../backup/base64';

/** The app's own native plugin (`LockScreenPlugin.kt`). */
export interface LockScreenPlugin {
  requestAddTile(): Promise<{ result: AddTileResult }>;
}

/** Folder in the app's files, read by `LockScreenActivity.kt` and excluded from Auto Backup. */
export const LOCK_SCREEN_DIR = 'lockscreen';
export const CARDS_FILE = 'cards.json';

/** Content of `cards.json`; `image` is a PNG file name in the same folder. */
export interface LockScreenIndex {
  version: 1;
  cards: { storeName: string; cardId: string; image?: string }[];
}

/** `LockScreen` with files the native lock-screen screen reads (ADR-0006). */
export class CapacitorLockScreen implements LockScreen {
  constructor(
    private readonly filesystem: Pick<FilesystemPlugin, 'writeFile' | 'readdir' | 'deleteFile'>,
    private readonly plugin: LockScreenPlugin,
    readonly available: boolean,
  ) {}

  async replaceCards(cards: readonly LockScreenCard[]): Promise<void> {
    // Empty the list first, so a failed write never leaves cards visible that were unmarked.
    await this.writeIndex({ version: 1, cards: [] });
    const index: LockScreenIndex = { version: 1, cards: [] };
    for (const [i, card] of cards.entries()) {
      const image = card.barcode ? `card-${i}.png` : undefined;
      if (card.barcode) {
        await this.filesystem.writeFile({ ...location(image!), data: toBase64(card.barcode), recursive: true });
      }
      index.cards.push({ storeName: card.storeName, cardId: card.cardId, ...(image && { image }) });
    }
    await this.writeIndex(index);
    const used = new Set([CARDS_FILE, ...index.cards.flatMap((card) => card.image ?? [])]);
    const { files } = await this.filesystem.readdir({ path: LOCK_SCREEN_DIR, directory: Directory.Data });
    for (const file of files.filter((f) => !used.has(f.name))) {
      await this.filesystem.deleteFile(location(file.name)).catch(() => undefined);
    }
  }

  private async writeIndex(index: LockScreenIndex): Promise<void> {
    await this.filesystem.writeFile({
      ...location(CARDS_FILE),
      data: JSON.stringify(index),
      encoding: Encoding.UTF8,
      recursive: true,
    });
  }

  async requestAddTile(): Promise<AddTileResult> {
    if (!this.available) {
      return 'failed';
    }
    try {
      return (await this.plugin.requestAddTile()).result;
    } catch {
      return 'failed';
    }
  }
}

function location(name: string): { path: string; directory: Directory } {
  return { path: `${LOCK_SCREEN_DIR}/${name}`, directory: Directory.Data };
}
