/** A file's name and content, independent of where it is stored. */
export interface BinaryFile {
  name: string;
  data: Uint8Array;
}

/** Moves export files out of and import files into the app (ADR-0004: share sheet, system file picker). */
export interface BackupFiles {
  /** Hands the file to the user, e.g. via the Android share sheet. */
  share(file: BinaryFile): Promise<void>;
  /** Lets the user choose a file; resolves to `undefined` if the user cancels. */
  pick(): Promise<BinaryFile | undefined>;
}
