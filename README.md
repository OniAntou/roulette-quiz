# Roulette Quiz

Multiplayer party game combining trivia questions with Russian Roulette mechanics.

## Overview

Players use question cards to attack opponents. A wrong answer or timeout means pulling the trigger. The probability of death increases with each empty chamber, creating mounting tension. 

**Goal:** Be the last player standing.

## Tech Stack

- **Desktop Wrapper:** Electron (desktop app integration)
- **Frontend UI & Engine:** React 19 + TailwindCSS v4 + Framer Motion (Vite-powered, no Phaser 3)
- **Networking:** Socket.io (real-time communication)
- **Server:** Node.js + Express + TypeScript
- **Shared Utilities:** Shared TypeScript constants and schemas

## Key Features & Visual Effects

- 🔫 **Realistic Revolver Animation:** 3D side-view cylinder rotation animation on trigger pull and spins.
- ⚡ **Minimalist Cyberpunk UI:** Removed cluttered headers, focusing entire layout on clean grid lines and blueprint grids.
- 🏷️ **Dynamic Turn & Action Indicators:** Live status badges (`DECRYPTING...`, `SUCCESS!`, `FAILED!`, `PULL TRIGGER!`) render seamlessly right above the active player's profile container.
- 💥 **Tactical Death Effects:** Screen shake, red emergency flashes, static TV screen glitch, and a collapsing CRT shutdown animation when the local player is terminated.
- 🔊 **Web Audio Synthesis:** Custom mechanical UI beeps, revolver clicks, survive clicks, timer ticks, and warning signals synthesized directly using the Web Audio API.

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

**Development mode (runs client and server concurrently):**

```bash
npm run dev
```

**Run separately:**

- **Server:** `npm run server:start` (Runs on `http://localhost:3000`)
- **Client:** `cd client && npm run dev` (Runs on `http://localhost:5173`)

## Playing the Game

The game supports two modes of play:

### 1. Offline Mode (vs Bot)
- Select **OFFLINE** from the main menu.
- Choose the number of bot opponents.
- Practice your trivia skills and test your luck against simulated players locally without a server.

### 2. Online / LAN Multiplayer Mode
1. Start both the client and server.
2. In the game menu, select **ONLINE** or **LAN**.
   - *Note: Both modes currently connect directly to the local server (`http://localhost:3000`). LAN UDP broadcast auto-discovery is still a work-in-progress.*
3. Click **Create Room** to get a room code.
4. Share the room code with your opponent.
5. The opponent selects **JOIN ROOM** and enters the code.
6. Once both players click **READY**, the game begins.

## Game Rules / Luật chơi

### 🇬🇧 English Version

#### Setup
- **Players:** 2+ players (currently optimized for 1v1).
- **Starting Hand:** Each player starts with a hand of 4 question cards. Fresh cards are only dealt when a player's hand is completely empty (0 cards).
- **The Gun:** A 6-chamber revolver is loaded with exactly 1 bullet at a random chamber position.

#### Gameplay Flow
1. **Choose Attack:** The player whose turn it is selects a question card from their hand to attack the opponent.
2. **Answer Phase:** The opponent must select the correct answer before the card's timer runs out.
3. **Outcome:**
   - **Correct Answer:** The turn passes to the opponent. They now get to choose a card from their hand to attack back.
   - **Incorrect Answer or Timeout:** The opponent must pull the trigger of the revolver.
4. **Trigger Pull Result:**
   - **Survived (Empty Chamber):** The round ends, and a new round begins. Hand cards are refilled (if empty). **Crucial:** The gun is NOT reloaded; the bullet remains in the cylinder, and the cylinder moves to the next chamber. This means the probability of death on the next trigger pull increases!
   - **Dead (Bullet Fired):** The player is eliminated. If only one player remains, they are declared the winner. If multiple players are still alive, the gun is reloaded (bullet reset to a new random position), and a new round begins.

#### Card Difficulties & Timers
- 🟢 **Easy (Green):** 10 seconds to answer.
- 🟡 **Medium (Yellow):** 7 seconds to answer.
- 🔴 **Hard (Red):** 5 seconds to answer.

#### Bullet Probability Progression
- 1st trigger pull: **1/6** chance of death (16.6%)
- 2nd trigger pull: **1/5** chance of death (20.0%)
- 3rd trigger pull: **1/4** chance of death (25.0%)
- 4th trigger pull: **1/3** chance of death (33.3%)
- 5th trigger pull: **1/2** chance of death (50.0%)
- 6th trigger pull: **1/1** chance of death (100% guaranteed elimination)

---

### 🇻🇳 Tiếng Việt

#### Thiết lập ban đầu
- **Người chơi:** 2 người trở lên (hiện tại tối ưu tốt nhất cho chế độ đấu đôi 1v1).
- **Bài trên tay:** Mỗi người chơi bắt đầu với 4 lá bài câu hỏi. Bạn chỉ được chia lại 4 lá bài mới khi đã sử dụng hết sạch bài trên tay (còn 0 lá).
- **Khẩu súng:** Một khẩu súng lục 6 ổ đạn được nạp sẵn đúng 1 viên đạn ở một vị trí ngẫu nhiên.

#### Tiến trình chơi
1. **Chọn bài tấn công:** Đến lượt của mình, người chơi chọn 1 lá bài câu hỏi từ tay để tấn công đối thủ.
2. **Trả lời câu hỏi:** Đối thủ phải chọn đáp án đúng trước khi thanh thời gian của lá bài chạy hết.
3. **Kết quả trả lời:**
   - **Trả lời đúng:** Lượt chơi chuyển sang cho đối thủ. Đối thủ giờ đây sẽ chọn bài trên tay để tấn công ngược lại bạn.
   - **Trả lời sai hoặc hết giờ:** Đối thủ bắt buộc phải bóp cò súng.
4. **Kết quả bóp cò:**
   - **Sống sót (Ổ đạn trống):** Vòng đấu kết thúc và vòng đấu mới bắt đầu. Bài được chia thêm cho người đã hết bài. **Lưu ý quan trọng:** Súng KHÔNG được nạp lại đạn; viên đạn vẫn nằm trong ổ xoay và súng chuyển sang buồng đạn tiếp theo. Điều này có nghĩa là tỉ lệ nổ súng ở lượt bóp cò sau sẽ tăng lên!
   - **Tử vong (Trúng đạn):** Người chơi bị loại. Nếu chỉ còn 1 người chơi sống sót, trò chơi kết thúc và người đó thắng cuộc. Nếu vẫn còn nhiều hơn 1 người chơi sống sót, súng sẽ được nạp lại đạn (viên đạn được đặt ngẫu nhiên lại) và vòng đấu mới bắt đầu.

#### Độ khó của thẻ bài & Thời gian trả lời
- 🟢 **Dễ (Xanh lá):** Có 10 giây để đưa ra đáp án.
- 🟡 **Trung bình (Vàng):** Có 7 giây để đưa ra đáp án.
- 🔴 **Khó (Đỏ):** Chỉ có 5 giây để đưa ra đáp án.

#### Tiến trình tăng tỉ lệ nổ súng
- Bóp cò lần 1: tỉ lệ chết là **1/6** (16.6%)
- Bóp cò lần 2: tỉ lệ chết là **1/5** (20.0%)
- Bóp cò lần 3: tỉ lệ chết là **1/4** (25.0%)
- Bóp cò lần 4: tỉ lệ chết là **1/3** (33.3%)
- Bóp cò lần 5: tỉ lệ chết là **1/2** (50.0%)
- Bóp cò lần 6: tỉ lệ chết là **1/1** (100% chắc chắn tử vong)

## Project Structure

```
roulette-quiz/
├── client/                 # React + Electron client (React 19 + TailwindCSS v4 + Framer Motion)
│   ├── src/
│   │   ├── components/    # React UI components (MainMenu, Lobby, GameBoard, Revolver, GameOver)
│   │   ├── hooks/         # Custom hooks (useBotGame.ts for offline mode)
│   │   ├── network/       # Socket.io client wrapper (SocketClient.ts)
│   │   ├── audio/         # Audio manager (Sounds.ts, placeholder audio refs)
│   │   └── index.css      # Core styles with theme variables & CRT screen effects
│   ├── public/            # Static assets
│   └── index.html
├── server/                 # Node.js + Express + Socket.io + TypeScript server
│   ├── src/
│   │   ├── index.ts       # Main server entry with basic CORS and Rate Limiting
│   │   ├── GameManager.ts # Core game state machine & trigger logic
│   │   ├── RoomManager.ts # Room management with basic name sanitization
│   │   ├── QuestionManager.ts # Handles random card dealing from JSON
│   │   └── types.ts       # Type definitions
│   └── data/
│       └── questions.json  # Question bank
├── shared/                 # Shared constants between client and server
│   └── constants.ts
└── docs/                   # Design specs and documentation
```

## Known Issues

- 🔊 **Audio:** Synthesized sound effects (Web Audio API) are integrated natively in the client code, resolving the missing physical audio files issue.
- 🛜 **Networking:** No real LAN discovery (UDP broadcast) is implemented yet.
- 💬 **Input:** Player name input uses basic sanitization and could be further hardened against XSS.

## Future Roadmap

- [ ] Implement true LAN discovery using UDP broadcasting on port `41234`.
- [ ] Add real sound effects and background music.
- [ ] Ranking and matchmaking system.
- [ ] Custom avatars and player profiles.
- [ ] In-game chat system.
- [ ] Spectator mode support.
- [ ] Power-up cards and usable items.
- [ ] Expand the question bank (500+ questions).

## License

MIT
