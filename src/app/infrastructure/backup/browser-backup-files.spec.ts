import { BrowserBackupFiles } from './browser-backup-files';

describe('BrowserBackupFiles', () => {
  const files = new BrowserBackupFiles(document);
  let createdInput: HTMLInputElement | undefined;
  let onClick: (input: HTMLInputElement) => void;

  beforeEach(() => {
    createdInput = undefined;
    const create = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const element = create(tag);
      if (element instanceof HTMLInputElement) {
        createdInput = element;
        vi.spyOn(element, 'click').mockImplementation(() => onClick(element));
      }
      return element;
    });
  });

  afterEach(() => vi.restoreAllMocks());

  function selectFile(input: HTMLInputElement, file?: File): void {
    Object.defineProperty(input, 'files', { value: file ? [file] : [] });
    input.dispatchEvent(new Event('change'));
  }

  it('downloads the file', async () => {
    const createObjectURL = vi.fn(() => 'blob:backup');
    const revokeObjectURL = vi.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.download).toBe('backup.zip');
      expect(this.href).toBe('blob:backup');
    });

    await files.share({ name: 'backup.zip', data: new Uint8Array([1]) });

    expect(click).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:backup');
  });

  it('reads the chosen ZIP file', async () => {
    onClick = (input) => selectFile(input, new File([new Uint8Array([1, 2])], 'backup.zip'));

    const picked = await files.pick();

    expect(createdInput?.accept).toBe('.zip,application/zip');
    expect({ name: picked?.name, data: [...(picked?.data ?? [])] }).toEqual({ name: 'backup.zip', data: [1, 2] });
  });

  it('returns undefined when no file is chosen or the dialog is cancelled', async () => {
    onClick = (input) => selectFile(input);
    expect(await files.pick()).toBeUndefined();

    onClick = (input) => input.dispatchEvent(new Event('cancel'));
    expect(await files.pick()).toBeUndefined();
  });
});
