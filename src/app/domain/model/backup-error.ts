export type BackupErrorReason = 'passwordRequired' | 'wrongPassword' | 'unreadable' | 'newerVersion' | 'invalidContent';

/** Why a backup file cannot be read (F-05, ADR-0004); the UI shows a message per reason. */
export class BackupError extends Error {
  constructor(readonly reason: BackupErrorReason) {
    super(`Cannot read backup: ${reason}`);
    this.name = 'BackupError';
  }
}
