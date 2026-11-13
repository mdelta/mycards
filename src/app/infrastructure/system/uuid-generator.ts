import type { IdGenerator } from '../../domain/ports/id-generator';

export class UuidGenerator implements IdGenerator {
  newId(): string {
    return crypto.randomUUID();
  }
}
