import { GameState } from './types';

export class TimeoutManager {
  static clearChoosing(game: GameState): void {
    if (game.triggerTimeout) { // We used triggerTimeout for choosing turn time
      clearTimeout(game.triggerTimeout);
      game.triggerTimeout = undefined;
    }
  }

  static clearTrigger(game: GameState): void {
    if (game.triggerTimeout) {
      clearTimeout(game.triggerTimeout);
      game.triggerTimeout = undefined;
    }
  }

  static clearPostTrigger(game: GameState): void {
    if (game.postTriggerTimeout) {
      clearTimeout(game.postTriggerTimeout);
      game.postTriggerTimeout = undefined;
    }
  }

  static clearAll(game: GameState): void {
    this.clearChoosing(game);
    this.clearTrigger(game);
    this.clearPostTrigger(game);
  }
}
