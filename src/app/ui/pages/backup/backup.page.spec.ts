import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { AlertController, ToastController } from '@ionic/angular';
import { TranslocoTestingModule } from '@jsverse/transloco';

import en from '../../../../assets/i18n/en.json';
import { aCard } from '../../../../testing/card-builder';
import { InMemoryCardRepository } from '../../../../testing/in-memory-card-repository';
import type { BackupFiles, BinaryFile } from '../../../domain/ports/backup-files';
import { BackupService } from '../../../domain/services/backup-service';
import {
  BACKUP_FILES,
  CARD_REPOSITORY,
  backupServiceProvider,
  cardServiceProvider,
} from '../../../infrastructure/providers';

import { BackupPage } from './backup.page';

interface AlertAnswer {
  role: string;
  data?: { values: { password: string } };
}

describe('BackupPage', () => {
  let fixture: ComponentFixture<BackupPage>;
  let page: BackupPage;
  let repository: InMemoryCardRepository;
  let shared: BinaryFile | undefined;
  let toPick: BinaryFile | undefined;
  let answers: AlertAnswer[];
  const files: BackupFiles = {
    share: async (file) => {
      shared = file;
    },
    pick: async () => toPick,
  };
  const alertController = {
    create: vi.fn(async () => ({
      present: async () => undefined,
      onDidDismiss: async () => answers.shift() ?? { role: 'cancel' },
    })),
  };
  const toast = { present: vi.fn() };
  const toastController = { create: vi.fn(async () => toast) };

  beforeEach(async () => {
    vi.clearAllMocks();
    shared = undefined;
    toPick = undefined;
    answers = [];
    repository = new InMemoryCardRepository([
      aCard({ id: 'a', storeName: 'Alpha' }),
      aCard({ id: 'b', storeName: 'Bravo' }),
    ]);
    await TestBed.configureTestingModule({
      imports: [
        BackupPage,
        TranslocoTestingModule.forRoot({
          langs: { en },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
        }),
      ],
      providers: [
        { provide: CARD_REPOSITORY, useValue: repository },
        cardServiceProvider(),
        backupServiceProvider(),
        { provide: BACKUP_FILES, useValue: files },
        { provide: AlertController, useValue: alertController },
        { provide: ToastController, useValue: toastController },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(BackupPage);
    page = fixture.componentInstance;
    fixture.detectChanges();
  });

  const input = (value: string): CustomEvent<{ value: string }> => new CustomEvent('ionInput', { detail: { value } });
  const lastToast = (): string | undefined =>
    (toastController.create.mock.calls.at(-1) as unknown as [{ message: string }] | undefined)?.[0].message;
  const alertHeaders = (): string[] =>
    (alertController.create.mock.calls as unknown as [{ header: string; message: string }][]).map(([a]) => a.header);

  async function exportWith(password = ''): Promise<BinaryFile> {
    page.onPassword(input(password), false);
    page.onPassword(input(password), true);
    await page.exportCards();
    return shared as BinaryFile;
  }

  it('renders both sections', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent;

    expect(text).toContain('Export and import');
    expect(text).toContain('Clean import');
  });

  it('shares an export file and confirms it', async () => {
    const file = await exportWith();

    expect(file.name).toMatch(/^mycards-\d{4}-\d{2}-\d{2}\.zip$/);
    expect(lastToast()).toBe('Export file created.');
  });

  it('does not export when the passwords differ', async () => {
    page.onPassword(input('secret'), false);
    page.onPassword(input('other'), true);
    await page.exportCards();
    fixture.detectChanges();

    expect(shared).toBeUndefined();
    expect(page.passwordMismatch()).toBe(true);
  });

  it('clears the repeated password with the password', () => {
    page.onPassword(input('secret'), false);
    page.onPassword(input('secret'), true);
    page.onPassword(input(''), false);

    expect(page.passwordRepeat()).toBe('');
  });

  it('reports a failed export', async () => {
    files.share = vi.fn(async () => Promise.reject(new Error('disk full')));
    await page.exportCards();
    files.share = async (file) => {
      shared = file;
    };

    expect(lastToast()).toBe('Export failed. Try again.');
    expect(page.busy()).toBe(false);
  });

  it('imports after confirmation, overwriting by id and keeping other cards', async () => {
    toPick = await exportWith();
    await repository.saveAll([aCard({ id: 'a', storeName: 'Changed' }), aCard({ id: 'c' })]);
    answers = [{ role: 'confirm' }];

    await page.importCards();

    expect(alertHeaders()).toEqual(['Import 2 cards?']);
    expect((await repository.findAll()).map((c) => [c.id, c.storeName])).toEqual([
      ['a', 'Alpha'],
      ['b', 'Bravo'],
      ['c', 'Store'],
    ]);
    expect(lastToast()).toBe('2 cards imported.');
  });

  it('clean import deletes the other cards after a warning', async () => {
    toPick = await exportWith();
    await repository.save(aCard({ id: 'c' }));
    page.onClean(new CustomEvent('ionChange', { detail: { checked: true } }));
    answers = [{ role: 'confirm' }];

    await page.importCards();

    expect(alertController.create).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'All 3 current cards will be deleted and replaced by the cards from the file.',
      }),
    );
    expect((await repository.findAll()).map((c) => c.id)).toEqual(['a', 'b']);
  });

  it('changes nothing when the import is not confirmed', async () => {
    toPick = await exportWith();
    await repository.save(aCard({ id: 'c' }));
    page.onClean(new CustomEvent('ionChange', { detail: { checked: true } }));

    await page.importCards();

    expect((await repository.findAll()).map((c) => c.id)).toEqual(['a', 'b', 'c']);
  });

  it('does nothing when no file is picked', async () => {
    await page.importCards();

    expect(alertController.create).not.toHaveBeenCalled();
    expect(toastController.create).not.toHaveBeenCalled();
  });

  it('asks for the password until it is right', async () => {
    toPick = await exportWith('secret');
    answers = [
      { role: 'confirm', data: { values: { password: 'wrong' } } },
      { role: 'confirm', data: { values: { password: 'secret' } } },
      { role: 'confirm' },
    ];

    await page.importCards();

    const messages = (alertController.create.mock.calls as unknown as [{ message: string }][]).map(([a]) => a.message);
    expect(messages).toEqual([
      'This file is protected with a password.',
      'Wrong password. Try again.',
      'Cards with the same ID will be overwritten.',
    ]);
    expect(lastToast()).toBe('2 cards imported.');
  });

  it('stops when the password prompt is cancelled', async () => {
    toPick = await exportWith('secret');

    await page.importCards();

    expect(alertHeaders()).toEqual(['Password']);
    expect(toastController.create.mock.calls.length).toBe(1);
  });

  it('shows why a file cannot be imported', async () => {
    toPick = { name: 'photo.jpg', data: new Uint8Array([1, 2, 3]) };

    await page.importCards();

    expect(lastToast()).toBe('This file is not a MyCards export.');
  });

  it('reports unexpected import errors', async () => {
    toPick = await exportWith();
    answers = [{ role: 'confirm' }];
    vi.spyOn(TestBed.inject(BackupService), 'restoreBackup').mockRejectedValueOnce(new Error('db'));

    await page.importCards();

    expect(lastToast()).toBe('Import failed. Your cards were not changed.');
  });
});
