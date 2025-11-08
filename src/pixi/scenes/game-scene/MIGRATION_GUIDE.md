# GameScene Refactoring - Migration Guide

## Overview
This refactoring transforms a 900+ line monolithic GameScene into a clean, componentized architecture with ~150 lines per file.

## Key Changes

### Before (Problems)
- **900+ lines** in single file
- **Mixed responsibilities**: UI, state, networking, layout all in one place
- **15+ direct event subscriptions** scattered throughout
- **Hard-coded layout** values
- **Complex error handling** mixed with game logic
- **Difficult to test** individual features
- **Hard to maintain** - changes ripple across entire file

### After (Solutions)
- **150 lines per file** - focused, readable
- **Clear separation**: Each component has single responsibility
- **1 central coordinator** handles all events
- **Configuration-driven** responsive layout
- **Isolated error handling** in ConnectionHandler
- **Easy to test** - components are self-contained
- **Easy to maintain** - changes are localized

## Architecture

```
GameScene.js (150 lines)
├── Managers/
│   ├── LayoutManager.js (150 lines) - All positioning logic
│   ├── StateCoordinator.js (130 lines) - All GameService communication
│   └── ConnectionHandler.js (140 lines) - Timeout & recovery logic
├── Components/
│   ├── GameBoardContainer.js (140 lines) - Board + Pieces + Moves
│   ├── GameControlsContainer.js (160 lines) - Dice + Turn indicator
│   ├── PlayerAreaContainer.js (120 lines) - Player panels
│   └── GameUIContainer.js (150 lines) - Messages + Overlays
└── Config/
    └── layout.config.js (130 lines) - All layout configuration
```

## Migration Steps

### Step 1: Add the Config and Managers
1. Copy `config/layout.config.js` to your project
2. Copy `managers/` folder with all 3 managers
3. No changes to existing code yet

### Step 2: Add Components
1. Copy `components/` folder with all 4 containers
2. These encapsulate existing PIXI components you already have

### Step 3: Replace GameScene
1. Backup your current `GameScene.js`
2. Replace with new `GameScene.js`
3. Test thoroughly

### Step 4: Test Each Feature
- [ ] Dice rolling
- [ ] Turn changes
- [ ] Piece movement
- [ ] Move selection
- [ ] Player panels
- [ ] Connection errors
- [ ] Game over
- [ ] Responsive resize

## Key Improvements Explained

### 1. Layout Management
**Before:**
```javascript
this.boardX = 300;
this.boardY = 100;
this.dice.x = this.boardX + this.boardSize + 50;
this.dice.y = this.boardY + 100;
```

**After:**
```javascript
// In layout.config.js
dice: {
  position: {
    desktop: { x: 'board.right+50', y: 'board.top+100' },
    mobile: { x: 'board.right-90', y: 'board.top-50' }
  }
}

// In code
const diceLayout = layoutManager.getDiceLayout();
dice.x = diceLayout.x;
dice.y = diceLayout.y;
```

**Benefits:**
- All layout in one place
- Easy to adjust positioning
- Automatic responsive behavior
- Supports percentages, anchors, relative positioning

### 2. State Management
**Before:**
```javascript
// In GameScene
eventBus.subscribe('dice.updated', (data) => { ... });
eventBus.subscribe('turn.changed', (data) => { ... });
eventBus.subscribe('pieces.moved', (data) => { ... });
// 12+ more subscriptions...
```

**After:**
```javascript
// In StateCoordinator
eventBus.subscribe('dice.updated', (data) => {
  this.emit('dice:updated', data); // Clean, processed event
});

// In GameControlsContainer
stateCoordinator.on('dice:updated', (data) => {
  this.handleDiceUpdate(data);
});
```

**Benefits:**
- Single source of truth
- Components don't need to know about GameService
- Easy to add logging/debugging
- Cleaner event names
- Proper cleanup guaranteed

### 3. Component Isolation
**Before:**
```javascript
// GameScene had to know about everything
this.dice.setValue(die1, die2);
this.pieces.movePiece(...);
this.moveManager.showAvailableMoves(...);
this.playerPanels[0].update(...);
```

**After:**
```javascript
// Each container manages its own children
// GameScene just assembles them
this.controlsContainer = new GameControlsContainer(...);
this.boardContainer = new GameBoardContainer(...);
// Containers listen to their relevant events
```

**Benefits:**
- Can test each component independently
- Can reuse components in different contexts
- Changes don't affect other components
- Clearer dependencies

### 4. Error Handling
**Before:**
```javascript
// Error handling mixed with game logic
handleDiceUpdate() {
  this.clearDiceTimeout();
  if (timeout) { /* recovery logic */ }
  if (offline) { /* connection logic */ }
  // Also do dice update
}
```

**After:**
```javascript
// ConnectionHandler - dedicated to errors/timeouts
class ConnectionHandler {
  handleError(error) { ... }
  startDiceTimeout() { ... }
  attemptRecovery() { ... }
}
```

**Benefits:**
- All error handling in one place
- Easy to improve recovery logic
- Doesn't clutter game logic
- Clear timeout behavior

## What Was Removed

### Removed Entirely (No Longer Needed)
- Manual recovery methods (`retryDiceRoll`, `forceReconnect`)
- Redundant state tracking (`this.currentTurn`, `this.isOffline`)
- Manual event unsubscriber tracking (StateCoordinator handles it)
- Duplicate timeout logic (ConnectionHandler centralizes it)

### Moved to Components
- Dice handling → GameControlsContainer
- Board/pieces → GameBoardContainer
- Player panels → PlayerAreaContainer
- Messages/overlays → GameUIContainer

### Moved to Managers
- Layout calculations → LayoutManager
- Event coordination → StateCoordinator
- Connection/recovery → ConnectionHandler

## Common Issues During Migration

### Issue 1: "Can't find PIXI"
Add to component imports:
```javascript
import * as PIXI from 'pixi.js';
```

### Issue 2: "EventBus not found"
Update paths in StateCoordinator:
```javascript
import eventBus from '../../utils/EventBus'; // Adjust path
import gameService from '../../services/GameService'; // Adjust path
```

### Issue 3: "Components not positioning correctly"
Check that you're calling `updateLayout()` after resize:
```javascript
onResize(width, height) {
  this.layoutManager.updateViewport(width, height);
  this.boardContainer.updateLayout();
  // ... update all containers
}
```

### Issue 4: "Events not firing"
Make sure StateCoordinator is created before components:
```javascript
this.stateCoordinator = new StateCoordinator();
this.connectionHandler = new ConnectionHandler(this.stateCoordinator);
// Then create components
this.boardContainer = new GameBoardContainer(..., this.stateCoordinator);
```

## Testing Checklist

After migration, test these scenarios:

### Basic Functionality
- [ ] Game loads without errors
- [ ] Dice can be clicked and rolls
- [ ] Pieces move when clicked
- [ ] Turn indicator updates
- [ ] Player panels show correct info

### Error Scenarios
- [ ] Disconnect network → see reconnection message
- [ ] Dice timeout → shows fallback behavior
- [ ] Invalid move → shows error message

### Responsive Behavior
- [ ] Resize to mobile → layout adjusts
- [ ] Resize to tablet → layout adjusts
- [ ] Resize to desktop → layout correct

### Performance
- [ ] No memory leaks (check destroy() is called)
- [ ] Animations smooth
- [ ] No console errors

## Benefits Summary

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Lines per file | 900+ | ~150 | 6x smaller |
| Event subscriptions | 15+ scattered | 1 central | Easier to track |
| Layout changes | Edit multiple places | Edit config | Faster updates |
| Test isolation | Difficult | Easy | Better quality |
| Add new feature | Touch multiple sections | Add to one component | Safer changes |
| Debug issue | Search 900 lines | Check relevant component | Faster fixes |

## Next Steps

1. **Start with config**: Get layout.config.js working
2. **Add managers one by one**: Test each manager independently
3. **Add components**: Replace sections of old GameScene incrementally
4. **Full cutover**: Replace entire GameScene when all components work
5. **Cleanup**: Remove old code, add comments, update docs

## Need Help?

Common questions:
- **"Which component should handle X?"** → Check responsibility table above
- **"How do I pass data between components?"** → Use StateCoordinator events
- **"Can I modify the layout?"** → Yes, edit layout.config.js
- **"Component not rendering?"** → Check it's added to scene and has correct position

## Conclusion

This refactoring makes your code:
- ✅ **Maintainable** - Easy to find and fix bugs
- ✅ **Testable** - Components can be tested in isolation
- ✅ **Scalable** - Easy to add new features
- ✅ **Readable** - Clear structure and responsibilities
- ✅ **Flexible** - Layout changes are configuration-driven

The initial migration takes some work, but the long-term benefits are substantial!
