import { BackupError } from '../../domain/model/backup-error';

import { ZipJsArchiveCodec } from './zipjs-archive-codec';

describe('ZipJsArchiveCodec', () => {
  const codec = new ZipJsArchiveCodec();
  const entries = [
    { name: 'mycards.json', data: new TextEncoder().encode('{"cards":[]}') },
    { name: 'photos/a.jpg', data: new Uint8Array([0, 1, 2, 255]) },
  ];

  /** zip.js creates its arrays in another realm than jsdom, so compare plain values. */
  async function unpacked(data: Uint8Array, password?: string): Promise<{ name: string; data: number[] }[]> {
    return (await codec.unpack(data, password)).map((entry) => ({ name: entry.name, data: [...entry.data] }));
  }

  const expected = entries.map((entry) => ({ name: entry.name, data: [...entry.data] }));

  async function reasonOf(promise: Promise<unknown>): Promise<string | undefined> {
    try {
      await promise;
      return undefined;
    } catch (error) {
      return error instanceof BackupError ? error.reason : 'other';
    }
  }

  it('round-trips entries without a password', async () => {
    expect(await unpacked(await codec.pack(entries))).toEqual(expected);
  });

  it('round-trips entries with a password', async () => {
    expect(await unpacked(await codec.pack(entries, 'secret'), 'secret')).toEqual(expected);
  });

  it('writes a ZIP file, encrypted with AES when a password is given', async () => {
    const plain = await codec.pack(entries);
    const encrypted = await codec.pack(entries, 'secret');

    expect([...plain.slice(0, 4)]).toEqual([0x50, 0x4b, 0x03, 0x04]);
    // Compression method 99 marks WinZip AES entries.
    expect(new DataView(encrypted.buffer).getUint16(8, true)).toBe(99);
    expect(new TextDecoder().decode(encrypted)).not.toContain('{"cards":[]}');
  });

  it('asks for a password when the file is encrypted', async () => {
    expect(await reasonOf(codec.unpack(await codec.pack(entries, 'secret')))).toBe('passwordRequired');
  });

  it('rejects a wrong password', async () => {
    expect(await reasonOf(codec.unpack(await codec.pack(entries, 'secret'), 'wrong'))).toBe('wrongPassword');
  });

  it('ignores a password for an unencrypted file', async () => {
    expect(await unpacked(await codec.pack(entries), 'secret')).toEqual(expected);
  });

  it('rejects a file that is not a ZIP', async () => {
    expect(await reasonOf(codec.unpack(new TextEncoder().encode('no zip')))).toBe('unreadable');
  });
});
