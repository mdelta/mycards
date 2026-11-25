import { parseAndroidLicenses, parseWebLicenses } from './licenses';

describe('parseWebLicenses', () => {
  it('reads package, license and text of each block, sorted by name', () => {
    const text = `
--------------------------------------------------------------------------------
Package: rxjs
License: "Apache-2.0"

Apache License text

--------------------------------------------------------------------------------
Package: @angular/core
License: "MIT"

The MIT License
Copyright Google

--------------------------------------------------------------------------------
Package: no-text
License: ""
--------------------------------------------------------------------------------
`;

    expect(parseWebLicenses(text)).toEqual([
      { name: '@angular/core', license: 'MIT', text: 'The MIT License\nCopyright Google' },
      { name: 'no-text', license: 'Unknown' },
      { name: 'rxjs', license: 'Apache-2.0', text: 'Apache License text' },
    ]);
  });

  it('returns nothing for text without packages', () => {
    expect(parseWebLicenses('<!doctype html>')).toEqual([]);
  });
});

describe('parseAndroidLicenses', () => {
  it('joins libraries with their license text or URL', () => {
    const licenses = parseAndroidLicenses({
      libraries: [
        { uniqueId: 'com.google.mlkit:barcode-scanning', artifactVersion: '17.3.0', licenses: ['mlkit'] },
        { uniqueId: 'androidx.core:core', artifactVersion: '1.17.0', licenses: ['Apache-2.0'] },
        { uniqueId: 'org.example:unlicensed' },
        { uniqueId: 'org.example:no-url', licenses: ['custom'] },
      ],
      licenses: {
        'Apache-2.0': { name: 'Apache License 2.0', spdxId: 'Apache-2.0', content: ' Apache text ' },
        mlkit: { name: 'ML Kit Terms of Service', url: 'https://developers.google.com/ml-kit/terms' },
        custom: { name: 'Custom' },
      },
    });

    expect(licenses).toEqual([
      { name: 'androidx.core:core', version: '1.17.0', license: 'Apache-2.0', text: 'Apache text' },
      {
        name: 'com.google.mlkit:barcode-scanning',
        version: '17.3.0',
        license: 'ML Kit Terms of Service',
        url: 'https://developers.google.com/ml-kit/terms',
      },
      { name: 'org.example:no-url', license: 'Custom' },
      { name: 'org.example:unlicensed', license: 'Unknown' },
    ]);
  });
});
