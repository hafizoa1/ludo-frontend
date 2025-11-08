import * as PIXI from 'pixi.js';
import PlayerPanel from '../../../components/game/PlayerPanel';

/**
 * PlayerAreaContainer - Manages all player panels
 */
class PlayerAreaContainer extends PIXI.Container {
  constructor(layout, stateCoordinator) {
    super();
    
    this.layout = layout;
    this.stateCoordinator = stateCoordinator;
    
    this.playerPanels = [];
    this.colors = ['red', 'blue', 'green', 'yellow'];
    
    this.createPanels();
    this.setupEventListeners();
  }

  /**
   * Create player panels
   */
  createPanels() {
    const panelsLayout = this.layout.getPlayerPanelsLayout();

    this.colors.forEach((color, index) => {
      const panelLayout = panelsLayout[index];

      const panel = new PlayerPanel({
        color: color,
        width: panelLayout.width,
        height: panelLayout.height
      });

      // Position panel at absolute coordinates (like old GameScene)
      panel.x = panelLayout.x;
      panel.y = panelLayout.y;

      if (panelLayout.anchor) {
        panel.anchor?.set?.(panelLayout.anchor) ||
        panel.pivot?.set?.(panelLayout.width * panelLayout.anchor, panelLayout.height * panelLayout.anchor);
      }

      this.playerPanels.push(panel);
      this.addChild(panel);
    });
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Handle state updates to refresh player data
    this.stateCoordinator.on('state:updated', (data) => {
      if (data.newState?.players) {
        this.updatePlayerData(data.newState.players);
      }
    });

    // Handle turn changes to highlight active player
    this.stateCoordinator.on('turn:changed', (data) => {
      this.highlightCurrentPlayer(data.newPlayer);
    });
  }

  /**
   * Update player panels with new data
   */
  updatePlayerData(players) {
    players.forEach((playerData, index) => {
      if (this.playerPanels[index]) {
        this.playerPanels[index].updatePlayerData(playerData);
      }
    });
  }

  /**
   * Highlight the current player's panel
   */
  highlightCurrentPlayer(currentPlayerId) {
    const currentState = this.stateCoordinator.getCurrentState();
    
    this.playerPanels.forEach((panel, index) => {
      const panelColor = this.colors[index];
      const isCurrentPlayer = this.isPlayerIdMatchingPanel(currentPlayerId, panelColor, currentState);
      panel.setHighlighted(isCurrentPlayer);
    });
  }

  /**
   * Check if player ID matches panel
   */
  isPlayerIdMatchingPanel(playerId, panelColor, currentState) {
    if (currentState?.players) {
      const player = currentState.players.find(p => p.id === playerId);
      return player && player.color === panelColor;
    }
    return false;
  }

  /**
   * Update layout
   */
  updateLayout() {
    const panelsLayout = this.layout.getPlayerPanelsLayout();
    
    this.playerPanels.forEach((panel, index) => {
      const panelLayout = panelsLayout[index];
      panel.x = panelLayout.x;
      panel.y = panelLayout.y;
    });
  }

  /**
   * Cleanup
   */
  destroy(options) {
    this.playerPanels.forEach(panel => panel.destroy());
    this.playerPanels = [];
    super.destroy(options);
  }
}

export default PlayerAreaContainer;
