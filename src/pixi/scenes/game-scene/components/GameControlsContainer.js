import * as PIXI from 'pixi.js';
import DiceComponent from '../../../components/game/DiceComponent';

/**
 * GameControlsContainer - Encapsulates dice and turn indicator
 */
class GameControlsContainer extends PIXI.Container {
  constructor(layout, stateCoordinator, connectionHandler) {
    super();
    
    this.layout = layout;
    this.stateCoordinator = stateCoordinator;
    this.connectionHandler = connectionHandler;
    
    this.dice = null;
    this.turnText = null;
    
    this.createComponents();
    this.setupEventListeners();
  }

  /**
   * Create child components
   */
  createComponents() {
    const diceLayout = this.layout.getDiceLayout();
    
    // Create dice
    this.dice = new DiceComponent({
      size: diceLayout.size,
      interactive: true,
      rollDuration: 1500
    });
    
    this.dice.x = diceLayout.x;
    this.dice.y = diceLayout.y;
    this.addChild(this.dice);
    
    // Create turn indicator
    const uiLayout = this.layout.getUILayout();
    this.turnText = new PIXI.Text('', {
      fontFamily: 'Arial, sans-serif',
      fontSize: uiLayout.turnIndicator.fontSize,
      fill: '#ffdd44',
      align: 'center'
    });
    this.turnText.anchor.set(0.5);
    this.turnText.x = uiLayout.turnIndicator.x;
    this.turnText.y = uiLayout.turnIndicator.y;
    this.addChild(this.turnText);
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Handle dice updates
    this.stateCoordinator.on('dice:updated', (data) => {
      this.handleDiceUpdate(data);
    });

    // Handle turn changes
    this.stateCoordinator.on('turn:changed', (data) => {
      this.handleTurnChange(data);
    });

    // Handle turn messages
    this.stateCoordinator.on('turn:myTurnMessage', (message) => {
      this.handleTurnMessage(message);
    });

    // Handle game end
    this.stateCoordinator.on('game:ended', () => {
      this.dice.setEnabled(false);
      this.dice.hideYourTurn();
    });

    // Handle connection status
    this.stateCoordinator.on('ui:connectionStatus', (data) => {
      if (!data.connected) {
        this.dice.setEnabled(false);
        this.dice.hideYourTurn();
        this.turnText.text = data.message;
        this.turnText.style.fill = '#ff4444';
      }
    });
  }

  /**
   * Handle dice updates from backend
   */
  handleDiceUpdate(data) {
    if (!this.dice || !data.new) return;

    this.connectionHandler.clearDiceTimeout();

    const { die1, die2 } = data.new;
    
    if (die1 > 0 && die2 > 0) {
      if (this.dice.getIsRolling()) {
        this.dice.setTargetValues(die1, die2);
      } else {
        this.dice.setValue(die1, die2);
        
        if (die1 === 6 && die2 === 6) {
          setTimeout(() => {
            this.dice.showDoubleSixAnimation();
          }, 500);
        }
      }
    }
  }

  /**
   * Handle turn changes
   */
  handleTurnChange(data) {
    console.log('GameControls: Turn change', data);
    
    if (this.dice && data.isMyTurn) {
      const currentState = this.stateCoordinator.getCurrentState();
      const diceNotRolled = !currentState?.dice || 
                            (currentState.dice.die1 === 0 && currentState.dice.die2 === 0);
      
      if (diceNotRolled && !this.dice.getIsRolling()) {
        this.dice.setEnabled(true);
        this.dice.showYourTurn();
      }
    }
    
    // Update turn display
    if (this.turnText) {
      if (data.isMyTurn) {
        this.turnText.text = 'YOUR TURN - Click dice to roll!';
        this.turnText.style.fill = '#44ff44';
      } else {
        this.turnText.text = `${data.playerName || data.newPlayer}'s turn`;
        this.turnText.style.fill = '#ffdd44';
      }
    }
  }

  /**
   * Handle turn message
   */
  handleTurnMessage(message) {
    console.log('GameControls: Turn message', message);
    
    if (this.dice) {
      const currentState = this.stateCoordinator.getCurrentState();
      const diceNotRolled = !currentState?.dice || 
                            (currentState.dice.die1 === 0 && currentState.dice.die2 === 0);
      
      if (diceNotRolled && !this.dice.getIsRolling()) {
        this.dice.setEnabled(true);
        this.dice.showYourTurn();
      }
    }
  }

  /**
   * Update layout
   */
  updateLayout() {
    const diceLayout = this.layout.getDiceLayout();
    const uiLayout = this.layout.getUILayout();
    
    if (this.dice) {
      this.dice.x = diceLayout.x;
      this.dice.y = diceLayout.y;
    }
    
    if (this.turnText) {
      this.turnText.x = uiLayout.turnIndicator.x;
      this.turnText.y = uiLayout.turnIndicator.y;
      this.turnText.style.fontSize = uiLayout.turnIndicator.fontSize;
    }
  }

  /**
   * Cleanup
   */
  destroy(options) {
    if (this.dice) this.dice.destroy();
    super.destroy(options);
  }
}

export default GameControlsContainer;
