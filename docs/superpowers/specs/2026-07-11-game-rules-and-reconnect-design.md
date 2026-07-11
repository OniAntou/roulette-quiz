# Game Rules and Reconnect Design

## Goal

Make online multiplayer obey the same card rules as offline bot mode, keep game and room membership authoritative on the server, and let a disconnected player reclaim the same match slot within 30 seconds.

## Scope

- Use one rule contract for `NUMBER`, `JOKER`, `BLOCK`, `SKIP`, `REVERSE`, and `STANDOFF` in both modes.
- Make `BLOCK` unplayable and consume it automatically only when it prevents a fatal trigger or standoff result.
- Use `-1` as the `JOKER` table sentinel. While it is active, only `JOKER`, `SKIP`, and `REVERSE` are playable.
- Derive every in-game action from the requesting socket's server-owned membership instead of a client-supplied room ID.
- Allow a disconnected player to reconnect to the same player state for 30 seconds while the match is paused.
- Treat an explicit departure during an active match as a permanent forfeit.

## Out of Scope

- Persistent accounts, cross-process sessions, rematches, and game-state persistence across a server restart.
- UI redesign. Reconnect status will use the existing game surface and text treatment.

## Rule Contract

Create a shared pure rule module consumed by the server and the bot hook. It will expose a table-state sentinel and a `canPlayCard(card, currentNumber)` predicate.

- Empty table: `0`; all non-`BLOCK` cards are valid and NUMBER cards must be at least `0`.
- Number table: NUMBER cards must be at least the table value; non-`BLOCK` action cards are valid.
- Joker table: `-1`; only `JOKER`, `SKIP`, and `REVERSE` are valid.
- `BLOCK` is never a legal play. A bullet consumes the first `BLOCK` in the target hand and the target survives; the same applies independently to each standoff participant.

The server remains authoritative. Client-side validation will only prevent confusing invalid clicks; it cannot replace server validation.

## Membership and Leave Semantics

The server will resolve the canonical room from the socket ID for every room, game, and chat action. A supplied room ID is ignored or checked only as an optional consistency assertion.

In the waiting lobby, leaving removes the player normally. In a running game, an explicit leave immediately marks that player as permanently gone, clears any reconnect eligibility, and advances or ends the match with the existing disconnect resolution. Joining or creating another room first performs this same permanent departure and removes the socket from the old Socket.IO room.

## Reconnect Flow

Each game player gets a cryptographically random reconnect token when the game starts. The client retains its own token in `sessionStorage` for the active match.

1. On transport disconnect, the server marks the player `reconnecting`, preserves the hand and game position, clears the current turn timeout, and emits a reconnecting status.
2. The entire match enters a paused state for at most 30 seconds. No card, trigger, mulligan, or chat action can advance the match while paused.
3. The reconnecting client emits its room ID and token after its new Socket.IO connection is established. The server validates the token, replaces the old socket ID in room and game state, joins the new socket to the room, sends that player's hand and a full public game snapshot, then resumes the paused timer with the remaining duration.
4. If the deadline expires, the server invokes the permanent-disconnect path. The player is eliminated and the game advances or ends using the normal rules.

The server tracks a separate 30-second deadline for each reconnecting player. The match resumes only when every reconnecting player has returned or been resolved as a permanent departure. A repeated disconnect never extends that player's original deadline.

## Testing

- Pure shared-rule tests cover empty, NUMBER, JOKER, and `BLOCK` cases.
- Server tests cover automatic `BLOCK` consumption, rejected `BLOCK`/JOKER-invalid plays, membership spoofing, explicit forfeit, successful token reconnect, and grace-period expiry.
- Client tests render `GameBoard` within `ThemeProvider` and verify reconnect events store/clear the active session token.
- Run server and client test suites plus both production builds and `git diff --check`.
