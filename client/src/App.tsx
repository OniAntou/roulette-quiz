import React, { useState, useEffect, useCallback, useRef } from 'react';
import { socketClient } from './network/SocketClient';
import { MainMenu } from './components/MainMenu';
import { Lobby } from './components/Lobby';
import { GameBoard } from './components/GameBoard';
import { GameOver } from './components/GameOver';
import { Screen, ConnectionStatus, GamePhase, Player, CardData, ActiveQuestion, QuestionResult, TriggerResult, WinnerInfo } from './types';
import { Sounds } from './audio/Sounds';
import { useBotGame } from './hooks/useBotGame';

export default function App() {
  const [screen, setScreen] = useState<Screen>('menu');
  const [playerName, setPlayerName] = useState<string>('GUEST');
  const [roomId, setRoomId] = useState<string>('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [localPlayerId, setLocalPlayerId] = useState<string>('');
  const [gameMode, setGameMode] = useState<string>('online');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const [round, setRound] = useState<number>(1);
  const [phase, setPhase] = useState<GamePhase>('waiting');
  const [currentTurnId, setCurrentTurnId] = useState<string>('');
  const [handCards, setHandCards] = useState<CardData[]>([]);
  const [playedCard, setPlayedCard] = useState<CardData | null>(null);
  const [activeQuestion, setActiveQuestion] = useState<ActiveQuestion | null>(null);
  const [questionResult, setQuestionResult] = useState<QuestionResult | null>(null);
  const [triggerResult, setTriggerResult] = useState<TriggerResult | null>(null);
  const [winnerInfo, setWinnerInfo] = useState<WinnerInfo | null>(null);

  // Refs to access latest state inside socket callbacks (avoids stale closure)
  const phaseRef = useRef<GamePhase>(phase);
  phaseRef.current = phase;
  const localPlayerIdRef = useRef<string>(localPlayerId);
  localPlayerIdRef.current = localPlayerId;
  const playerNameRef = useRef<string>(playerName);
  playerNameRef.current = playerName;

  const botCallbacks = {
    setScreen,
    setRound,
    setPhase,
    setCurrentTurnId,
    setHandCards,
    setPlayedCard,
    setActiveQuestion,
    setQuestionResult,
    setTriggerResult,
    setPlayers,
    setWinnerInfo,
    setLocalPlayerId,
  };

  const {
    botMode,
    startBotGame,
    handleBotDisconnect,
    handleBotCardChoice,
    handleBotModePlayerAnswer,
    botHudMessage,
    isSpectating,
    syncHandCards,
    syncPlayers,
    syncPhase,
    syncCurrentTurn,
  } = useBotGame(playerName, botCallbacks);

  const handleStartBotGame = useCallback((count: number, name: string) => {
    setPlayerName(name);
    setLocalPlayerId('local-player');
    startBotGame(count, name);
  }, [startBotGame]);

  // Sync state to bot refs
  useEffect(() => { syncHandCards(handCards); }, [handCards, syncHandCards]);
  useEffect(() => { syncPlayers(players); }, [players, syncPlayers]);
  useEffect(() => { syncPhase(phase); }, [phase, syncPhase]);
  useEffect(() => { syncCurrentTurn(currentTurnId); }, [currentTurnId, syncCurrentTurn]);

  const connectToServer = (mode: string, name: string, ip?: string) => {
    setPlayerName(name);
    setGameMode(mode);
    setConnectionStatus('connecting');
    setErrorMsg('');
    socketClient.playerName = name;

    const baseHost = window.location.hostname || 'localhost';
    const defaultOnlineServer = import.meta.env.VITE_SERVER_URL || 
      (window.location.port === '5173' ? `http://${baseHost}:3000` : window.location.origin);
    const serverUrl = (mode === 'lan' && ip)
      ? ((ip.startsWith('http://') || ip.startsWith('https://')) ? ip : `http://${ip}`)
      : defaultOnlineServer;

    socketClient.connect(serverUrl)
      .then(() => {
        setConnectionStatus('connected');
        setScreen('lobby');
      })
      .catch((err: Error) => {
        setConnectionStatus('disconnected');
        setErrorMsg('SERVER LINK TIMEOUT. RETRY CONNECTION.');
        console.error(err);
      });
  };

  const handleDisconnect = () => {
    socketClient.disconnect();
    setConnectionStatus('disconnected');
    setScreen('menu');
    setRoomId('');
    setPlayers([]);
    setLocalPlayerId('');
    setHandCards([]);
    setPlayedCard(null);
    setActiveQuestion(null);
    setQuestionResult(null);
    setTriggerResult(null);
  };

  const handleLeaveAfterDeath = () => {
    if (botMode) {
      handleBotDisconnect();
    } else {
      socketClient.leaveAfterDeath(roomId);
      handleDisconnect();
    }
  };

  // Socket event listeners - using refs for latest state, dependencies only on stable refs
  useEffect(() => {
    socketClient.on('room:created', (data: { roomId: string; playerId: string }) => {
      setRoomId(data.roomId);
      setLocalPlayerId(data.playerId);
      setErrorMsg('');
    });

    socketClient.on('room:joined', (data: { roomId: string; playerId: string }) => {
      setRoomId(data.roomId);
      setLocalPlayerId(data.playerId);
      setErrorMsg('');
    });

    socketClient.on('room:players', (data: { players: Player[] }) => {
      setPlayers(data.players);
    });

    socketClient.on('room:left', () => {
      setRoomId('');
      setLocalPlayerId('');
      setPlayers([]);
    });

    socketClient.on('game:start', (data: { players: Player[]; round: number }) => {
      setPlayers(data.players);
      setRound(data.round || 1);
      setPhase('waiting');
      setPlayedCard(null);
      setActiveQuestion(null);
      setQuestionResult(null);
      setTriggerResult(null);
      setScreen('game');
    });

    socketClient.on('game:deal', (data: { cards: CardData[] }) => {
      setHandCards(data.cards);
      setPhase('choosing');
    });

    socketClient.on('game:turn', (data: { playerId: string }) => {
      setCurrentTurnId(data.playerId);
      setPhase('choosing');
      setPlayedCard(null);
      setActiveQuestion(null);
      setQuestionResult(null);
    });

    socketClient.on('game:cardPlayed', (data: { playerId: string; card: CardData }) => {
      setPlayedCard(data.card);
      setPhase('questioning');

      setPlayers(prev => prev.map(p => {
        if (p.id === data.playerId) {
          return { ...p, cardsCount: (p.cardsCount || 4) - 1 };
        }
        return p;
      }));

      // Remove played card from local player's hand
      if (data.playerId === localPlayerIdRef.current) {
        setHandCards(prev => prev.filter(c => c.id !== data.card.id));
      }
    });

    socketClient.on('game:question', (data: { card: any; timer: number; from: string }) => {
      setActiveQuestion({
        card: data.card,
        timer: data.timer,
        from: data.from
      });
      setPhase('answering');
    });

    socketClient.on('game:result', (data: { correct: boolean; correctAnswer: string }) => {
      if (data.correct) {
        Sounds.correct();
      } else {
        Sounds.wrong();
      }
      setQuestionResult({
        correct: data.correct,
        correctAnswer: data.correctAnswer
      });
      setPhase('result');

      setTimeout(() => {
        setActiveQuestion(null);
        setQuestionResult(null);
      }, 2500);
    });

    socketClient.on('game:trigger', (data: TriggerResult) => {
      setPhase('trigger');
      setTriggerResult({
        alive: data.alive,
        playerId: data.playerId,
        playerName: data.playerName,
        bulletCount: data.bulletCount,
        currentPosition: data.currentPosition,
        bulletsFired: data.bulletsFired,
        shotsFired: data.shotsFired,
      });

      if (data.playerId) {
        setPlayers(prev => prev.map(p => {
          if (p.id === data.playerId) {
            return {
              ...p,
              isAlive: data.alive ? p.isAlive : false,
              shotsFired: data.shotsFired ?? p.shotsFired,
            };
          }
          return p;
        }));
      }

      setTimeout(() => {
        setTriggerResult(null);
      }, 5000);
    });

    socketClient.on('game:standoffResult', (data: { results: { playerId: string; alive: boolean }[] }) => {
      setPhase('trigger'); // Reuse trigger phase for visual logic
      const someoneDied = data.results.some(r => !r.alive);
      setTriggerResult({
        alive: !someoneDied,
        playerId: 'STANDOFF', // Special flag
        playerName: 'STANDOFF',
        bulletCount: 0,
        currentPosition: 0,
        bulletsFired: 0,
        shotsFired: 0,
        results: data.results // Pass the array of results
      });

      setPlayers(prev => prev.map(p => {
        const result = data.results.find(r => r.playerId === p.id);
        if (result) {
          return {
            ...p,
            isAlive: result.alive ? p.isAlive : false,
            shotsFired: (p.shotsFired || 0) + 1,
          };
        }
        return p;
      }));

      const delay = someoneDied ? 5000 : 2500;
      setTimeout(() => {
        setTriggerResult(null);
      }, delay);
    });

    socketClient.on('game:newRound', (data: { round: number }) => {
      Sounds.newRound();
      setRound(data.round);
    });

    socketClient.on('game:over', (data: { winner: string; winnerId?: string }) => {
      const curLocalId = localPlayerIdRef.current;
      const curPlayerName = playerNameRef.current;
      const isLocal = data.winnerId ? data.winnerId === curLocalId : data.winner === curPlayerName;
      if (isLocal) {
        Sounds.victory();
      }
      setWinnerInfo({
        winner: data.winner,
        isLocalWinner: isLocal
      });
      setPhase('game_over');

      setTimeout(() => {
        setScreen(prev => prev === 'game' ? 'gameover' : prev);
      }, 3000);
    });

    socketClient.on('game:playerLeft', (data: { playerId: string }) => {
      // Mark disconnected player as dead in UI
      // Server handles game state - will send game:over if game should end,
      // or continue the game with remaining players
      setPlayers(prev => prev.map(p => {
        if (p.id === data.playerId) {
          return { ...p, isAlive: false };
        }
        return p;
      }));
    });

    socketClient.on('game:playerLeftAfterDeath', (data: { playerId: string }) => {
      setPlayers(prev => prev.filter(p => p.id !== data.playerId));
    });

    socketClient.on('game:cardsUpdate', (data: { players: { id: string; cardsCount: number; isAlive: boolean; shotsFired: number }[] }) => {
      setPlayers(prev => prev.map(p => {
        const update = data.players.find((u: any) => u.id === p.id);
        if (update) {
          return { ...p, cardsCount: update.cardsCount, isAlive: update.isAlive, shotsFired: update.shotsFired };
        }
        return p;
      }));
    });

    socketClient.on('error', (data: { message: string }) => {
      setErrorMsg('EXCEPTION // ' + data.message.toUpperCase());
    });

    return () => {
      ['room:created', 'room:joined', 'room:players', 'room:left', 'game:start', 'game:deal', 'game:turn', 'game:cardPlayed', 'game:question', 'game:result', 'game:trigger', 'game:newRound', 'game:over', 'game:playerLeft', 'game:playerLeftAfterDeath', 'game:cardsUpdate', 'error'].forEach(event => {
        socketClient.clearListeners(event);
      });
    };
  }, []);

  return (
    <main className="w-screen h-screen tech-grid overflow-hidden relative flex items-center justify-center">
      {screen === 'menu' && (
        <MainMenu
          connect={connectToServer}
          startBot={handleStartBotGame}
          error={errorMsg}
          status={connectionStatus}
        />
      )}
      {screen === 'lobby' && (
        <Lobby
          roomId={roomId}
          players={players}
          localId={localPlayerId}
          error={errorMsg}
          disconnect={handleDisconnect}
        />
      )}
      {screen === 'game' && (
        <GameBoard
          round={round}
          phase={phase}
          players={players}
          localId={localPlayerId}
          currentTurnId={currentTurnId}
          handCards={handCards}
          playedCard={playedCard}
          activeQuestion={activeQuestion}
          questionResult={questionResult}
          triggerResult={triggerResult}
          roomId={roomId}
          onLeaveAfterDeath={handleLeaveAfterDeath}
          onCardChoice={botMode ? (cardId: string) => handleBotCardChoice(cardId, phase, currentTurnId, handCards) : undefined}
          onAnswerSubmit={botMode ? (letter: string) => handleBotModePlayerAnswer(letter, phase, activeQuestion) : undefined}
          botHudMessage={botMode ? botHudMessage : null}
          isBotSpectating={botMode ? isSpectating : false}
        />
      )}
      {screen === 'gameover' && (
        <GameOver
          winnerInfo={winnerInfo}
          disconnect={handleDisconnect}
        />
      )}
    </main>
  );
}
