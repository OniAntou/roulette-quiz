import { useEffect, useRef } from 'react';
import { socketClient } from '../network/SocketClient';
import { Player, CardData, TriggerResult, ActiveQuestion, QuestionResult, WinnerInfo, GamePhase, Screen } from '../types';
import { Sounds } from '../audio/Sounds';

export interface GameSocketCallbacks {
  setRoomId: React.Dispatch<React.SetStateAction<string>>;
  setLocalPlayerId: React.Dispatch<React.SetStateAction<string>>;
  setErrorMsg: React.Dispatch<React.SetStateAction<string>>;
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
  setRound: React.Dispatch<React.SetStateAction<number>>;
  setPhase: React.Dispatch<React.SetStateAction<GamePhase>>;
  setPlayedCard: React.Dispatch<React.SetStateAction<CardData | null>>;
  setActiveQuestion: React.Dispatch<React.SetStateAction<ActiveQuestion | null>>;
  setQuestionResult: React.Dispatch<React.SetStateAction<QuestionResult | null>>;
  setTriggerResult: React.Dispatch<React.SetStateAction<TriggerResult | null>>;
  setScreen: React.Dispatch<React.SetStateAction<Screen>>;
  setHandCards: React.Dispatch<React.SetStateAction<CardData[]>>;
  setCurrentTurnId: React.Dispatch<React.SetStateAction<string>>;
  setWinnerInfo: React.Dispatch<React.SetStateAction<WinnerInfo | null>>;
}

export function useGameSocket(
  localPlayerId: string,
  playerName: string,
  callbacks: GameSocketCallbacks
) {
  // Use refs to avoid stale closures in socket listeners
  const localPlayerIdRef = useRef<string>(localPlayerId);
  localPlayerIdRef.current = localPlayerId;
  
  const playerNameRef = useRef<string>(playerName);
  playerNameRef.current = playerName;

  useEffect(() => {
    socketClient.on('room:created', (data: { roomId: string; playerId: string }) => {
      callbacks.setRoomId(data.roomId);
      callbacks.setLocalPlayerId(data.playerId);
      callbacks.setErrorMsg('');
    });

    socketClient.on('room:joined', (data: { roomId: string; playerId: string }) => {
      callbacks.setRoomId(data.roomId);
      callbacks.setLocalPlayerId(data.playerId);
      callbacks.setErrorMsg('');
    });

    socketClient.on('room:players', (data: { players: Player[] }) => {
      callbacks.setPlayers(data.players);
    });

    socketClient.on('room:left', () => {
      callbacks.setRoomId('');
      callbacks.setLocalPlayerId('');
      callbacks.setPlayers([]);
    });

    socketClient.on('game:start', (data: { players: Player[]; round: number }) => {
      callbacks.setPlayers(data.players);
      callbacks.setRound(data.round || 1);
      callbacks.setPhase('waiting');
      callbacks.setPlayedCard(null);
      callbacks.setActiveQuestion(null);
      callbacks.setQuestionResult(null);
      callbacks.setTriggerResult(null);
      callbacks.setScreen('game');
    });

    socketClient.on('game:deal', (data: { cards: CardData[] }) => {
      callbacks.setHandCards(data.cards);
    });

    socketClient.on('game:turn', (data: { playerId: string }) => {
      callbacks.setCurrentTurnId(data.playerId);
      callbacks.setPhase('choosing');
      callbacks.setPlayedCard(null);
      callbacks.setActiveQuestion(null);
      callbacks.setQuestionResult(null);
    });

    socketClient.on('game:cardPlayed', (data: { playerId: string; card: CardData }) => {
      callbacks.setPlayedCard(data.card);
      callbacks.setPhase('questioning');

      callbacks.setPlayers(prev => prev.map(p => {
        if (p.id === data.playerId) {
          return { ...p, cardsCount: (p.cardsCount || 4) - 1 };
        }
        return p;
      }));

      if (data.playerId === localPlayerIdRef.current) {
        callbacks.setHandCards(prev => prev.filter(c => c.id !== data.card.id));
      }
    });

    socketClient.on('game:question', (data: { card: any; timer: number; from: string }) => {
      callbacks.setActiveQuestion({
        card: data.card,
        timer: data.timer,
        from: data.from
      });
      callbacks.setPhase('answering');
    });

    socketClient.on('game:result', (data: { correct: boolean; correctAnswer: string }) => {
      if (data.correct) {
        Sounds.correct();
      } else {
        Sounds.wrong();
      }
      callbacks.setQuestionResult({
        correct: data.correct,
        correctAnswer: data.correctAnswer
      });
      callbacks.setPhase('result');

      setTimeout(() => {
        callbacks.setActiveQuestion(null);
        callbacks.setQuestionResult(null);
      }, 2500);
    });

    socketClient.on('game:trigger', (data: TriggerResult) => {
      callbacks.setPhase('trigger');
      callbacks.setTriggerResult({
        alive: data.alive,
        playerId: data.playerId,
        playerName: data.playerName,
        bulletCount: data.bulletCount,
        currentPosition: data.currentPosition,
        bulletsFired: data.bulletsFired,
        shotsFired: data.shotsFired,
      });

      if (data.playerId) {
        callbacks.setPlayers(prev => prev.map(p => {
          if (p.id === data.playerId) {
            return {
              ...p,
              shotsFired: data.shotsFired,
            };
          }
          return p;
        }));

        if (!data.alive) {
          setTimeout(() => {
            callbacks.setPlayers(prev => prev.map(p => {
              if (p.id === data.playerId) {
                return { ...p, isAlive: false };
              }
              return p;
            }));
          }, 1320);
        }
      }

      setTimeout(() => {
        callbacks.setTriggerResult(null);
      }, 5000);
    });

    socketClient.on('game:standoffResult', (data: { results: { playerId: string; alive: boolean }[] }) => {
      callbacks.setPhase('trigger');
      const someoneDied = data.results.some(r => !r.alive);
      callbacks.setTriggerResult({
        alive: !someoneDied,
        playerId: 'STANDOFF',
        playerName: 'STANDOFF',
        bulletCount: 0,
        currentPosition: 0,
        bulletsFired: 0,
        shotsFired: 0,
        results: data.results
      });

      callbacks.setPlayers(prev => prev.map(p => {
        const result = data.results.find(r => r.playerId === p.id);
        if (result) {
          return {
            ...p,
            shotsFired: (p.shotsFired || 0) + 1,
          };
        }
        return p;
      }));

      if (someoneDied) {
        setTimeout(() => {
          callbacks.setPlayers(prev => prev.map(p => {
            const result = data.results.find(r => r.playerId === p.id);
            if (result && !result.alive) {
              return { ...p, isAlive: false };
            }
            return p;
          }));
        }, 920);
      }

      const delay = someoneDied ? 5000 : 2500;
      setTimeout(() => {
        callbacks.setTriggerResult(null);
      }, delay);
    });

    socketClient.on('game:newRound', (data: { round: number }) => {
      Sounds.newRound();
      callbacks.setRound(data.round);
    });

    socketClient.on('game:over', (data: { winner: string; winnerId?: string; stats?: any }) => {
      const curLocalId = localPlayerIdRef.current;
      const curPlayerName = playerNameRef.current;
      const isLocal = data.winnerId ? data.winnerId === curLocalId : data.winner === curPlayerName;
      if (isLocal) {
        Sounds.victory();
      }
      callbacks.setWinnerInfo({
        winner: data.winner,
        isLocalWinner: isLocal,
        stats: data.stats,
      });
      callbacks.setPhase('game_over');

      setTimeout(() => {
        callbacks.setScreen(prev => prev === 'game' ? 'gameover' : prev);
      }, 3000);
    });

    socketClient.on('game:playerLeft', (data: { playerId: string }) => {
      callbacks.setPlayers(prev => prev.map(p => {
        if (p.id === data.playerId) {
          return { ...p, isAlive: false };
        }
        return p;
      }));
    });

    socketClient.on('game:playerLeftAfterDeath', (data: { playerId: string }) => {
      callbacks.setPlayers(prev => prev.filter(p => p.id !== data.playerId));
    });

    socketClient.on('game:cardsUpdate', (data: { players: { id: string; cardsCount: number; isAlive: boolean; shotsFired: number }[] }) => {
      callbacks.setPlayers(prev => prev.map(p => {
        const update = data.players.find((u: any) => u.id === p.id);
        if (update) {
          return { ...p, cardsCount: update.cardsCount, isAlive: update.isAlive, shotsFired: update.shotsFired };
        }
        return p;
      }));
    });

    socketClient.on('error', (data: { message: string }) => {
      callbacks.setErrorMsg('EXCEPTION // ' + data.message.toUpperCase());
    });

    return () => {
      ['room:created', 'room:joined', 'room:players', 'room:left', 'game:start', 'game:deal', 'game:turn', 'game:cardPlayed', 'game:question', 'game:result', 'game:trigger', 'game:standoffResult', 'game:newRound', 'game:over', 'game:playerLeft', 'game:playerLeftAfterDeath', 'game:cardsUpdate', 'error'].forEach(event => {
        socketClient.clearListeners(event);
      });
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount
}
