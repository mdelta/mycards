import type { Tag } from '../model/card';

import type { BackupContent } from './backup-document';

/**
 * Prepares a normal (not clean) import: imported tags are matched to existing tags by name (ignoring
 * case), so no duplicates appear; an imported tag whose id is taken by another tag gets a new id.
 */
export function mergeImportedTags(content: BackupContent, existing: readonly Tag[], newId: () => string): BackupContent {
  const idsByName = new Map(existing.map((tag) => [tag.name.toLocaleLowerCase(), tag.id]));
  const takenIds = new Set(existing.map((tag) => tag.id));
  const idMap = new Map<string, string>();
  const tags: Tag[] = [];
  for (const tag of content.tags) {
    const match = idsByName.get(tag.name.toLocaleLowerCase());
    if (match) {
      idMap.set(tag.id, match);
    } else {
      const id = takenIds.has(tag.id) ? newId() : tag.id;
      idMap.set(tag.id, id);
      tags.push({ id, name: tag.name });
    }
  }
  return {
    tags,
    cards: content.cards.map((card) => ({ ...card, tagIds: card.tagIds.map((id) => idMap.get(id) ?? id) })),
  };
}
