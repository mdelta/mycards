import type { Card, Tag } from '../model/card';
import type { CardRepository } from '../ports/card-repository';

/** Delegates to `repository` and calls `onChange` after each successful write of cards. */
export class NotifyingCardRepository implements CardRepository {
  constructor(
    private readonly repository: CardRepository,
    private readonly onChange: () => void,
  ) {}

  findAll(): Promise<Card[]> {
    return this.repository.findAll();
  }

  findById(id: string): Promise<Card | undefined> {
    return this.repository.findById(id);
  }

  async save(card: Card): Promise<void> {
    await this.repository.save(card);
    this.onChange();
  }

  updateLastUsed(id: string, lastUsedAt: string): Promise<void> {
    return this.repository.updateLastUsed(id, lastUsedAt);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
    this.onChange();
  }

  async saveAll(cards: readonly Card[], options?: { deleteOthers?: boolean; tags?: readonly Tag[] }): Promise<void> {
    await this.repository.saveAll(cards, options);
    this.onChange();
  }

  findAllTags(): Promise<Tag[]> {
    return this.repository.findAllTags();
  }

  saveTag(tag: Tag): Promise<void> {
    return this.repository.saveTag(tag);
  }
}
