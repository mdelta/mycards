import type { BarcodeType } from '../../domain/model/barcode-type';
import type { Card, Tag, WebsiteLink } from '../../domain/model/card';
import type { CardRepository } from '../../domain/ports/card-repository';

import type { SqlDatabase, SqlValue } from './sql-database';

interface CardRow {
  id: string;
  store_name: string;
  card_id: string;
  barcode_value: string | null;
  barcode_type: string | null;
  note: string | null;
  valid_from: string | null;
  expiry: string | null;
  balance: number | null;
  balance_type: string | null;
  color: string | null;
  icon: string | null;
  favorite: number;
  archived: number;
  show_on_lock_screen: number;
  homepage_url: string | null;
  shop_search_term: string | null;
  created_at: string;
  updated_at: string;
  last_used_at: string | null;
}

const COLUMNS = [
  'id',
  'store_name',
  'card_id',
  'barcode_value',
  'barcode_type',
  'note',
  'valid_from',
  'expiry',
  'balance',
  'balance_type',
  'color',
  'icon',
  'favorite',
  'archived',
  'show_on_lock_screen',
  'homepage_url',
  'shop_search_term',
  'created_at',
  'updated_at',
  'last_used_at',
] as const satisfies readonly (keyof CardRow)[];

const UPSERT = `INSERT INTO card (${COLUMNS.join(', ')}) VALUES (${COLUMNS.map(() => '?').join(', ')})
  ON CONFLICT (id) DO UPDATE SET ${COLUMNS.slice(1)
    .map((c) => `${c} = excluded.${c}`)
    .join(', ')}`;

async function writeCard(tx: SqlDatabase, card: Card): Promise<void> {
  const row = toRow(card);
  await tx.run(
    UPSERT,
    COLUMNS.map((column) => row[column]),
  );
  await tx.run('DELETE FROM card_tag WHERE card_id = ?', [card.id]);
  for (const tagId of card.tagIds) {
    await tx.run('INSERT INTO card_tag (card_id, tag_id) VALUES (?, ?)', [card.id, tagId]);
  }
  await tx.run('DELETE FROM website WHERE card_id = ?', [card.id]);
  for (const [position, site] of card.websites.entries()) {
    await tx.run('INSERT INTO website (id, card_id, label, url, position) VALUES (?, ?, ?, ?, ?)', [
      `${card.id}:${position}`,
      card.id,
      site.label ?? null,
      site.url,
      position,
    ]);
  }
}

function writeTag(tx: SqlDatabase, tag: Tag): Promise<void> {
  return tx.run('INSERT INTO tag (id, name) VALUES (?, ?) ON CONFLICT (id) DO UPDATE SET name = excluded.name', [
    tag.id,
    tag.name,
  ]);
}

async function deleteUnusedTags(tx: SqlDatabase): Promise<void> {
  await tx.run('DELETE FROM tag WHERE id NOT IN (SELECT tag_id FROM card_tag)');
}

/** `CardRepository` backed by SQLite (ADR-0003). */
export class SqliteCardRepository implements CardRepository {
  constructor(private readonly db: SqlDatabase) {}

  async findAll(): Promise<Card[]> {
    const rows = await this.db.query<CardRow>('SELECT * FROM card');
    const tags = await this.tagIdsByCard();
    const websites = await this.websitesByCard();
    return rows.map((row) => toCard(row, tags.get(row.id) ?? [], websites.get(row.id) ?? []));
  }

  async findById(id: string): Promise<Card | undefined> {
    const [row] = await this.db.query<CardRow>('SELECT * FROM card WHERE id = ?', [id]);
    return (
      row && toCard(row, (await this.tagIdsByCard(id)).get(id) ?? [], (await this.websitesByCard(id)).get(id) ?? [])
    );
  }

  save(card: Card): Promise<void> {
    return this.db.transaction(async (tx) => {
      await writeCard(tx, card);
      await deleteUnusedTags(tx);
    });
  }

  saveAll(cards: readonly Card[], options: { deleteOthers?: boolean; tags?: readonly Tag[] } = {}): Promise<void> {
    return this.db.transaction(async (tx) => {
      if (options.deleteOthers) {
        for (const table of ['card_tag', 'website', 'photo', 'card', 'tag']) {
          await tx.run(`DELETE FROM ${table}`);
        }
      }
      for (const tag of options.tags ?? []) {
        await writeTag(tx, tag);
      }
      for (const card of cards) {
        await writeCard(tx, card);
      }
      await deleteUnusedTags(tx);
    });
  }

  findAllTags(): Promise<Tag[]> {
    return this.db.query<Tag>('SELECT id, name FROM tag');
  }

  saveTag(tag: Tag): Promise<void> {
    return writeTag(this.db, tag);
  }

  async updateLastUsed(id: string, lastUsedAt: string): Promise<void> {
    await this.db.run('UPDATE card SET last_used_at = ? WHERE id = ?', [lastUsedAt, id]);
  }

  delete(id: string): Promise<void> {
    return this.db.transaction(async (tx) => {
      for (const table of ['card_tag', 'website', 'photo']) {
        await tx.run(`DELETE FROM ${table} WHERE card_id = ?`, [id]);
      }
      await tx.run('DELETE FROM card WHERE id = ?', [id]);
      await deleteUnusedTags(tx);
    });
  }

  private async tagIdsByCard(cardId?: string): Promise<Map<string, string[]>> {
    const rows = cardId
      ? await this.db.query<{ card_id: string; tag_id: string }>(
          'SELECT card_id, tag_id FROM card_tag WHERE card_id = ? ORDER BY rowid',
          [cardId],
        )
      : await this.db.query<{ card_id: string; tag_id: string }>('SELECT card_id, tag_id FROM card_tag ORDER BY rowid');
    const result = new Map<string, string[]>();
    for (const { card_id, tag_id } of rows) {
      result.set(card_id, [...(result.get(card_id) ?? []), tag_id]);
    }
    return result;
  }

  private async websitesByCard(cardId?: string): Promise<Map<string, WebsiteLink[]>> {
    type Row = { card_id: string; label: string | null; url: string };
    const rows = cardId
      ? await this.db.query<Row>('SELECT card_id, label, url FROM website WHERE card_id = ? ORDER BY position', [cardId])
      : await this.db.query<Row>('SELECT card_id, label, url FROM website ORDER BY card_id, position');
    const result = new Map<string, WebsiteLink[]>();
    for (const { card_id, label, url } of rows) {
      result.set(card_id, [...(result.get(card_id) ?? []), label === null ? { url } : { label, url }]);
    }
    return result;
  }
}

function toRow(card: Card): Record<(typeof COLUMNS)[number], SqlValue> {
  return {
    id: card.id,
    store_name: card.storeName,
    card_id: card.cardId,
    barcode_value: card.barcodeValue ?? null,
    barcode_type: card.barcodeType ?? null,
    note: card.note ?? null,
    valid_from: card.validFrom ?? null,
    expiry: card.expiry ?? null,
    balance: card.balance ?? null,
    balance_type: card.balanceType ?? null,
    color: card.color ?? null,
    icon: card.icon ?? null,
    favorite: card.favorite ? 1 : 0,
    archived: card.archived ? 1 : 0,
    show_on_lock_screen: card.showOnLockScreen ? 1 : 0,
    homepage_url: card.homepageUrl ?? null,
    shop_search_term: card.shopSearchTerm ?? null,
    created_at: card.createdAt,
    updated_at: card.updatedAt,
    last_used_at: card.lastUsedAt ?? null,
  };
}

function toCard(row: CardRow, tagIds: string[], websites: WebsiteLink[]): Card {
  const card: Card = {
    id: row.id,
    storeName: row.store_name,
    cardId: row.card_id,
    barcodeValue: row.barcode_value ?? undefined,
    barcodeType: (row.barcode_type as BarcodeType | null) ?? undefined,
    note: row.note ?? undefined,
    validFrom: row.valid_from ?? undefined,
    expiry: row.expiry ?? undefined,
    balance: row.balance ?? undefined,
    balanceType: row.balance_type ?? undefined,
    color: row.color ?? undefined,
    icon: row.icon ?? undefined,
    favorite: row.favorite === 1,
    archived: row.archived === 1,
    showOnLockScreen: row.show_on_lock_screen === 1,
    homepageUrl: row.homepage_url ?? undefined,
    shopSearchTerm: row.shop_search_term ?? undefined,
    tagIds,
    websites,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastUsedAt: row.last_used_at ?? undefined,
  };
  return Object.fromEntries(Object.entries(card).filter(([, value]) => value !== undefined)) as unknown as Card;
}
