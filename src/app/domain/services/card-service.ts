import type { Card, Tag } from '../model/card';
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

  async list(query = '', tagId?: string): Promise<Card[]> {
    return filterCards(await this.repository.findAll(), query, tagId).sort(compareCards);
  }

  /** Tags in use, sorted by name (F-07). */
  async listTags(): Promise<Tag[]> {
    return (await this.repository.findAllTags()).sort((a, b) => a.name.localeCompare(b.name));
  }

  /** Returns the tag with this name (ignoring case), creating it if needed. */
  async ensureTag(name: string): Promise<Tag> {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new Error('Tag name is required');
    }
    const existing = (await this.repository.findAllTags()).find(
      (tag) => tag.name.toLocaleLowerCase() === trimmed.toLocaleLowerCase(),
    );
    if (existing) {
      return existing;
    }
    const tag = { id: this.ids.newId(), name: trimmed };
    await this.repository.saveTag(tag);
    return tag;
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
      websites: [],
      photos: [],
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

  /** Records that the card was shown (`lastUsedAt`); not an edit, so no validation and no `updatedAt`. */
  markUsed(id: string): Promise<void> {
    return this.repository.updateLastUsed(id, this.clock.now());
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
