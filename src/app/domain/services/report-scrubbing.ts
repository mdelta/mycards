import type { Card, Tag } from '../model/card';

export const CARD_DATA_PLACEHOLDER = '[card data]';
const MIN_SENSITIVE_LENGTH = 3;
const MAX_MESSAGE_LENGTH = 500;

/** Texts of cards and tags that must never appear in a report (ADR-0018). */
export function sensitiveTexts(cards: readonly Card[], tags: readonly Tag[]): string[] {
  const texts = cards.flatMap((card) => [
    card.storeName,
    card.cardId,
    card.barcodeValue,
    card.note,
    ...(card.note?.split('\n') ?? []),
    card.homepageUrl,
    card.shopSearchTerm,
    ...card.websites.flatMap((site) => [site.url, site.label]),
  ]);
  return [...texts, ...tags.map((tag) => tag.name)]
    .map((text) => text?.trim() ?? '')
    .filter((text) => text.length >= MIN_SENSITIVE_LENGTH);
}

/**
 * Removes card content and anything that looks like user input from an error message: known card
 * texts, quoted text and numbers with four or more digits.
 */
export function scrubText(text: string, sensitive: readonly string[]): string {
  let result = text;
  for (const value of [...new Set(sensitive)].sort((a, b) => b.length - a.length)) {
    result = result.replace(new RegExp(escapeRegExp(value), 'gi'), CARD_DATA_PLACEHOLDER);
  }
  result = result.replace(/(["'`])(?:(?!\1)[^\n])*\1/g, '$1[text]$1').replace(/\d{4,}/g, '[number]');
  return result.length > MAX_MESSAGE_LENGTH ? `${result.slice(0, MAX_MESSAGE_LENGTH)}…` : result;
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
