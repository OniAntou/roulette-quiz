# Roulette Quiz

Multiplayer party game combining trivia questions with Russian Roulette mechanics.

## Overview

Players use question cards to attack opponents. A wrong answer or timeout means pulling the trigger. The probability of death increases with each empty chamber, creating mounting tension. 

**Goal:** Be the last player standing.

## Tech Stack

- **Desktop Wrapper:** Electron
- **Renderer Engine:** Phaser 3 (2D game engine)
- **Networking:** Socket.io
- **Server:** Node.js + Express
- **Frontend UI:** React + TailwindCSS (via Vite)

## Quick Start

### Prerequisites

- Node.js 18+ installed
- npm

### Installation

```bash
# Clone or enter the project directory
cd roulette-quiz

# Install root dependencies
npm install

# Install client dependencies
cd client
npm install

# Install server dependencies
cd ../server
npm install

# Go back to root
cd ..
```

### Running the Game

**Development mode (recommended):**

```bash
npm run dev
```

This starts both the server and client concurrently using `concurrently`.

**Run separately:**

- **Server:** `npm run server:start` (Runs on `http://localhost:3000`)
- **Client:** `cd client && npm run dev` (Runs on `http://localhost:5173`)

## Playing the Game

1. Start both the client and server.
2. In the game menu, you can select **ONLINE** or **LAN**.
   - *Note: Currently, both modes connect directly to the hardcoded local server (`http://localhost:3000`). LAN UDP discovery is not yet implemented.*
3. Click **Create Room** to get a room code.
4. Share the room code with your opponent.
5. The opponent selects **JOIN ROOM** and enters the code.
6. Once both players click **READY**, the game begins.

## Game Rules

### Setup
- 2+ players (currently optimized for 1v1).
- Each player starts with a hand of 4 question cards.
- A 6-chamber revolver is loaded with exactly 1 bullet.

### Gameplay
1. Select a card from your hand to attack your opponent.
2. The opponent must answer the question within the time limit.
3. **Correct answer:** The turn passes back to them.
4. **Wrong answer or timeout:** The opponent must pull the trigger.
5. **Survived:** The round resets, and both players receive a fresh hand of 4 cards.
6. **Dead:** Game over! The surviving player wins.

### Bullet Progression (Trigger Odds)
- 1st pull: 1/6 chance
- 2nd pull: 1/5 chance
- 3rd pull: 1/4 chance
- 4th pull: 1/3 chance
- 5th pull: 1/2 chance
- 6th pull: 100% (guaranteed death)

### Card Difficulties
- 🟢 **Easy (Green):** 10 seconds to answer
- 🟡 **Medium (Yellow):** 7 seconds to answer
- 🔴 **Hard (Red):** 5 seconds to answer

## Project Structure

```
roulette-quiz/
├── client/                 # React + Phaser + Electron client
│   ├── src/
│   │   ├── components/    # React UI components (MainMenu, Lobby, GameBoard)
│   │   ├── network/       # Socket.io client wrapper
│   │   └── audio/         # Audio manager
│   ├── public/            # Static assets
│   └── index.html
├── server/                 # Node.js + Express + Socket.io server
│   ├── src/
│   │   ├── index.ts       # Main server entry
│   │   ├── GameManager.ts
│   │   ├── RoomManager.ts
│   │   ├── QuestionManager.ts
│   └── data/
│       └── questions.json  # Question bank
├── shared/                 # Shared constants between client and server
└── docs/                   # Design specs and documentation
```

## Known Issues

- 🔇 **Audio:** Currently uses placeholder references; actual audio files are missing.
- 🛜 **Networking:** No real LAN discovery (UDP broadcast) is implemented. The UI buttons for Online/LAN both default to `localhost:3000`.
- 💬 **Input:** Player name input still relies on basic implementations without extensive sanitization.

## Future Roadmap

- [ ] Implement true LAN discovery using UDP broadcasting on port `41234`.
- [ ] Add real sound effects and background music.
- [ ] Ranking and matchmaking system.
- [ ] Custom avatars and player profiles.
- [ ] In-game chat system.
- [ ] Support for spectator mode.
- [ ] Power-up cards and usable items.
- [ ] Expand the question bank (500+ questions).

## License

MIT
