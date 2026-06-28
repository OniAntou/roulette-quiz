import React, { useState, useEffect, useCallback } from 'react';
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
    startBotGame(count);
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
    const serverUrl = (mode === 'lan' && ip) ? `http://${ip}` : `http://${baseHost}:3000`;

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

    socketClient.on('game:newRound', (data: { round: number }) => {
      Sounds.newRound();
      setRound(data.round);
    });

    socketClient.on('game:over', (data: { winner: string; winnerId?: string }) => {
      const isLocal = data.winnerId ? data.winnerId === localPlayerId : data.winner === playerName;
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

    socketClient.on('game:playerLeft', () => {
      setErrorMsg('OPPONENT DISCONNECTED FROM SYSTEM.');
      setTimeout(() => {
        handleDisconnect();
      }, 3000);
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
  }, [playerName, localPlayerId]);

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
