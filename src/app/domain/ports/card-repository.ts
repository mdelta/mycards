import type { Card } from '../model/card';

/** Storage port for cards (ADR-0003). Implemented in the infrastructure layer. */
export interface CardRepository {
  findAll(): Promise<Card[]>;
  findById(id: string): Promise<Card | undefined>;
  save(card: Card): Promise<void>;
  delete(id: string): Promise<void>;
}
