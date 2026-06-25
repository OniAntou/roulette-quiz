# Roulette Quiz — Game Design Spec

**Date:** 2026-06-24
**Version:** 1.0 (MVP)
**Status:** Approved

---

## Overview

Multiplayer party game combining quiz questions with Russian Roulette mechanics. Players use question cards to attack opponents. Wrong answers or timeout means pulling the trigger. Death probability increases over time, creating mounting tension.

**Goal:** Be the last player standing.

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Desktop | Electron | App wrapper |
| Renderer | Phaser 3 | 2D game engine |
| Networking | Socket.io | Multiplayer (online + LAN) |
| Server | Node.js | Game state, questions |
| Audio | Phaser Audio | Sound effects & music |

---

## Architecture

```
┌─────────────────────────────────────────┐
│              Electron App               │
│  ┌─────────────────────────────────┐    │
│  │         Phaser 3 (Renderer)     │    │
│  │  - Game scenes                 │    │
│  │  - Card animations             │    │
│  │  - Audio engine                │    │
│  │  - Timer system                │    │
│  └─────────────┬───────────────────┘    │
│                │                        │
│  ┌─────────────┴───────────────────┐    │
│  │       Socket.io Client          │    │
│  └─────────────┬───────────────────┘    │
└────────────────┼────────────────────────┘
                 │
        ┌────────┴────────┐
        │   Socket.io     │
        │   Server        │
        │  (Node.js)      │
        └────────┬────────┘
                 │
        ┌────────┴────────┐
        │  Game State     │
        │  Manager        │
        └─────────────────┘
```

---

## Game Flow

```
Menu → Lobby → Game → GameOver → Menu
```

### State Machine

```
WAITING → DEALING → CHOOSING → QUESTIONING → ANSWERING → RESULT → TRIGGER → (next round or gameover)
```

| State | Description | Timeout |
|-------|-------------|---------|
| `WAITING` | Waiting for players | - |
| `DEALING` | Deal 4 cards to each player | 2s animation |
| `CHOOSING` | Player selects a card to play | 15s |
| `QUESTIONING` | Show question to opponent | - |
| `ANSWERING` | Opponent answers | 5/7/10s by difficulty |
| `RESULT` | Show correct/wrong | 2s |
| `TRIGGER` | Pull trigger, spin cylinder | 3s animation |
| `ROUND_END` | Reset hands, new round | 3s |
| `GAMEOVER` | One player remains | - |

### Round Flow

1. Each player has 4 cards in hand
2. Player A selects a card → places it on table
3. Question appears for Player B
4. Player B answers within time limit
5. **Correct** → turn passes to Player B
6. **Wrong/timeout** → Player A pulls trigger
7. **Survived** → both hands reset to 4 cards, new round
8. **Dead** → Game Over, remaining player wins

---

## Networking

### Architecture: Authoritative Server

- Server controls all game state
- Clients send inputs, receive state updates
- Prevents cheating

### Events

| Event | Direction | Payload |
|-------|-----------|---------|
| `room:create` | C→S | `{playerName}` |
| `room:join` | C→S | `{roomCode, playerName}` |
| `room:start` | S→C | `{players, gameState}` |
| `game:deal` | S→C | `{cards: Card[]}` |
| `game:choose` | C→S | `{cardId}` |
| `game:question` | S→C | `{question, timer, target}` |
| `game:answer` | C→S | `{answer}` |
| `game:result` | S→C | `{correct, nextTurn}` |
| `game:trigger` | S→C | `{alive, bulletCount, nextRound}` |
| `game:over` | S→C | `{winner, stats}` |

### LAN Discovery

- Server broadcasts UDP packet on port `41234`
- Client scans for servers on LAN
- Fallback: manual IP entry

### Online Mode

- Server runs on cloud (AWS/GCP/Render)
- Client joins via room code
- Heartbeat every 5s for disconnect detection

---

## UI Layout

```
┌─────────────────────────────────────────────────────┐
│  [Avatar P2]  ██████████  Cards: 4  [Status: Ready] │
│─────────────────────────────────────────────────────│
│                                                     │
│                  ┌─────────────┐                    │
│                  │  PLAYED     │                    │
│                  │  CARD       │                    │
│                  └─────────────┘                    │
│                                                     │
│           ┌─────────────────────────┐               │
│           │   QUESTION              │               │
│           │   "What is 2+2?"        │               │
│           │   A) 3  B) 4  C) 5  D) 6│              │
│           └─────────────────────────┘               │
│                                                     │
│                  [ ⏱ 0:07 ]                         │
│                                                     │
├─────────────────────────────────────────────────────┤
│  [Deck]  🂠 🂠 🂠 🂠  [🔫 1/6 bullet]               │
│  ┌───┐ ┌───┐ ┌───┐ ┌───┐                           │
│  │ A │ │ B │ │ C │ │ D │  ← P1's hand (fanned)    │
│  └───┘ └───┘ └───┘ └───┘                           │
│  [Avatar P1]  ██████████  Cards: 4  [Your Turn]    │
└─────────────────────────────────────────────────────┘
```

### Card Design

- Color by difficulty: 🟢 Easy / 🟡 Medium / 🔴 Hard
- Topic icon on right corner
- Timer displayed on card

### Animations (Phaser Tweens)

- **Deal cards:** Fly-in from deck to player hand
- **Play card:** Card flies from hand to table center
- **Timer:** Circular countdown with color change
- **Trigger:** Cylinder spin, screen shake, red flash on death
- **Victory:** Particle effects, floating text

### Responsive Design

- Game window: 1280x720 (16:9)
- Scale to window size
- Cards auto-position by quantity

---

## Data Models

### Card

```json
{
  "id": "card_001",
  "topic": "science",
  "difficulty": "hard",
  "question": "What is the speed of light?",
  "answers": {
    "A": "299,792 km/s",
    "B": "150,000 km/s",
    "C": "500,000 km/s",
    "D": "1,000,000 km/s"
  },
  "correct": "A"
}
```

### Player

```json
{
  "id": "player_1",
  "name": "Player 1",
  "hand": ["card_001", "card_002", "card_003", "card_004"],
  "isAlive": true,
  "avatar": "avatar_1"
}
```

### Room

```json
{
  "id": "room_abc123",
  "players": ["player_1", "player_2"],
  "state": "gameplay",
  "currentTurn": "player_1",
  "round": 3,
  "gun": {
    "chambers": [false, false, false, false, false, true],
    "currentPosition": 2,
    "bulletsFired": 1
  },
  "questionBank": "questions_v1.json"
}
```

### GameState (Server-side)

```json
{
  "room": "room_abc123",
  "phase": "answering",
  "currentCard": "card_001",
  "currentPlayer": "player_1",
  "targetPlayer": "player_2",
  "timer": 7,
  "usedCards": ["card_005", "card_006"],
  "score": {
    "player_1": 2,
    "player_2": 1
  }
}
```

---

## Audio & Sound Effects

### Sound Effects

| Sound | Trigger | Description |
|-------|---------|-------------|
| `card_deal` | Deal card | Card shuffling |
| `card_play` | Play card | Card placed on table |
| `tick` | Timer < 3s | Tick tock |
| `timer_expire` | Timeout | Buzz sound |
| `correct` | Correct answer | Positive ding |
| `wrong` | Wrong answer | Error buzz |
| `gun_click` | Trigger (alive) | Gun click |
| `gun_fire` | Trigger (dead) | Gunshot |
| `heartbeat` | Trigger phase | Fast heartbeat |
| `victory` | Game over | Victory fanfare |
| `countdown` | Game start | Countdown beeps |

### Music

| Track | Scene | Description |
|-------|-------|-------------|
| `menu_bgm` | MainMenu | Eerie menu music |
| `lobby_bgm` | Lobby | Tense buildup |
| `game_bgm` | Game | Tension, bass-heavy |
| `trigger_bgm` | Trigger | Heart-pounding |

### Visual Effects

| Effect | Trigger | Description |
|--------|---------|-------------|
| `screen_shake` | Gun fire | Screen shake |
| `red_flash` | Player dies | Red flash overlay |
| `card_glow` | Current card | Card glow |
| `timer_pulse` | Timer < 3s | Timer blink |
| `bullet_spin` | Trigger | Cylinder spin |
| `confetti` | Victory | Confetti particles |
| `blood_splat` | Death | Blood effect (optional) |

---

## Question Bank

### Topics

| Topic | Icon | Example |
|-------|------|---------|
| Khoa học | 🔬 | "Hình dạng của Trái Đất?" |
| Địa lý | 🌍 | "Thủ đô của Nhật Bản?" |
| Lịch sử | 📜 | "Năm chiến tranh thế giới II kết thúc?" |
| Giải trí | 🎬 | "Phim nào đoạt giải Oscar 2024?" |
| Game | 🎮 | "Nhân vật chính của Zelda tên gì?" |
| Công nghệ | 💻 | "iPhone ra mắt năm nào?" |

### Distribution

- Easy (🟢): 40%
- Medium (🟡): 40%
- Hard (🔴): 20%

### Card Distribution per Round

- Each player receives 4 random cards
- Mix: 1-2 Easy, 1-2 Medium, 0-1 Hard
- No duplicate questions within same game

### Pool Size

- MVP: 100 questions (15-20 per topic)
- Production: 500+ questions

---

## MVP Scope

### Included

- [x] 2 players
- [x] Multiplayer online + LAN
- [x] 5-6 quiz topics
- [x] 3 difficulty levels
- [x] Progressive bullet system (1/6 → 100%)
- [x] Card hand management
- [x] Timer system
- [x] Basic animations
- [x] Sound effects
- [x] Game over screen

### Excluded (Future)

- [ ] Ranking system
- [ ] Achievements
- [ ] Custom avatars
- [ ] In-game chat
- [ ] Spectator mode
- [ ] Power-up cards
- [ ] Items

---

## File Structure

```
D:\Game\roulette-quiz\
├── client/
│   ├── src/
│   │   ├── scenes/
│   │   │   ├── MainMenu.js
│   │   │   ├── Lobby.js
│   │   │   ├── Game.js
│   │   │   └── GameOver.js
│   │   ├── objects/
│   │   │   ├── Card.js
│   │   │   ├── Player.js
│   │   │   ├── Gun.js
│   │   │   └── Timer.js
│   │   ├── ui/
│   │   │   ├── HUD.js
│   │   │   ├── QuestionPanel.js
│   │   │   └── CardHand.js
│   │   ├── network/
│   │   │   └── SocketClient.js
│   │   ├── audio/
│   │   │   └── AudioManager.js
│   │   └── main.js
│   ├── assets/
│   │   ├── images/
│   │   ├── audio/
│   │   └── fonts/
│   └── index.html
├── server/
│   ├── src/
│   │   ├── GameManager.js
│   │   ├── RoomManager.js
│   │   ├── QuestionManager.js
│   │   ├── GunManager.js
│   │   └── SocketServer.js
│   ├── data/
│   │   └── questions.json
│   └── index.js
├── shared/
│   └── constants.js
├── package.json
└── README.md
```

---

## Implementation Order

1. **Phase 1: Project Setup** — Electron + Phaser scaffold, build system
2. **Phase 2: Server Core** — Game state, room management, Socket.io
3. **Phase 3: Game Logic** — Card system, turn flow, gun mechanics
4. **Phase 4: Client UI** — Menu, lobby, game scene, cards, timer
5. **Phase 5: Networking** — Client-server communication, sync
6. **Phase 6: Audio/Visual** — Sound effects, animations, polish
7. **Phase 7: Question Bank** — Create/import questions, validation
8. **Phase 8: Testing** — Multiplayer testing, bug fixes

---

*Spec approved and ready for implementation.*
