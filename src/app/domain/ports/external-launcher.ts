/** Opens URLs in other apps: websites in the browser, `geo:` searches in a map app (ADR-0005). */
export interface ExternalLauncher {
  /** Resolves `false` if no installed app can open the URL. */
  open(url: string): Promise<boolean>;
}
