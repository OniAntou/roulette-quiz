import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { GameBoard } from './GameBoard';
import { ThemeProvider } from '../theme/ThemeContext';

vi.mock('../network/SocketClient', () => ({
  socketClient: { send: vi.fn() },
}));

vi.mock('../audio/Sounds', () => ({
  Sounds: {
    buttonClick: vi.fn(),
    getVolume: vi.fn(() => 1),
    isMuted: vi.fn(() => false),
    setVolume: vi.fn(),
    setMuted: vi.fn(),
    initMuted: vi.fn(),
    startBGM: vi.fn(),
    stopBGM: vi.fn(),
    cardDeal: vi.fn(),
    cardFlip: vi.fn(),
    cardPlay: vi.fn(),
    gunClick: vi.fn(),
    gunFire: vi.fn(),
    gunSurvive: vi.fn(),
    countdown: vi.fn(),
    timerWarning: vi.fn(),
    heartbeat: vi.fn(),
  },
}));

describe('GameBoard', () => {
  it('renders the current number-card play surface', () => {
    render(
      <ThemeProvider><GameBoard
        round={1}
        phase="choosing"
        players={[
          { id: 'p1', name: 'P1', isAlive: true, cardsCount: 2, shotsFired: 0 },
          { id: 'p2', name: 'P2', isAlive: true, cardsCount: 2, shotsFired: 0 },
        ]}
        localId="p1"
        currentTurnId="p1"
        handCards={[
          { id: 'card-1', type: 'NUMBER', value: 3 },
          { id: 'card-2', type: 'SKIP' },
        ]}
        playedCard={null}
        currentNumber={0}
        direction={1}
        triggerResult={null}
        roomId="ABC123"
        onLeaveAfterDeath={vi.fn()}
      /></ThemeProvider>,
    );

    expect(screen.getAllByText('P1').length).toBeGreaterThan(0);
    expect(screen.getAllByText('P2').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /RỜI TRẬN/ })).toBeInTheDocument();
  });
});
