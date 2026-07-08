import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { GameBoard } from './GameBoard';

vi.mock('../network/SocketClient', () => ({
  socketClient: { send: vi.fn() },
}));

vi.mock('../audio/Sounds', () => ({
  Sounds: { buttonClick: vi.fn() },
}));

describe('GameBoard', () => {
  it('renders the current number-card play surface', () => {
    render(
      <GameBoard
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
      />,
    );

    expect(screen.getByText('ĐÈ SỐ - VÒNG 1')).toBeInTheDocument();
    expect(screen.getByText('BÀN TRỐNG')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /BÓP CÒ/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ĐỔI BÀI/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '3' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'SKIP' })).toBeInTheDocument();
  });
});
