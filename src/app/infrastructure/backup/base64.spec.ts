import { fromBase64, toBase64 } from './base64';

describe('base64', () => {
  it('encodes and decodes bytes', () => {
    expect(toBase64(new Uint8Array([0, 1, 254, 255]))).toBe('AAH+/w==');
    expect([...fromBase64('AAH+/w==')]).toEqual([0, 1, 254, 255]);
  });

  it('round-trips data larger than one chunk', () => {
    const data = Uint8Array.from({ length: 100_000 }, (_, i) => i % 256);

    expect([...fromBase64(toBase64(data))]).toEqual([...data]);
  });
});
