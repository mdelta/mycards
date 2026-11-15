import type { Card, Tag } from '../model/card';

/**
 * Storage port for cards and their tags (ADR-0003). Implemented in the infrastructure layer.
 * Every card write also deletes tags that no card uses any more.
 */
export interface CardRepository {
  findAll(): Promise<Card[]>;
  findById(id: string): Promise<Card | undefined>;
  save(card: Card): Promise<void>;
  /** Sets only `lastUsedAt`, so it cannot overwrite concurrent edits; no-op for unknown ids. */
  updateLastUsed(id: string, lastUsedAt: string): Promise<void>;
  delete(id: string): Promise<void>;
  /**
   * Saves all `tags` and `cards` in one transaction (import, ADR-0004): existing cards and tags with
   * the same id are replaced, others are kept unless `deleteOthers` is set.
   */
  saveAll(cards: readonly Card[], options?: { deleteOthers?: boolean; tags?: readonly Tag[] }): Promise<void>;
  findAllTags(): Promise<Tag[]>;
  /** Creates or renames a tag; names are unique. */
  saveTag(tag: Tag): Promise<void>;
}
