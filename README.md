# Roulette Quiz

Multiplayer number-card party game with Russian Roulette pressure.

Players try to beat the current table number with cards from their hand. If they cannot or do not want to play, they pull the trigger. The gun keeps advancing through its six chambers until a bullet fires, so every safe click makes the next trigger pull riskier.

## Tech Stack

- Frontend: React 19, Vite, TailwindCSS v4, Framer Motion
- Networking: Socket.io
- Server: Node.js, Express, TypeScript
- Shared constants: TypeScript module under `shared/`

## Quick Start

### Prerequisites

- Node.js 20+
- npm

### Install

```bash
npm install
cd client && npm install
cd ../server && npm install
cd ..
```

### Run Development

```bash
npm run dev
```

This starts the server on `http://localhost:3000` and the client on `http://localhost:5173`.

Run separately:

```bash
npm run dev:server
npm run dev:client
```

### Production Build

```bash
npm run build
npm start
```

## Current Game Modes

- Online/LAN multiplayer is supported.
- Offline bot mode is supported with 1-3 CPU opponents using the current number-card rules.

## Current Rules

### Setup

- Players: 2-4 players.
- Starting hand: each alive player receives 10 cards.
- Deck: number cards `1-9` plus `SKIP`, `BLOCK`, `REVERSE`, `JOKER`, and `STANDOFF` cards.
- Gun: six chambers, one bullet, random bullet position.

### Turn Flow

1. The active player plays a valid card or pulls the trigger.
2. A `NUMBER` card must be greater than the current table number.
3. If a player pulls the trigger, the table resets to empty.
4. A safe click keeps the same gun and returns the turn to the player who survived.
5. A fatal shot eliminates that player. If more than one player remains, the game starts a new round with a fresh gun.
6. Last alive player wins.

### Card Effects

- `NUMBER`: sets the current table number.
- `JOKER`: clears the table number and stack.
- `BLOCK`: passes turn without changing the table.
- `REVERSE`: flips turn direction.
- `SKIP`: skips the next alive player.
- `STANDOFF`: every alive player takes an independent 1/6 trigger risk.

### Mulligan

Each player can use one mulligan to redraw a full hand during their own turn.

## Project Structure

```text
roulette-quiz/
├── client/                 # React client
│   ├── src/components/     # MainMenu, Lobby, GameBoard, Revolver, GameOver
│   ├── src/hooks/          # Game socket and local game hooks
│   ├── src/network/        # Socket.io client wrapper
│   └── src/audio/          # Audio manager
├── server/                 # Express + Socket.io TypeScript server
│   ├── src/GameManager.ts  # Main game state machine
│   ├── src/GunEngine.ts    # Trigger and chamber resolution
│   ├── src/DeckManager.ts  # Current deck generation/shuffle
│   ├── src/RoomManager.ts  # Room lifecycle
│   └── src/index.ts        # HTTP/socket entrypoint
├── shared/                 # Shared constants
└── docs/                   # Design notes
```

## Verification

```bash
cd server && npm test && npm run build
cd ../client && npm test && npm run build
```

## License

MIT
