/** A third-party library shown on the licenses page (R-4, ADR-0019). */
export interface LibraryLicense {
  name: string;
  version?: string;
  license: string;
  /** Full license text, where the build provides it. */
  text?: string;
  /** Links to the licenses whose text the build doesn't include. */
  urls?: string[];
}

const SEPARATOR = /^-{20,}$/m;

/** Parses the `3rdpartylicenses.txt` that Angular's production build writes for the JavaScript libraries. */
export function parseWebLicenses(text: string): LibraryLicense[] {
  return text
    .split(SEPARATOR)
    .map((block) => block.trim())
    .filter((block) => block.startsWith('Package:'))
    .map((block) => {
      const lines = block.split('\n');
      const name = lines[0].slice('Package:'.length).trim();
      const licenseLine = lines.find((line) => line.startsWith('License:'));
      const license = licenseLine?.slice('License:'.length).trim().replace(/^"|"$/g, '') || 'Unknown';
      const body = lines
        .slice(licenseLine ? lines.indexOf(licenseLine) + 1 : 1)
        .join('\n')
        .trim();
      return { name, license, ...(body ? { text: body } : {}) };
    })
    .sort(byName);
}

interface AboutLibrariesExport {
  libraries: { uniqueId: string; name?: string; artifactVersion?: string; licenses?: string[] }[];
  licenses: Record<string, { name?: string; spdxId?: string; url?: string; content?: string }>;
}

/** Parses the native Android library list exported by the AboutLibraries Gradle plugin. */
export function parseAndroidLicenses(data: AboutLibrariesExport): LibraryLicense[] {
  return data.libraries
    .map((library) => {
      const licenses = (library.licenses ?? []).map((key) => data.licenses[key]).filter((l) => !!l);
      const texts = licenses.map((l) => l.content?.trim()).filter((t): t is string => !!t);
      const urls = licenses.filter((l) => !l.content?.trim() && l.url).map((l) => l.url!);
      return {
        name: library.uniqueId,
        ...(library.artifactVersion ? { version: library.artifactVersion } : {}),
        license: licenses.map((l) => l.spdxId || l.name || l.url).join(', ') || 'Unknown',
        ...(texts.length ? { text: texts.join('\n\n') } : {}),
        ...(urls.length ? { urls } : {}),
      };
    })
    .sort(byName);
}

function byName(a: LibraryLicense, b: LibraryLicense): number {
  return a.name.localeCompare(b.name);
}
