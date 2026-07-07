import { GameState } from './types';

export class TimeoutManager {
  static clearAnswer(game: GameState): void {
    if (game.answerTimeout) {
      clearTimeout(game.answerTimeout);
      game.answerTimeout = undefined;
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
    this.clearAnswer(game);
    this.clearTrigger(game);
    this.clearPostTrigger(game);
  }
}
