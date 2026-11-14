import type { BinaryFile } from './backup-files';

/** ZIP container with optional AES-256 password (ADR-0004). */
export interface ArchiveCodec {
  pack(entries: BinaryFile[], password?: string): Promise<Uint8Array>;
  /** Rejects with a `BackupError` (`passwordRequired`, `wrongPassword` or `unreadable`). */
  unpack(data: Uint8Array, password?: string): Promise<BinaryFile[]>;
}
