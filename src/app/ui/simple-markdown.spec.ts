import { parseMarkdown } from './simple-markdown';

describe('parseMarkdown', () => {
  it('parses headings, paragraphs, lists and links', () => {
    const source = [
      '---',
      'title: x',
      '---',
      '# Title',
      '',
      'A **bold** paragraph',
      'over two lines with a [link](https://example.org).',
      '',
      '## Section',
      '',
      '- first item',
      '  continued',
      '- second `item`',
      '',
      'Mail: <mailto:privacy@example.org>',
      '',
      '#### Too deep',
    ].join('\r\n');

    expect(parseMarkdown(source)).toEqual([
      { kind: 'heading', level: 1, spans: [{ kind: 'text', text: 'Title' }] },
      {
        kind: 'paragraph',
        spans: [
          { kind: 'text', text: 'A bold paragraph over two lines with a ' },
          { kind: 'link', text: 'link', url: 'https://example.org' },
          { kind: 'text', text: '.' },
        ],
      },
      { kind: 'heading', level: 2, spans: [{ kind: 'text', text: 'Section' }] },
      {
        kind: 'list',
        items: [[{ kind: 'text', text: 'first item continued' }], [{ kind: 'text', text: 'second item' }]],
      },
      {
        kind: 'paragraph',
        spans: [
          { kind: 'text', text: 'Mail: ' },
          { kind: 'link', text: 'privacy@example.org', url: 'mailto:privacy@example.org' },
        ],
      },
      { kind: 'paragraph', spans: [{ kind: 'text', text: '#### Too deep' }] },
    ]);
  });

  it('keeps markup as plain text', () => {
    expect(parseMarkdown('<script>alert(1)</script>')).toEqual([
      { kind: 'paragraph', spans: [{ kind: 'text', text: '<script>alert(1)</script>' }] },
    ]);
  });

  it('ignores empty input', () => {
    expect(parseMarkdown('\n\n  \n')).toEqual([]);
  });
});
