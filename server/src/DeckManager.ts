import { v4 as uuidv4 } from 'uuid';
import { Card, CardType } from './types';

export class DeckManager {
  private static generateDeck(): Card[] {
    const deck: Card[] = [];

    // Numbers 1-9 (4 copies each = 36 cards)
    for (let i = 1; i <= 9; i++) {
      for (let j = 0; j < 12; j++) {
        deck.push({ id: uuidv4(), type: 'NUMBER', value: i });
      }
    }

    // Skill cards
    for (let i = 0; i < 4; i++) deck.push({ id: uuidv4(), type: 'SKIP' });
    for (let i = 0; i < 1; i++) deck.push({ id: uuidv4(), type: 'BLOCK' });
    for (let i = 0; i < 4; i++) deck.push({ id: uuidv4(), type: 'REVERSE' });
    for (let i = 0; i < 2; i++) deck.push({ id: uuidv4(), type: 'JOKER' });
    for (let i = 0; i < 1; i++) deck.push({ id: uuidv4(), type: 'STANDOFF' });

    return this.shuffle(deck);
  }

  public static shuffle(deck: Card[]): Card[] {
    const newDeck = [...deck];
    for (let i = newDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
    }
    return newDeck;
  }

  public static getShuffledDeck(): Card[] {
    return this.generateDeck();
  }
}
