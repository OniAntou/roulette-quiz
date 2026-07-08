import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from '../theme/ThemeContext';
import { MainMenu } from './MainMenu';

vi.mock('../audio/Sounds', () => ({
  Sounds: {
    initMuted: vi.fn(),
    startMenuBGM: vi.fn(),
    stopMenuBGM: vi.fn(),
    buttonClick: vi.fn(),
    buttonHover: vi.fn(),
    getVolume: vi.fn(() => 0.5),
    isMuted: vi.fn(() => false),
    setMuted: vi.fn(),
    setVolume: vi.fn(),
  },
}));

vi.mock('./WaterRippleBg', () => ({
  WaterRippleBg: () => <div data-testid="water-ripple-bg" />,
}));

describe('MainMenu', () => {
  it('exposes the bot mode entry point', () => {
    render(
      <ThemeProvider>
        <MainMenu
          connect={vi.fn()}
          startBot={vi.fn()}
          error=""
          status="disconnected"
        />
      </ThemeProvider>,
    );

    expect(screen.getByRole('button', { name: /BOT PROTOCOL \/\/ VS CPU/i })).toBeInTheDocument();
  });
});
