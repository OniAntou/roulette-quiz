# Roulette Quiz

Multiplayer party game combining quiz questions with Russian Roulette mechanics.

## Overview

Players use question cards to attack opponents. Wrong answers or timeout means pulling the trigger. Death probability increases over time, creating mounting tension.

**Goal:** Be the last player standing.

## Tech Stack

- **Desktop:** Electron
- **Renderer:** Phaser 3 (2D game engine)
- **Networking:** Socket.io (online + LAN)
- **Server:** Node.js + Express

## Quick Start

### Prerequisites

- Node.js 18+ installed
- npm

### Installation

```bash
cd D:\Game\roulette-quiz

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

This starts both server and client concurrently.

**Server only:**

```bash
npm run server:start
```

Server runs on `http://localhost:3000`

**Client only:**

```bash
cd client
npm run dev
```

Client runs on `http://localhost:5173`

### Playing the Game

1. Start the server: `npm run server:start`
2. Start the client: `cd client && npm run dev`
3. In the game menu, select **ONLINE** or **LAN** *(Note: currently both connect to localhost:3000)*
4. **Create Room** to get a room code
5. Share the room code with your friend
6. Friend selects **JOIN ROOM** and enters the code
7. Both players click **READY**
8. Game starts when both are ready!

## Game Rules

### Setup
- 2+ players
- Each player gets 4 question cards
- 6-chamber revolver with 1 bullet

### Gameplay
1. Choose a card from your hand
2. Opponent must answer the question
3. **Correct answer:** Turn passes to opponent
4. **Wrong answer/timeout:** You pull the trigger
5. **Survived:** New round, both get 4 new cards
6. **Dead:** Game over, remaining player wins

### Bullet Progression
- 1st pull: 1/6 chance
- 2nd pull: 1/5 chance
- 3rd pull: 1/4 chance
- 4th pull: 1/3 chance
- 5th pull: 1/2 chance
- 6th pull: 100% (guaranteed death)

### Card Difficulties
- **Easy (Green):** 10 seconds to answer
- **Medium (Yellow):** 7 seconds to answer
- **Hard (Red):** 5 seconds to answer

## Project Structure

```
roulette-quiz/
├── client/                 # Phaser + Electron client
│   ├── src/
│   │   ├── scenes/        # Game scenes
│   │   ├── objects/       # Game objects (Card, Player, Gun, Timer)
│   │   ├── ui/            # UI components (HUD, QuestionPanel, CardHand)
│   │   ├── network/       # Socket.io client
│   │   └── audio/         # Audio manager
│   └── assets/            # Images, audio, fonts
├── server/                 # Node.js server
│   ├── src/
│   │   ├── GameManager.js
│   │   ├── RoomManager.js
│   │   ├── QuestionManager.js
│   │   └── SocketServer.js
│   └── data/
│       └── questions.json  # Question bank
└── shared/                 # Shared constants
```

## Configuration

### Server Port
Default: `3000`

Set via environment variable:
```bash
PORT=8080 npm run server:start
```

### LAN Discovery
*Currently not implemented (fallback to localhost).*

## Development

### Adding Questions

Edit `server/data/questions.json`:

```json
{
  "id": "q_XXX",
  "topic": "science",
  "difficulty": "easy|medium|hard",
  "question": "Your question?",
  "answers": {
    "A": "Answer A",
    "B": "Answer B",
    "C": "Answer C",
    "D": "Answer D"
  },
  "correct": "A"
}
```

### Topics
- science 🔬
- geography 🌍
- history 📜
- entertainment 🎬
- gaming 🎮
- technology 💻

## Known Issues

- Audio files are placeholders (no actual sounds yet)
- Player name input uses browser prompt
- No LAN discovery implemented yet
- Single browser window for testing

## Future Features

- [ ] Ranking system
- [ ] Achievements
- [ ] Custom avatars
- [ ] In-game chat
- [ ] Spectator mode
- [ ] Power-up cards
- [ ] Items
- [ ] More questions (500+)
- [ ] Sound effects
- [ ] Music

## License

MIT
