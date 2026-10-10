# Move Selection Redesign

**Status:** Design agreed, not yet implemented.
**Origin:** Started as backlog ticket "combined-dice move" - grew into a full
rethink of how a turn works after questioning whether the underlying
interaction (a text-list menu) was the right model at all, not just whether
its wording was clear. Combined-dice is now a natural byproduct of this
redesign rather than its own separate feature.

## The problem with the current model

A turn today works like this:

1. Roll the dice.
2. A text panel pops up, disconnected from the board, listing every legal
   move as a numbered row: *"1. Move R1 3 spaces to Position(row=5, col=3)",
   "2. Move R2 4 spaces to Position(row=2, col=8)"*.
3. The player reads the list, mentally maps "R1" back to a shape on the
   board, and clicks a button nowhere near the piece it describes.

Walked through purely as a player, this inserts an abstracted, disconnected
step between intent and the board. Physical Ludo has no menu - you just
pick up the piece you want to move. The current implementation makes the
player do translation work (text label -> board piece) that the UI should
be doing instead.

Specific problems this causes, found by tracing the actual code:

- **Coordinates shown are raw board cells** (`Position(row=5, col=3)`) -
  meaningless to a human player.
- **The capture description is backwards.** `MoveExecutor` builds capture
  `MoveOption`s using the *piece being captured*, not the piece doing the
  capturing - so the text reads as if the victim is capturing itself.
- **No move option reveals its consequences before you pick it.**
  `MoveExecutor.calculatePossibleMoves()` only enumerates mechanics (which
  piece, which die) - it never looks ahead to check whether a candidate
  landing square would capture an opponent. That check only happens
  *after* the move is already committed, inside `movePiece()`. A player
  choosing between two normal moves today has no way to know which one (if
  any) captures something until it's too late to reconsider.
- **Adding combined-dice as a 5th list entry would compound this**, not
  fix it - one more unclear line in an already-unclear list.

## The proposed model: the board is the interface, not a side panel

1. Roll the dice.
2. **Every piece with at least one legal move glows on the board directly**
   - nothing else happens yet. If more than one piece can move, **all of
     them glow simultaneously** - the player isn't forced to consider them
     one at a time.
3. The player taps/clicks the piece they want to move, right where it is
   on the board.
   - Tapping a *different* glowing piece just shifts focus to it. Nothing
     commits until an actual die/number is chosen - matches how physical
     Ludo lets you reconsider freely before your hand actually moves a
     piece.
4. **Only if the selected piece has more than one legal way to move**
   (e.g. die 3, die 4, or the combined 7) does a small, local choice
   appear, anchored next to that specific piece - not a global list, just
   the 2-3 numbers relevant to the one piece already chosen.
5. **If a candidate move would capture something, the piece that would be
   captured glows on the board too** - shown spatially, where it happens,
   instead of described in a sentence.
6. **Multi-capture (landing on a stack of several enemy pieces) also
   becomes board-based** - tap the specific enemy piece to capture,
   consistent with everything above, replacing the one remaining
   list-based exception.

Most turns end up as: glow -> tap -> done, with no menu at all. A menu (if
you can still call it that) only ever appears as a tiny, contextual,
last-step disambiguation for the rare case where one piece genuinely has
more than one option.

This also isn't a novel risk - it's the standard interaction pattern most
commercial Ludo/board-game apps already use (tap the piece on the board,
not a dropdown). This redesign is catching up to a well-worn convention,
not inventing one.

## What this requires, at a high level

**Backend:**
- `calculatePossibleMoves()` (or a new method near it) needs to look ahead
  per candidate move and determine whether it would land on and capture an
  opponent piece - not just enumerate raw mechanics. This is the same
  consequence-preview data path discussed for "Path B" during the original
  combined-dice conversation; it ends up serving both the preview-on-board
  need here and the original clarity concern there.
- `MoveOptionState` (the wire format sent to the frontend) needs structured
  fields for this - e.g. `willCapture` / `capturedPieceId` - rather than
  baking it into prose text. Baking it into a string would mean going back
  to frontend string-parsing, the exact fragile pattern already removed
  from this codebase earlier (see `GameService.mapAvailableMoves`).
- The backwards capture-description bug (piece-being-captured used as the
  `MoveOption`'s subject) needs fixing regardless of anything else here.

**Frontend:**
- Pieces need a real "has a legal move" visual state (glow/highlight),
  driven by the set of currently-legal moves, not just the existing
  animation-lock interactivity toggle.
- A small, piece-anchored contextual UI replaces the current fixed
  `MoveManager` panel for the "which die" disambiguation step - positioned
  near the selected piece, not in a fixed screen location.
- A "would be captured" highlight state on board pieces, driven by the new
  backend `willCapture`/`capturedPieceId` fields, shown live once a piece
  is selected (or per legal move, before selection - see open questions).
- The existing separate `CAPTURE_OPTIONS` list flow is retired in favor of
  tapping the specific enemy piece directly on the board.

## Open questions, not yet resolved (deliberately out of scope until raised)

- Does the "would be captured" highlight show for *every* glowing piece's
  possible moves simultaneously (a lot of visual information at once), or
  only after a piece is selected and its specific die-choices are being
  considered (less information, but requires the extra selection step
  first)?
- Does selecting a piece that turns out to have only one legal move skip
  the contextual mini-menu entirely and just execute immediately, or does
  it still show a single-option confirmation step?
- Exact visual language for "has a legal move" vs "would capture if chosen"
  vs "would be captured" - distinct colors/animations needed so these three
  states don't visually collide, especially once more than one piece glows
  at once.

## Relationship to existing backlog tickets

- Supersedes the original "combined-dice move" ticket's frontend-facing
  scope - the backend logic question from that ticket (dice consumption
  when a combined move is chosen, in `Game.java`'s turn loop) is still
  accurate and still needs doing, but the "how is this presented" half is
  now answered by this document instead.
- Does not change anything about the join-timeout, leave-forfeit, or
  observability work shipped separately - this is scoped purely to the
  move-selection interaction itself.
