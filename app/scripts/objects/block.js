export default class Block extends Phaser.GameObjects.Sprite {
  /**
   *  My custom sprite.
   *
   *  @constructor
   *  @class Block
   *  @extends Phaser.GameObjects.Sprite
   *  @param {Phaser.Scene} scene - The scene that owns this sprite.
   *  @param {number} x - The horizontal coordinate relative to the scene viewport.
   *  @param {number} y - The vertical coordinate relative to the scene viewport.
   */
  constructor(scene, x, y, data) {
    super(scene, x, y, data.asset);
    this.data = data;
    this.row = data.row;
    this.col = data.col;
    this.type = data.type;

    this.setInteractive();
    this.on('pointerdown', function () { this.scene.pickBlock(this); }, this);
  }

  reset(x, y, data) {
    this.setPosition(x, y);
    this.setTexture(data.asset);
    this.row = data.row;
    this.col = data.col;
    this.type = data.type;
  }

  deactivate() {
    this.setTexture('deadBlock');
    this.col = null;
    this.row = null;
    this.type = null;

    this.scene.time.delayedCall(this.scene.ANIMATION_TIME / 2, () => {
      this.setActive(false);
      this.setVisible(false);
    });
  }
}
