/** Facts about the installed app. */
export interface AppInfo {
  /** e.g. `1.0 (1)`; `undefined` where no installed app exists (browser). */
  version(): Promise<string | undefined>;
}
