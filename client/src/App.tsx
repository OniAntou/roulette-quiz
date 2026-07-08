import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { socketClient } from './network/SocketClient';
import { MainMenu } from './components/MainMenu';
import { Lobby } from './components/Lobby';
import { GameBoard } from './components/GameBoard';
import { GameOver } from './components/GameOver';
import { ChatBox } from './components/ChatBox';
import { Screen, ConnectionStatus, GamePhase, Player, Card, TriggerResult, WinnerInfo } from './types';
import { useBotGame } from './hooks/useBotGame';
import { useGameSocket } from './hooks/useGameSocket';

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
  const [handCards, setHandCards] = useState<Card[]>([]);
  const [playedCard, setPlayedCard] = useState<Card | null>(null);
  const [currentNumber, setCurrentNumber] = useState<number>(0);
  const [direction, setDirection] = useState<number>(1);
  const [triggerResult, setTriggerResult] = useState<TriggerResult | null>(null);
  const [winnerInfo, setWinnerInfo] = useState<WinnerInfo | null>(null);

  const botCallbacks = {
    setScreen,
    setRound,
    setPhase,
    setCurrentTurnId,
    setHandCards,
    setPlayedCard,
    setCurrentNumber,
    setDirection,
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
    handleBotPullTrigger,
    handleBotMulligan,
    handleBotModePlayerAnswer,
    botHudMessage,
    isSpectating,
    syncHandCards,
    syncPlayers,
    syncPhase,
    syncCurrentTurn,
    turnEndTime,
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
    setErrorMsg('');
    socketClient.playerName = name;

    const connectAndGo = (url: string) => {
      setConnectionStatus('connecting');
      socketClient.connect(url)
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

    if (mode === 'lan' && ip) {
      const serverUrl = (ip.startsWith('http://') || ip.startsWith('https://')) ? ip : `http://${ip}`;
      socketClient.disconnect();
      connectAndGo(serverUrl);
    } else if (mode === 'online') {
      if (socketClient.isConnected()) {
        // Already auto-connected, go straight to lobby
        setScreen('lobby');
      } else {
        const baseHost = window.location.hostname || 'localhost';
        const defaultServer = import.meta.env.VITE_SERVER_URL || 
          (window.location.port === '5173' ? `http://${baseHost}:3000` : window.location.origin);
        connectAndGo(defaultServer);
      }
    }
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
    setCurrentNumber(0);
    setDirection(1);
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

  // Auto-connect socket on mount so ChatBox works from Main Menu
  useEffect(() => {
    const serverUrl = import.meta.env.VITE_SERVER_URL || 
      (window.location.port === '5173' ? `http://${window.location.hostname}:3000` : window.location.origin);
    socketClient.connect(serverUrl)
      .then(() => setConnectionStatus('connected'))
      .catch(() => {});
  }, []);

  // Use the custom socket hook to handle all game network events
  const socketCallbacks = useMemo(() => ({
    setRoomId,
    setLocalPlayerId,
    setErrorMsg,
    setPlayers,
    setRound,
    setPhase,
    setPlayedCard,
    setCurrentNumber,
    setDirection,
    setTriggerResult,
    setScreen,
    setHandCards,
    setCurrentTurnId,
    setWinnerInfo,
  }), []);

  useGameSocket(localPlayerId, playerName, socketCallbacks);

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
          currentNumber={currentNumber}
          direction={direction}
          triggerResult={triggerResult}
          roomId={roomId}
          onLeaveAfterDeath={handleLeaveAfterDeath}
          onCardChoice={botMode ? (cardId: string) => handleBotCardChoice(cardId) : undefined}
          onPullTrigger={botMode ? handleBotPullTrigger : undefined}
          onMulligan={botMode ? handleBotMulligan : undefined}
          botHudMessage={botMode ? botHudMessage : null}
          isBotSpectating={botMode ? isSpectating : false}
          turnEndTime={botMode ? turnEndTime : undefined}
        />
      )}
      {screen === 'gameover' && (
        <GameOver
          winnerInfo={winnerInfo}
          localId={localPlayerId}
          playerName={playerName}
          players={players}
          disconnect={botMode ? handleBotDisconnect : handleDisconnect}
        />
      )}
      {!botMode && <ChatBox roomId={roomId} localId={localPlayerId} />}
    </main>
  );
}
