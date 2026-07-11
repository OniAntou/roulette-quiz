export type RuleCard = {
  id: string;
  type: 'NUMBER' | 'JOKER' | 'SKIP' | 'BLOCK' | 'REVERSE' | 'STANDOFF';
  value?: number;
};

export const EMPTY_TABLE = 0;
export const JOKER_TABLE = -1;

export function canPlayCard(card: RuleCard, currentNumber: number): boolean {
  if (card.type === 'BLOCK') return false;
  if (currentNumber === JOKER_TABLE) {
    return card.type === 'JOKER' || card.type === 'SKIP' || card.type === 'REVERSE';
  }
  return card.type !== 'NUMBER' || (card.value ?? EMPTY_TABLE) >= currentNumber;
}

export function consumeBlock<T extends RuleCard>(hand: T[]): { used: boolean; hand: T[] } {
  const blockIndex = hand.findIndex(card => card.type === 'BLOCK');
  return blockIndex === -1
    ? { used: false, hand }
    : { used: true, hand: hand.filter((_, index) => index !== blockIndex) };
}
