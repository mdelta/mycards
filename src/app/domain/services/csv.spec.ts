import { BackupError } from '../model/backup-error';

import { parseCsv, toCsv } from './csv';

describe('CSV', () => {
  it('parses rows with CRLF and LF line endings and empty lines', () => {
    expect(parseCsv('a,b\r\n\r\nc,,d\ne\r\n')).toEqual([['a', 'b'], [], ['c', '', 'd'], ['e']]);
  });

  it('parses quoted fields with commas, doubled quotes and line breaks', () => {
    expect(parseCsv('1,"note, with "" and\n\nline break","with group "\r\n')).toEqual([
      ['1', 'note, with " and\n\nline break', 'with group '],
    ]);
  });

  it('keeps a last row without line break and an empty quoted field', () => {
    expect(parseCsv('a,""')).toEqual([['a', '']]);
  });

  it('rejects an unterminated quote', () => {
    expect(() => parseCsv('a,"b')).toThrow(BackupError);
  });

  it('writes CRLF rows and quotes only where needed', () => {
    expect(toCsv([['1', 'a, b', 'say "hi"', 'x\ny', ' padded', 'plain'], []])).toBe(
      '1,"a, b","say ""hi""","x\ny"," padded",plain\r\n\r\n',
    );
  });

  it('round-trips', () => {
    const rows = [['2'], [], ['_id', 'note'], ['1', 'a,"b"\nc ']];

    expect(parseCsv(toCsv(rows))).toEqual(rows);
  });
});
