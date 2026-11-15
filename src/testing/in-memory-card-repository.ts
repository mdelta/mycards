import type { Card, Tag } from '../app/domain/model/card';
import type { CardRepository } from '../app/domain/ports/card-repository';

/** `CardRepository` fake for unit tests; stores deep copies to mimic a real database. */
export class InMemoryCardRepository implements CardRepository {
  private readonly cards = new Map<string, Card>();
  private readonly tags = new Map<string, Tag>();

  constructor(cards: Card[] = [], tags: Tag[] = []) {
    tags.forEach((tag) => this.tags.set(tag.id, { ...tag }));
    cards.forEach((card) => this.cards.set(card.id, structuredClone(card)));
  }

  async findAll(): Promise<Card[]> {
    return [...this.cards.values()].map((card) => structuredClone(card));
  }

  async findById(id: string): Promise<Card | undefined> {
    const card = this.cards.get(id);
    return card && structuredClone(card);
  }

  async save(card: Card): Promise<void> {
    this.cards.set(card.id, structuredClone(card));
    this.deleteUnusedTags();
  }

  async updateLastUsed(id: string, lastUsedAt: string): Promise<void> {
    const card = this.cards.get(id);
    if (card) {
      card.lastUsedAt = lastUsedAt;
    }
  }

  async delete(id: string): Promise<void> {
    this.cards.delete(id);
    this.deleteUnusedTags();
  }

  async saveAll(
    cards: readonly Card[],
    options: { deleteOthers?: boolean; tags?: readonly Tag[] } = {},
  ): Promise<void> {
    if (options.deleteOthers) {
      this.cards.clear();
      this.tags.clear();
    }
    options.tags?.forEach((tag) => this.tags.set(tag.id, { ...tag }));
    cards.forEach((card) => this.cards.set(card.id, structuredClone(card)));
    this.deleteUnusedTags();
  }

  async findAllTags(): Promise<Tag[]> {
    return [...this.tags.values()].map((tag) => ({ ...tag }));
  }

  async saveTag(tag: Tag): Promise<void> {
    if ([...this.tags.values()].some((other) => other.id !== tag.id && other.name === tag.name)) {
      throw new Error(`Duplicate tag name: ${tag.name}`);
    }
    this.tags.set(tag.id, { ...tag });
  }

  private deleteUnusedTags(): void {
    const used = new Set([...this.cards.values()].flatMap((card) => card.tagIds));
    [...this.tags.keys()].filter((id) => !used.has(id)).forEach((id) => this.tags.delete(id));
  }
}
