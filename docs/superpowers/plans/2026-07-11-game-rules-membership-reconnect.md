# Game Rules, Membership, and Reconnect Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Make online and bot matches obey identical card rules, enforce server-owned room membership, and preserve a disconnected player slot for 30 seconds.

**Architecture:** A shared pure rules module owns table sentinels, card legality, and BLOCK consumption. The server owns room membership and reconnect state, pausing active play until all disconnected players return or their independent deadlines expire. The client retains only a per-player reconnect token and consumes a server snapshot after recovery.

**Tech Stack:** TypeScript, Socket.IO, Express, React 19, Vitest, Testing Library.

---

## File map

- Create: shared/gameRules.ts and shared/gameRules.test.ts for pure card rules.
- Modify: server/src/types.ts, RoomManager.ts, TimeoutManager.ts, GameManager.ts, GunEngine.ts, index.ts.
- Modify: client/src/network/SocketClient.ts, hooks/useGameSocket.ts, hooks/useBotGame.ts, App.tsx, components/GameBoard.tsx.
- Modify: server/src/GameManager.test.ts, client/src/components/GameBoard.test.tsx; create client/src/hooks/useGameSocket.test.tsx.
- Modify: README.md and docs/RULES.md to match the final rules.

### Task 1: Build the shared rules module

**Files:**
- Create: shared/gameRules.ts
- Create: shared/gameRules.test.ts
- Modify: server/src/GameManager.ts:137-198
- Modify: client/src/hooks/useBotGame.ts:111-134,382-425

- [ ] **Step 1: Write the failing pure-rule tests**

~~~ts
import { describe, expect, it } from 'vitest';
import { JOKER_TABLE, canPlayCard, consumeBlock } from './gameRules';

it('allows only JOKER, SKIP, and REVERSE over a JOKER table', () => {
  expect(canPlayCard({ id: 'number', type: 'NUMBER', value: 9 }, JOKER_TABLE)).toBe(false);
  expect(canPlayCard({ id: 'standoff', type: 'STANDOFF' }, JOKER_TABLE)).toBe(false);
  expect(canPlayCard({ id: 'skip', type: 'SKIP' }, JOKER_TABLE)).toBe(true);
});

it('never allows BLOCK to be played and consumes one on a fatal hit', () => {
  const hand = [{ id: 'block', type: 'BLOCK' as const }, { id: 'one', type: 'NUMBER' as const, value: 1 }];
  expect(canPlayCard(hand[0], 4)).toBe(false);
  expect(consumeBlock(hand)).toEqual({ used: true, hand: [hand[1]] });
});
~~~

- [ ] **Step 2: Run the test to verify it fails**

Run: cd shared; npx vitest run gameRules.test.ts

Expected: FAIL because gameRules.ts does not exist.

- [ ] **Step 3: Implement the exact shared API**

~~~ts
export const EMPTY_TABLE = 0;
export const JOKER_TABLE = -1;

export function canPlayCard(card: RuleCard, currentNumber: number): boolean {
  if (card.type === 'BLOCK') return false;
  if (currentNumber === JOKER_TABLE) return ['JOKER', 'SKIP', 'REVERSE'].includes(card.type);
  return card.type !== 'NUMBER' || (card.value ?? EMPTY_TABLE) >= currentNumber;
}

export function consumeBlock<T extends RuleCard>(hand: T[]): { used: boolean; hand: T[] } {
  const index = hand.findIndex(card => card.type === 'BLOCK');
  return index === -1 ? { used: false, hand } : { used: true, hand: hand.filter((_, i) => i !== index) };
}
~~~

Import it in GameManager and use it before removing a card; change JOKER to JOKER_TABLE. Import it in useBotGame; remove its local predicate and never select BLOCK as a bot action.

- [ ] **Step 4: Run focused tests**

Run: cd server; npm test; cd ../client; npm test

Expected: server passes; client has only the known ThemeProvider failure until Task 4.

- [ ] **Step 5: Commit**

~~~bash
git add shared/gameRules.ts shared/gameRules.test.ts server/src/GameManager.ts client/src/hooks/useBotGame.ts
git commit -m "fix: share card rules across game modes"
~~~

### Task 2: Enforce BLOCK protection and canonical membership

**Files:**
- Modify: server/src/GunEngine.ts:37-154
- Modify: server/src/GameManager.ts:137-215,350-395
- Modify: server/src/RoomManager.ts:82-180
- Modify: server/src/index.ts:150-329
- Test: server/src/GameManager.test.ts

- [ ] **Step 1: Add failing regression tests**

~~~ts
it('consumes BLOCK instead of killing a player when a live chamber fires', () => {
  // Create a live chamber and a target hand containing BLOCK.
  // Expect game:trigger to report { alive: true, usedBlock: true } and the hand to lose BLOCK.
});

it('rejects an action whose socket is not mapped to the supplied game room', () => {
  // Map the socket to room B, attempt a card action in game room A, and expect no card removal.
});
~~~

- [ ] **Step 2: Run server tests to confirm failure**

Run: cd server; npm test

Expected: FAIL because GunEngine does not consume BLOCK and index.ts trusts client room IDs.

- [ ] **Step 3: Implement automatic BLOCK protection**

In both GunEngine.pullTrigger and GunEngine.resolveStandoff, call consumeBlock only after the random/live bullet result is fatal. Replace the target hand when used, include usedBlock in the event payload, and eliminate only if the result remains fatal. A blocked single trigger resumes the target's turn; a blocked standoff survivor stays alive.

- [ ] **Step 4: Implement canonical room APIs and route all actions through them**

Add these RoomManager methods:

~~~ts
getRoomIdForPlayer(socketId: string): string | undefined;
isPlayerInRoom(socketId: string, roomId: string): boolean;
replacePlayerSocketId(roomId: string, oldSocketId: string, newSocketId: string): boolean;
~~~

For ready, leave, game, and room chat events, resolve the room from getRoomIdForPlayer(socket.id), reject mismatched payload IDs, and pass only the canonical ID to GameManager. When a socket creates or joins another room, call GameManager.handleExplicitLeave first if its old room is playing, then socket.leave(oldRoomId), then update RoomManager. Explicit leave while playing must use the same permanent-departure path.

- [ ] **Step 5: Run tests and commit**

Run: cd server; npm test; npm run build

Expected: PASS.

~~~bash
git add server/src/GunEngine.ts server/src/GameManager.ts server/src/RoomManager.ts server/src/index.ts server/src/GameManager.test.ts
git commit -m "fix: enforce game membership and block protection"
~~~

### Task 3: Implement thirty-second reconnect pause and resume

**Files:**
- Modify: server/src/types.ts
- Modify: server/src/TimeoutManager.ts
- Modify: server/src/GameManager.ts
- Modify: server/src/index.ts
- Test: server/src/GameManager.test.ts

- [ ] **Step 1: Write failing reconnect tests**

~~~ts
it('pauses on disconnect and restores the original hand after a valid-token reconnect', () => {
  // Disconnect the current player, retain the emitted game:session token, reconnect using a new socket ID,
  // then assert the new ID owns the original hand and game:resumed emits.
});

it('permanently departs a player after the reconnect deadline', () => {
  vi.useFakeTimers();
  // Disconnect a player, advance 30_000ms, and assert normal elimination/game-over behavior.
});
~~~

- [ ] **Step 2: Run the tests to verify they fail**

Run: cd server; npm test

Expected: FAIL because reconnect metadata and resume behavior do not exist.

- [ ] **Step 3: Extend the server state and APIs**

Add reconnectToken, reconnecting, and reconnectDeadline to Player. Add paused, pausedTurnRemainingMs, and reconnectTimeouts to GameState. Generate crypto.randomUUID() tokens in startGame and send each only through that player's socket with game:session.

Implement:
- handleTransportDisconnect(socketId): mark that player reconnecting, pause the game, clear the active turn timeout, record remaining turn time, emit game:reconnecting, and schedule exactly 30_000ms to the permanent-departure path.
- handleReconnect(roomId, token, socket): verify token and unexpired deadline, replace socket ID in room/game state, join socket room, clear timeout, send the private hand plus game:stateSnapshot, then resume only when no reconnecting players remain.
- handleExplicitLeave(socketId): cancel any reconnect timer and immediately run permanent departure.

All game actions return without state mutation while paused. TimeoutManager.clearAll also clears reconnectTimeouts when the game ends.

- [ ] **Step 4: Register the validated reconnect event**

Accept game:reconnect only with a non-empty roomId and token. Call handleReconnect(roomId, token, socket). On Socket.IO disconnect call handleTransportDisconnect, not immediate elimination.

- [ ] **Step 5: Verify and commit**

Run: cd server; npm test; npm run build

Expected: PASS, including fake-timer cases.

~~~bash
git add server/src/types.ts server/src/TimeoutManager.ts server/src/GameManager.ts server/src/index.ts server/src/GameManager.test.ts
git commit -m "feat: resume paused games after reconnect"
~~~

### Task 4: Restore client sessions and repair client tests

**Files:**
- Modify: client/src/network/SocketClient.ts
- Modify: client/src/hooks/useGameSocket.ts
- Modify: client/src/App.tsx
- Modify: client/src/components/GameBoard.tsx
- Modify: client/src/components/GameBoard.test.tsx
- Create: client/src/hooks/useGameSocket.test.tsx

- [ ] **Step 1: Add failing client tests**

~~~tsx
it('renders GameBoard within its required provider', () => {
  render(<ThemeProvider><GameBoard {...props} /></ThemeProvider>);
  expect(screen.getByRole('button', { name: '3' })).toBeInTheDocument();
});

it('sends a saved game session on socket reconnect', () => {
  // Deliver game:session, simulate _reconnect, and expect game:reconnect with saved roomId and token.
});
~~~

- [ ] **Step 2: Run tests to confirm the reconnect test fails**

Run: cd client; npm test

Expected: FAIL for the missing reconnect flow.

- [ ] **Step 3: Implement client recovery and legality affordance**

Forward game:session, game:stateSnapshot, game:reconnecting, and game:resumed from SocketClient. Store roomId/token in one sessionStorage record on game:session; on _reconnect send game:reconnect if present; clear it on room:left, game:over, and intentional departure. Apply a snapshot atomically before resumed play.

Wrap GameBoard tests in ThemeProvider. Use canPlayCard in GameBoard to disable invalid cards. Render reconnect/paused text with the existing surface, border, and text classes only.

- [ ] **Step 4: Run client verification and commit**

Run: cd client; npm test; npm run build

Expected: PASS.

~~~bash
git add client/src/network/SocketClient.ts client/src/hooks/useGameSocket.ts client/src/App.tsx client/src/components/GameBoard.tsx client/src/components/GameBoard.test.tsx client/src/hooks/useGameSocket.test.tsx
git commit -m "fix: restore online sessions after reconnect"
~~~

### Task 5: Align documentation and run the full regression suite

**Files:**
- Modify: README.md
- Modify: docs/RULES.md
- Modify: server/src/GameManager.test.ts
- Modify: client/src/hooks/useBotGame.test.tsx

- [ ] **Step 1: Add parity assertions**

Add server and bot tests that reject NUMBER/STANDOFF after JOKER, reject playing BLOCK, and prove BLOCK prevents fatal trigger and standoff outcomes.

- [ ] **Step 2: Update player-facing rules**

Document NUMBER as greater than or equal, JOKER's restricted follow-up set, BLOCK's automatic protection, and the 30-second reconnect pause.

- [ ] **Step 3: Run the complete verification**

~~~bash
cd server && npm test && npm run build
cd ../client && npm test && npm run build
cd .. && git diff --check && git status --short
~~~

Expected: every test/build passes and git diff has no whitespace errors.

- [ ] **Step 4: Commit**

~~~bash
git add README.md docs/RULES.md server/src/GameManager.test.ts client/src/hooks/useBotGame.test.tsx
git commit -m "docs: align rules with multiplayer behavior"
~~~

## Plan self-review

- Spec coverage: Tasks 1-2 implement shared rules and trusted membership; Task 3 implements pause/resume; Task 4 restores the client; Task 5 adds parity coverage and documentation.
- No-placeholder scan: every task names exact files, test cases, commands, expected result, and implementation API.
- Type consistency: reconnectToken, reconnecting, reconnectDeadline, paused, pausedTurnRemainingMs, and reconnectTimeouts are used consistently throughout.

