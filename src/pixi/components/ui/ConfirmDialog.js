import * as PIXI from 'pixi.js';
import Button from './Button';

/**
 * ConfirmDialog - Custom styled confirmation dialog
 */
class ConfirmDialog extends PIXI.Container {
  constructor(options = {}) {
    super();

    this.options = {
      title: options.title || 'Confirm',
      message: options.message || 'Are you sure?',
      confirmText: options.confirmText || 'Yes',
      cancelText: options.cancelText || 'Cancel',
      width: options.width || 400,
      height: options.height || 200,
      canvasWidth: options.canvasWidth || window.innerWidth,
      canvasHeight: options.canvasHeight || window.innerHeight,
      onConfirm: options.onConfirm || (() => {}),
      onCancel: options.onCancel || (() => {})
    };

    this.createDialog();
    this.visible = false;
  }

  createDialog() {
    // Semi-transparent background overlay
    this.overlay = new PIXI.Graphics();
    this.overlay.beginFill(0x000000, 0.7);
    this.overlay.drawRect(0, 0, this.options.canvasWidth, this.options.canvasHeight);
    this.overlay.endFill();
    this.overlay.interactive = true;
    this.overlay.on('pointerdown', (e) => e.stopPropagation());
    this.addChild(this.overlay);

    // Dialog box - centered on canvas
    const dialogX = (this.options.canvasWidth - this.options.width) / 2;
    const dialogY = (this.options.canvasHeight - this.options.height) / 2;

    this.dialog = new PIXI.Graphics();
    this.dialog.beginFill(0x2a2a2a);
    this.dialog.lineStyle(3, 0x444444);
    this.dialog.drawRoundedRect(0, 0, this.options.width, this.options.height, 10);
    this.dialog.endFill();
    this.dialog.x = dialogX;
    this.dialog.y = dialogY;
    this.addChild(this.dialog);

    // Title
    this.titleText = new PIXI.Text(this.options.title, {
      fontFamily: 'Arial, sans-serif',
      fontSize: 24,
      fill: '#ffffff',
      fontWeight: 'bold',
      align: 'center'
    });
    this.titleText.anchor.set(0.5, 0);
    this.titleText.x = dialogX + this.options.width / 2;
    this.titleText.y = dialogY + 20;
    this.addChild(this.titleText);

    // Message
    this.messageText = new PIXI.Text(this.options.message, {
      fontFamily: 'Arial, sans-serif',
      fontSize: 16,
      fill: '#cccccc',
      align: 'center',
      wordWrap: true,
      wordWrapWidth: this.options.width - 40
    });
    this.messageText.anchor.set(0.5, 0);
    this.messageText.x = dialogX + this.options.width / 2;
    this.messageText.y = dialogY + 70;
    this.addChild(this.messageText);

    // Buttons
    const buttonY = dialogY + this.options.height - 60;
    const buttonSpacing = 20;
    const buttonWidth = (this.options.width - 60 - buttonSpacing) / 2;

    // Cancel button
    this.cancelButton = new Button({
      text: this.options.cancelText,
      width: buttonWidth,
      height: 40,
      backgroundColor: 0x555555,
      hoverColor: 0x666666,
      pressedColor: 0x444444,
      fontSize: 14
    });
    this.cancelButton.x = dialogX + 30;
    this.cancelButton.y = buttonY;
    this.cancelButton.onButtonClick = () => this.handleCancel();
    this.addChild(this.cancelButton);

    // Confirm button
    this.confirmButton = new Button({
      text: this.options.confirmText,
      width: buttonWidth,
      height: 40,
      backgroundColor: 0xff4444,
      hoverColor: 0xcc3333,
      pressedColor: 0x992222,
      fontSize: 14
    });
    this.confirmButton.x = dialogX + 30 + buttonWidth + buttonSpacing;
    this.confirmButton.y = buttonY;
    this.confirmButton.onButtonClick = () => this.handleConfirm();
    this.addChild(this.confirmButton);
  }

  handleConfirm() {
    this.hide();
    this.options.onConfirm();
  }

  handleCancel() {
    this.hide();
    this.options.onCancel();
  }

  show() {
    this.visible = true;
  }

  hide() {
    this.visible = false;
  }

  updateLayout(width, height) {
    // Update overlay size
    this.overlay.clear();
    this.overlay.beginFill(0x000000, 0.7);
    this.overlay.drawRect(0, 0, width, height);
    this.overlay.endFill();

    // Recenter dialog
    const dialogX = (width - this.options.width) / 2;
    const dialogY = (height - this.options.height) / 2;

    this.dialog.x = dialogX;
    this.dialog.y = dialogY;

    this.titleText.x = dialogX + this.options.width / 2;
    this.titleText.y = dialogY + 20;

    this.messageText.x = dialogX + this.options.width / 2;
    this.messageText.y = dialogY + 70;

    const buttonY = dialogY + this.options.height - 60;
    const buttonSpacing = 20;
    const buttonWidth = (this.options.width - 60 - buttonSpacing) / 2;

    this.cancelButton.x = dialogX + 30;
    this.cancelButton.y = buttonY;

    this.confirmButton.x = dialogX + 30 + buttonWidth + buttonSpacing;
    this.confirmButton.y = buttonY;
  }

  destroy(options) {
    if (this.cancelButton) this.cancelButton.destroy();
    if (this.confirmButton) this.confirmButton.destroy();
    super.destroy(options);
  }
}

export default ConfirmDialog;
