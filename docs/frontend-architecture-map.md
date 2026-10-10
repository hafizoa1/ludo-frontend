# Frontend Architecture Map

**Status:** Investigation complete, no code changed. Written before starting
the move-selection redesign (`docs/move-selection-redesign.md`), at the
user's request, because "we will be adding a lot of components to the
frontend so it is worth a refactor" - this maps what's actually there
before deciding what to change.

~10,300 lines of source across 33 files. Almost entirely vanilla ES6
classes driving PixiJS - React is a one-file mounting shell
(`src/components/PixiWrapper.jsx`), not a real part of the architecture.

## 1. The real architecture, as it actually is today

### The core rule (confirmed by tracing it, not assumed)

Every message from the server funnels through exactly one place
(`WebSocketService.js`), which turns it into a named local `eventBus`
event. Exactly one other place listens for that event name and reacts.
Nothing else talks to the server directly, and nothing skips the chain -
**with two significant exceptions**, covered in section 2.

Two naming conventions coexist for what is conceptually the same layer,
and this is itself worth knowing before touching more code:

- **Raw bus events** (`EventBus.js`, global, anyone can subscribe):
  dot-separated - `game.state.updated`, `turn.changed`, `pieces.moved`.
- **`StateCoordinator`-relayed events** (scoped to the active game scene
  only - `StateCoordinator extends PIXI.Container` and components call
  `stateCoordinator.on(...)`, not `eventBus.subscribe(...)` directly):
  colon-separated - `turn:changed`, `pieces:moved`, `game:ended`.

`StateCoordinator.setupEventListeners()`
(`src/pixi/scenes/game-scene/managers/StateCoordinator.js:20-99`) is a
second relay layer that exists specifically because components *inside*
the game scene shouldn't need to know about the raw bus - they ask the
coordinator instead. Every single raw event it cares about is explicitly
re-emitted under a colon-separated name; this mapping is applied
consistently (checked every subscribe call in the file), but the dot/colon
split itself isn't something anyone designed on purpose - it's just what
falls out of "the bus uses dots, and colons happened to be used for the
second layer." A reader hitting both for the first time has no way to know
that from naming alone.

### Representative chains, traced end to end

**Dice roll** (button click -> number on screen):

```
DiceComponent.handleRollClick()                                  (DiceComponent.js:200)
  -> eventBus.emit('game.dice.roll.request')
StateCoordinator.subscribe('game.dice.roll.request')              (StateCoordinator.js:22)
  -> gameService.rollDice()
GameService.rollDice() -> webSocketService.rollDice()
WebSocketService.rollDice() -> STOMP publish /app/game.roll
  ...server responds DICE_ROLL_RECEIVED (ack, mostly ignored) then
  broadcasts DICE_ROLLED on /topic/game/{id}/events...
WebSocketService.handleBroadcastEvent() case 'DICE_ROLLED'          (WebSocketService.js:315)
  -> eventBus.emit('game.dice', event)
GameService.handleDiceEvent()                                      (GameService.js:161)
  -> eventBus.emit('dice.updated', { new: { die1, die2 } })
StateCoordinator.subscribe('dice.updated')                          (StateCoordinator.js:26)
  -> this.emit('dice:updated', data)
GameControlsContainer.stateCoordinator.on('dice:updated')           (GameControlsContainer.js:107)
  -> this.dice.setTargetValues(die1, die2); this.dice.setValue(die1, die2)
```

Seven hops, three different files doing "handle a dice event" work
(`WebSocketService`, `GameService`, `StateCoordinator`), to get a number
from the server onto the dice sprite. Each hop is individually simple and
consistent with the rule above; the chain as a whole is long.

**Move selection** (clicking an option -> piece moves):

```
MoveManager.selectMove(move) -> this.gameScene.selectPiece(move.number)
  (gameScene here is a tiny proxy object built inline in
   GameBoardContainer.createComponents(), not the real GameScene -
   GameBoardContainer.js:58-62)
  -> stateCoordinator.selectPiece(pieceIndex) -> gameService.selectPiece(pieceIndex)
  -> webSocketService.makeChoice(pieceIndex) -> STOMP publish /app/game.choice
  ...server resolves the move, broadcasts an updated GameState...
WebSocketService -> eventBus.emit('game.state.updated', ...) (via handleBroadcastEvent's GAME_STATE_UPDATE/GAME_STARTED paths)
GameService.updateGameState() -> emitStateChangeEvents()             (GameService.js:231)
  -> diffs old vs new state, emits 'pieces.moved' if positions changed
StateCoordinator.subscribe('pieces.moved') -> emit('pieces:moved', ...)
GameBoardContainer.stateCoordinator.on('pieces:moved')
  -> this.pieces.movePiece(pieceId, from, to) for each movement
```

**Lobby expiry** (built this session - shortest chain in the app, and a
good example of the pattern working cleanly):

```
WebSocketService.handlePersonalResponse() case 'LOBBY_EXPIRED'      (WebSocketService.js:258)
  -> eventBus.emit('lobby.expired', { message })
LobbyScene.subscribe('lobby.expired')                                (LobbyScene.js, added this session)
  -> showError(message); showMainMenu()
```

Two hops. This one skips `GameService`/`StateCoordinator` entirely because
it's a lobby-level concern, not a during-game concern - correctly so, since
`StateCoordinator` only exists inside the active game scene.

### File-by-file role map

| File | Role |
|---|---|
| `utils/EventBus.js` | Global pub/sub. Plain `emit`/`subscribe`/`unsubscribe`/`clear`. No typing, no event name registry - any string works. |
| `utils/PlayerIdentity.js` | Generates/persists a player id. **Splits behavior by hostname**: `sessionStorage` on `localhost` (per-tab, lets you test two "players" in two tabs), `localStorage` in production (shared across tabs on the same browser). Found this session as a real gotcha - testing "two players" with two tabs of the same browser against the *production* URL gives both tabs the same id. |
| `utils/constants.js` | Static values (not read in depth - small, low-risk). |
| `services/WebSocketService.js` | Owns the STOMP connection. Every server message becomes exactly one `eventBus.emit`. See section 2 for the string-parsing it still does. |
| `services/GameService.js` | Owns `currentState` (the latest `GameState` snapshot) and diffs old-vs-new to emit granular events (`dice.updated`, `pieces.moved`, `turn.changed`, `game.ended`). Also the action-method facade (`createGame`, `rollDice`, `selectPiece`, ...) that UI components actually call. |
| `pixi/PixiApp.js` | Top-level Pixi app bootstrap; owns `SceneManager`, wires the two scenes' top-level transitions (`game.left`, `game.state.updated` -> scene switch). |
| `pixi/SceneManager.js` | Switches between the `lobby` and `game` `PIXI.Container` scenes. |
| `pixi/scenes/LobbyScene.js` | Pre-game screen: create/join panels, `WaitingRoom`. Owns the countdown and `LOBBY_EXPIRED` handling added this session. |
| `pixi/scenes/game-scene/GameScene.js` | Container for the active game screen; composes `GameBoardContainer`, `GameControlsContainer`, `GameUIContainer`, `PlayerAreaContainer` via `StateCoordinator`. |
| `pixi/scenes/game-scene/managers/StateCoordinator.js` | The second relay layer described above. Also the only place with cross-cutting state not owned by `GameService` - `activeAnimations` (a counter, see section 2 for the bug this already caused once). |
| `pixi/scenes/game-scene/managers/ConnectionHandler.js`, `LayoutManager.js` | Scoped helpers (connection-lost UI, responsive layout math) - not read in depth, no sign of touching the event chain in a surprising way. |
| `pixi/scenes/game-scene/components/GameBoardContainer.js` | Composes `BoardComponent` + `PiecesContainer` + `MoveManager`. See section 2 for direct-reference coupling here. |
| `pixi/scenes/game-scene/components/GameControlsContainer.js` | Dice button + turn-state enable/disable. |
| `pixi/scenes/game-scene/components/GameUIContainer.js` | Overlays: toast messages, the win screen, and (added this session) the forced-end screen for forfeits. |
| `pixi/scenes/game-scene/components/PlayerAreaContainer.js` | Player panels (name, pieces, turn indicator). |
| `pixi/components/game/BoardComponent.js` | Renders the static 15x15 board grid. |
| `pixi/components/game/PiecesContainer.js` | Owns every piece sprite, position math, movement animation, **and already has dormant per-piece hover/click interactivity** - see section 3, this is the single most important finding for the redesign. |
| `pixi/components/game/MoveManager.js` | The current fixed move-options panel (the thing the redesign replaces). |
| `pixi/components/game/DiceComponent.js` | Dice sprite, roll animation, idle/turn-glow animations. |
| `pixi/components/game/PlayerPanel.js` | One player's info card + turn indicator (the fade fix from earlier this session lives here). |
| `pixi/components/lobby/*` | `CreateGamePanel`, `JoinGamePanel`, `WaitingRoom`, `LobbyBackground` - see section 2 for the direct-import bypass in the first two. |
| `pixi/components/ui/*` | Generic `Button`, `Panel`, `TextInput`, `ConfirmDialog` - presentational, no event-bus involvement, nothing notable found. |
| `pixi/config/pixiConfig.js`, `scenes/game-scene/config/layout.config.js` | Static layout/config constants. |
| `pixi/utils/coordinateUtils.js` | Board-coordinate <-> pixel math (`backendToPixel`, path generation for animation). |

## 2. Where the pattern breaks down

### The two most significant breaks - both bypass the event bus entirely for the two most fundamental actions in the app

`CreateGamePanel.handleCreateGame()` (`CreateGamePanel.js:228-242`) and
`JoinGamePanel.handleJoinGame()` (`JoinGamePanel.js:292-306`) both do this,
verbatim in both files:

```js
// Send create game request through EventBus
eventBus.emit('lobby.create.game.request');

// Also call GameService directly as backup
import('../../../services/GameService').then(({ default: gameService }) => {
  gameService.createGame();
});
```

Checked directly: **nothing in the entire codebase subscribes to
`lobby.create.game.request` or `lobby.join.game.request`.** The event
emission is dead code that looks like it's following the established
pattern. The comment calls the dynamic import "a backup," but it's the
*only* thing that actually works - a dynamic ES module import at runtime,
inside a UI component, reaching directly into the service layer. This is
exactly the kind of direct coupling the rest of the app avoids, on the two
highest-traffic actions (create game, join game), with misleading dead
code sitting next to it.

### Other confirmed-dead event names (checked both directions with grep, not assumed)

- `game.players` / `game.move` - subscribed in `GameService.js:66-72`
  (`handleMoveEvent`, `handlePlayerEvent`), **never emitted anywhere**.
  Dead listeners.
- `game.piece.selected` - emitted from
  `PiecesContainer.handlePieceClick()` (`PiecesContainer.js:303`),
  **never subscribed anywhere**. This one matters more than a typical dead
  emit - see section 3, it's half of an already-built feature with nowhere
  to land.

### Direct object coupling that bypasses the bus (smaller, but relevant to the redesign)

`GameBoardContainer.createComponents()` (`GameBoardContainer.js:64-68`)
constructs `MoveManager` with direct references to both `this.board` and
`this.pieces`:

```js
this.moveManager = new MoveManager({
  gameScene: gameSceneProxy,
  boardComponent: this.board,
  piecesContainer: this.pieces
});
```

Checked `MoveManager.js`: `this.boardComponent` and `this.piecesContainer`
are assigned in the constructor (`MoveManager.js:13-14`) and **never read
anywhere else in the file**. This isn't an active bug - it's inert - but
it's misleading: anyone reading `GameBoardContainer` would reasonably
assume `MoveManager` uses the board/pieces it was handed, when it doesn't.
Worth knowing before building the piece-anchored contextual menu the
redesign calls for, since that menu will need a *real* version of exactly
this coupling (it has to know where a specific piece is on screen to
anchor itself) - the dead parameter is almost a placeholder for work that
was never finished.

### String-parsing of server messages that survived the earlier cleanup

Earlier this session, `GameService.mapAvailableMoves` replaced
regex-parsing of move-option text with structured fields precisely because
string-parsing is fragile. The same anti-pattern exists in two other
places that weren't touched:

- `WebSocketService.extractGameId()` (`WebSocketService.js:355-358`):
  ```js
  extractGameId(message) {
    const match = message.match(/Game (\w+) created/);
    return match ? match[1] : null;
  }
  ```
  This is load-bearing - `handleGameCreated` can't subscribe to game
  events without a gameId, and the backend's `GAME_CREATED` response
  doesn't send one as a structured field, only embedded in the message
  string. If that message's wording ever changes, game creation silently
  breaks with no error - `extractGameId` just returns `null` and
  `handleGameCreated` logs `'Could not extract gameId'`.

- `GameService.handleDiceEvent()` (`GameService.js:161-177`):
  ```js
  const die1 = parseInt(event.message.charAt(0), 10);
  const die2 = parseInt(event.message.charAt(1), 10);
  ```
  Reads the dice values by *character position* out of a raw concatenated
  string. This matches how the backend actually sends it today
  (`GameManager.handleDiceRoll` does `broadcaster.broadcastToGame(...,
  GameResponse.success(DICE_ROLLED, (die1 + die2), null))` - string
  concatenation, not structured fields) - so this isn't a frontend bug in
  isolation, it's a backend-and-frontend pair of the same anti-pattern.
  Works today only because Ludo dice are always single digits (1-6); it
  is not a safe pattern to extend.

### Emoji-prefixed logging, scope confirmed

16 files still carry emoji-prefixed `console.log` calls: `App.js`,
`PixiApp.js`, `SceneManager.js`, `BoardComponent.js`, `DiceComponent.js`,
`PiecesContainer.js`, `CreateGamePanel.js`, `JoinGamePanel.js`,
`WaitingRoom.js` (partially cleaned this session - only the methods
touched then), `LobbyScene.js`, `GameScene.js`, `GameUIContainer.js`,
`ConnectionHandler.js`, `GameService.js`, `EventBus.js`,
`PlayerIdentity.js`. Already flagged by the user as unprofessional and
logged as a standing preference (`feedback-no-emojis-in-code` memory) -
noted here for completeness, not a new finding, and explicitly deferred
("we will clean it later").

## 3. Readiness for the move-selection redesign

**The most important finding in this whole map: the redesign is not
starting from scratch.** `PiecesContainer.setupPieceInteraction()`
(`PiecesContainer.js:194-221`) already wires, per piece:

- `pointerover` / `pointerout` - hover scale + highlight-alpha animation,
  plus a tooltip.
- `pointerdown` - calls `handlePieceClick()`, which emits
  `game.piece.selected` (dead, see section 2) and calls a local
  `selectPiece(piece)` visual-state helper.
- All of it gated on a `piece.canMove` flag.

The gate is the entire gap: `piece.canMove = false` is set exactly once,
at piece creation (`PiecesContainer.js:77`), and **nothing anywhere ever
sets it `true`**. The hover/click handlers are real, tested-shaped code
sitting dormant behind a flag that never flips. This is the same shape as
two other things found earlier this session in the backend
(`MoveType.COMBINED` existing but never generated; `ComputerPlayer`
existing but never wired up) - a half-built feature, not an absence of one.

Concretely, this means the redesign's first piece - "every piece with a
legal move glows on the board" - is mostly **wiring, not building**:

1. When `moves.available` arrives, derive the set of pieceIds with a legal
   move and set `piece.canMove = true` for exactly those (today nothing
   ever sets this after construction).
2. Give `game.piece.selected` somewhere real to land - a new
   `StateCoordinator` relay (`piece:selected` matching the colon
   convention) that something in `GameBoardContainer` or a new component
   subscribes to.
3. The "glow" visual itself needs to exist as a distinct state from the
   existing hover highlight (`piece.highlight` is already used for hover -
   reusing it for "has a legal move" would collide with hover on the same
   piece. Needs its own visual layer or at minimum its own alpha/color
   target the hover tween doesn't fight with.)

What's genuinely new work, not wiring:

- **The piece-anchored contextual mini-menu** (replacing `MoveManager`'s
  fixed panel for the "which die" step). Nothing in the current
  architecture positions UI relative to a moving sprite's current screen
  coordinates - `MoveManager`'s panel is placed with fixed/responsive
  screen-relative math (`MoveManager.js`, panel positioning logic), not
  piece-relative. This needs new positioning logic, likely reading the
  selected piece's live `x`/`y` each frame or on each reposition event.
- **Board-level capture-preview highlighting** - needs the backend's new
  `willCapture`/`capturedPieceId` fields (per the redesign doc) to reach a
  piece-lookup-by-id on the board side. `PiecesContainer` already indexes
  pieces by id internally (used by `movePiece(pieceId, ...)`), so the
  lookup mechanism exists - only the "highlight this one" visual state is
  new.
- **Retiring the `CAPTURE_OPTIONS` list path** in favor of tapping the
  specific enemy piece - straightforward given the piece-click
  infrastructure already exists; the main work is removing the
  now-redundant list-rendering branch in `MoveManager`/`WebSocketService`'s
  `CAPTURE_OPTIONS` case once the board-based path replaces it.

**Does the event-bus pattern strain under this?** Mostly no, with one
real exception: `moves.available` today carries a flat list of move
*descriptions* for a panel to render. The redesign needs the same
underlying data reshaped into "a set of pieceIds to glow" plus, per piece,
"which specific moves are available for it" - richer, more structured than
what one `eventBus.emit` with a flat array currently models. This doesn't
break the one-event-one-listener convention, but it does mean the
*payload shape* for this specific event needs to grow up front, which is
worth deciding deliberately rather than bolting fields on ad hoc (mirrors
exactly the `MoveOptionState` structured-fields decision already made in
the redesign doc for the backend side).

## 4. Refactor recommendation

**Must fix before adding more components** (load-bearing - leaving these
as-is will actively make the redesign harder or more confusing to build
correctly):

1. **Resolve the `CreateGamePanel`/`JoinGamePanel` dead-event-vs-direct-import
   split.** Pick one mechanism (the direct import already works and is the
   simplest fix: delete the dead `eventBus.emit` calls and the misleading
   comment). Not urgent for correctness - it already works - but it
   actively lies about how the app is wired, in the exact two places
   someone will look first when learning the codebase.
2. **Fix `piece.canMove`'s dead gate, or remove the hover/click code until
   it's wired.** Right now it reads as "pieces aren't interactive" when
   the truth is "pieces have interactivity that nothing turns on." Since
   the redesign needs this exact mechanism, this is really "finish it,"
   not "fix it" - listed here because leaving it dormant while building
   more on top of `PiecesContainer` risks two half-built interaction
   systems coexisting.
3. **Decide the richer `moves.available` payload shape now**, before
   `MoveManager`, `GameBoardContainer`, and whatever new piece-highlight
   logic all need to independently guess at it.

**Worth doing eventually, not blocking:**

4. Remove the two dead event listeners (`game.players`, `game.move`) and
   the dead `game.piece.selected` emit once it's reconnected to something
   real (per item 2).
5. Reconcile the dot/colon naming split - at minimum, document it (now
   done, in section 1); actually unifying it is a larger mechanical
   rename across every file, with no functional payoff, so it's cosmetic
   enough to defer indefinitely.
6. The emoji logging cleanup (already tracked separately as a deferred
   preference, not new).
7. `extractGameId`'s string-parsing - only risky if the backend's message
   wording ever changes; low priority until/unless that happens, though
   the fix (backend sends the id as a structured field instead of only in
   prose) is small whenever it's done.

**Not blocking at all, and I wouldn't spend time on it right now:** the
`dice.message`-character-parsing pairing with the backend - it works,
it's simple, dice values are permanently single-digit by the rules of the
game itself, and fixing it requires a coordinated backend+frontend change
for a problem that isn't currently causing anything to break.

## 5. TypeScript migration assessment

**Verdict: worth doing, but as an incremental, file-by-file migration
starting now (or at least before the redesign adds a meaningful number of
new files) - not a full rewrite, and not something to defer indefinitely
either.**

### Why "now rather than never"

The codebase is small enough (10,300 lines, 33 files) that migration cost
is still low, and about to grow - the redesign adds new interaction state
(per-piece `canMove`/`willCapture`/`isSelected` flags, a new contextual UI
component, richer event payloads) that is exactly the kind of thing that
gets harder to keep consistent by convention alone as more files touch it.
Waiting until after several more components are added makes the migration
strictly more expensive for no added benefit.

### Checked against this session's actual bugs - would TS have caught them?

This matters more than abstract judgment, since every one of these was a
real, confirmed production issue this session:

- **The backwards capture-description bug** (`MoveOption` built with the
  captured piece as its subject, not the capturer) - **TS would not have
  caught this.** Both pieces are the same `Piece` type; the bug is a
  misunderstanding of *which* value, not a type mismatch. Pure logic bug.
- **The `response.message` vs `response.error` field confusion** (backend
  puts forfeit/error text in different fields depending on success/error)
  - **TS would have caught this, directly and immediately**, if the
  `GameResponse` wire shape were a typed interface (`message: string |
  null; error: string | null`) - reading `response.message` where only
  `response.error` was populated would be a defined, non-null-asserted
  access TS flags at the exact call site, instead of a runtime `undefined`
  discovered by reading logs after the fact.
- **The `piece.animation.start`/`piece.animation.complete` imbalance**
  (an early-return path skipped the paired `complete` emit, leaving
  `activeAnimations` stuck incremented forever) - **TS would not have
  caught this.** Both emits are syntactically valid, correctly-typed calls
  to the same function; the bug is a missing call on one code path, which
  is a control-flow/logic issue, not a type issue.
- **The dead `lobby.create.game.request`/`lobby.join.game.request`
  events, and the two dead `game.players`/`game.move` listeners** - **TS
  alone would not have caught these either** (an `eventBus.emit('any
  string', ...)` is valid regardless of whether anything listens), but a
  *typed* event bus - a discriminated union of known event names mapped to
  their payload shapes - would make an unlisted-anywhere event name either
  a compile error or at least groupable/searchable in a way plain strings
  never are. This is a realistic, concrete payoff specific to this
  codebase's actual event-bus pattern, not a generic "TS is good" claim.

Net honest read: roughly half of this session's real bugs were logic
errors TS genuinely would not have prevented. The other half - mismatched
field names on a loosely-shaped network payload, and silently-dead string
based event wiring - are exactly TS's strongest use case, and this
codebase has an unusually large amount of exactly that shape (every
server message is an untyped `JSON.parse(message.body)`, every event
payload is an untyped object literal). That's the real argument for doing
it, not a generic best-practice one.

### Realistic migration path

1. **Don't rewrite.** `react-scripts` (CRA) supports mixed `.js`/`.ts` via
   `allowJs: true` out of the box - add a `tsconfig.json`, keep every
   existing `.js` file exactly as-is, and only new/touched files become
   `.ts`.
2. **Type the wire format first, before any component work** - this is
   the highest-leverage single step. A `types/messages.ts` (or similar)
   defining the shape of `GameResponse`/`GameState`/`MoveOptionState` (the
   same shapes the backend's `GameResponse.java`/`GameState.java` already
   define informally) turns every `response.message || response.error`
   -style guess into a checked access. This alone would have caught the
   exact bug found and fixed this session.
3. **Type the event bus second** - a `type EventMap = { 'lobby.expired':
   { message: string }; 'dice.updated': { new: { die1: number; die2:
   number } }; ... }` keyed to every real event name in the app (the
   emit/subscribe count tables built while writing this doc are close to
   a first draft of that map already), with `EventBus.emit`/`subscribe`
   generic over it. This directly exposes dead event names and payload
   mismatches at compile time - the single most relevant payoff for this
   specific codebase's actual architecture.
4. **Convert PixiJS component classes incrementally, new work first** -
   start with whatever the move-selection redesign adds (new files are
   `.ts` from day one), then opportunistically convert existing files only
   when already touching them for another reason. Pixi.js itself ships
   TypeScript types, so component classes extending `PIXI.Container` get
   real typing on `this.x`/`this.y`/`this.children` etc. for free once
   converted - no extra type-definition work needed there.
5. **Leave the one React file last, if ever** - `PixiWrapper.jsx` is a
   single mounting component; converting it is low-value busywork
   relative to the service/event-bus/Pixi-component layers above, where
   the actual bugs live.

This is a multi-session effort on its own, not something to fold into the
move-selection redesign - but step 2 (typing the wire format) is small
enough, and valuable enough on its own, that it's worth doing as a
standalone first step before or alongside the redesign's backend changes,
rather than waiting for a dedicated "do the TS migration" session.
