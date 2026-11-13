import type { Card } from '../app/domain/model/card';
import type { CardRepository } from '../app/domain/ports/card-repository';

/** `CardRepository` fake for unit tests; stores deep copies to mimic a real database. */
export class InMemoryCardRepository implements CardRepository {
  private readonly cards = new Map<string, Card>();

  constructor(cards: Card[] = []) {
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
  }

  async updateLastUsed(id: string, lastUsedAt: string): Promise<void> {
    const card = this.cards.get(id);
    if (card) {
      card.lastUsedAt = lastUsedAt;
    }
  }

  async delete(id: string): Promise<void> {
    this.cards.delete(id);
  }
}
