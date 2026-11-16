import { BackupError } from '../model/backup-error';

/**
 * RFC 4180 CSV (as written by Catima, docs/formats/catima-export.md): fields containing commas, quotes
 * or line breaks are quoted, quotes doubled. An empty line becomes an empty row.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  let started = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char !== '"') {
        field += char;
      } else if (text[i + 1] === '"') {
        field += '"';
        i++;
      } else {
        quoted = false;
      }
    } else if (char === '"') {
      quoted = true;
      started = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
      started = true;
    } else if (char === '\r' || char === '\n') {
      if (char === '\r' && text[i + 1] === '\n') {
        i++;
      }
      rows.push(started ? [...row, field] : []);
      row = [];
      field = '';
      started = false;
    } else {
      field += char;
      started = true;
    }
  }
  if (quoted) {
    throw new BackupError('invalidContent');
  }
  if (started) {
    rows.push([...row, field]);
  }
  return rows;
}

/** Writes rows with CRLF line endings, quoting fields where needed (also leading/trailing spaces). */
export function toCsv(rows: readonly (readonly string[])[]): string {
  return rows.map((row) => row.map(quote).join(',') + '\r\n').join('');
}

function quote(value: string): string {
  return /[",\r\n]|^\s|\s$/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}
