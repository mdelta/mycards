import type { Card } from '../model/card';
import type { CardRepository } from '../ports/card-repository';
import type { Clock } from '../ports/clock';
import type { IdGenerator } from '../ports/id-generator';

import type { CardDraft, CardValidationError } from './card-draft';
import { normalizeCardDraft, validateCardDraft } from './card-draft';
import { filterCards } from './card-filter';
import { compareCards } from './card-order';

export class InvalidCardError extends Error {
  constructor(readonly errors: CardValidationError[]) {
    super(`Invalid card: ${errors.join(', ')}`);
  }
}

export class CardNotFoundError extends Error {
  constructor(readonly id: string) {
    super(`Card not found: ${id}`);
  }
}

/** Use cases for managing cards (F-01, F-10; arc42 5.1). */
export class CardService {
  constructor(
    private readonly repository: CardRepository,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
  ) {}

  async list(query = ''): Promise<Card[]> {
    return filterCards(await this.repository.findAll(), query).sort(compareCards);
  }

  get(id: string): Promise<Card | undefined> {
    return this.repository.findById(id);
  }

  async create(draft: CardDraft): Promise<Card> {
    const now = this.clock.now();
    const card: Card = {
      storeName: '',
      cardId: '',
      favorite: false,
      archived: false,
      showOnLockScreen: false,
      tagIds: [],
      ...normalizeCardDraft(draft),
      id: this.ids.newId(),
      createdAt: now,
      updatedAt: now,
    };
    return this.store(card);
  }

  async update(id: string, draft: CardDraft): Promise<Card> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new CardNotFoundError(id);
    }
    return this.store({ ...existing, ...normalizeCardDraft(draft), updatedAt: this.clock.now() });
  }

  delete(id: string): Promise<void> {
    return this.repository.delete(id);
  }

  private async store(card: Card): Promise<Card> {
    const errors = validateCardDraft(card);
    if (errors.length) {
      throw new InvalidCardError(errors);
    }
    await this.repository.save(card);
    return card;
  }
}
