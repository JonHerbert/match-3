import Board from '@/objects/board';
import Block from '@/objects/block';

export default class Game extends Phaser.Scene {
  /**
   *  A sample Game scene, displaying the Phaser logo.
   *
   *  @extends Phaser.Scene
   */
  constructor() {
    super({ key: 'Game' });

    this.playerInventory = { 'block1': 0, 'block2': 0, 'block3': 0, 'block4': 0, 'block5': 0, 'block6': 0, 'block7': 0, 'block8': 0 };
    this.aiInventory = { 'block1': 0, 'block2': 0, 'block3': 0, 'block4': 0, 'block5': 0, 'block6': 0, 'block7': 0, 'block8': 0 };
  }

  /**
   *  Called when a scene is initialized. Method responsible for setting up
   *  the game objects of the scene.
   *
   *  @protected
   *  @param {object} data Initialization parameters.
   */
  create(/* data */) {
    this.NUM_ROWS = 8;
    this.NUM_COLS = 8;
    this.NUM_VARIATIONS = 8;
    this.BLOCK_SIZE = 35;
    this.ANIMATION_TIME = 1000;

    // this.background = this.add.sprite(0, 0, 'background');
    // this.background.setOrigin(0);

    this.inventoryDisplayGroup = this.add.group();

    this.board = new Board(
      this,
      this.NUM_ROWS,
      this.NUM_COLS,
      this.NUM_VARIATIONS
    );
    this.blocks = this.add.group();
    this.graphics = this.make.graphics();
    this.drawBoard();
    this.displayInventories();
  }

  drawBoard() {
    this.graphics.fillStyle(0x000, 0.2);
    this.graphics.fillRect(0, 0, this.BLOCK_SIZE + 4, this.BLOCK_SIZE + 4);
    this.graphics.generateTexture(
      'cell',
      this.BLOCK_SIZE + 6,
      this.BLOCK_SIZE + 6
    );

    for (let i = 0; i < this.NUM_ROWS; i++) {
      for (let j = 0; j < this.NUM_COLS; j++) {
        const x = 35 + j * (this.BLOCK_SIZE + 6);
        const y = 300 + i * (this.BLOCK_SIZE + 6);

        this.add.image(x, y, 'cell');

        this.createBlock(x, y, {
          asset: 'block' + this.board.grid[i][j],
          row: i,
          col: j,
          type: 'block' + this.board.grid[i][j],
        });
      }
    }
  }

  createBlock(x, y, data) {
    let block = this.blocks.getFirstDead(false, x, y);

    if (block == null) {
      block = new Block(this, x, y, data);
      this.blocks.add(block, true);
    } else {
      block.reset(x, y, data);
    }

    block.setScale(.85);

    this.children.bringToTop(block);
    block.setActive(true);
    block.setVisible(true);

    return block;
  }

  getBlockFromColRow(block) {
    return this.blocks
      .getChildren()
      .find(item => item.row == block.row && item.col == block.col);
  }

  dropBlock(sourceRow, targetRow, col) {
    const block = this.getBlockFromColRow({ row: sourceRow, col: col });
    const targetY = 300 + targetRow * (this.BLOCK_SIZE + 6);

    block.row = targetRow;
    this.children.bringToTop(block);

    this.tweens.add({
      targets: block,
      y: targetY,
      duration: this.ANIMATION_TIME,
      ease: 'Bounce.easeOut',
    });
  }

  dropReserveBlock(sourceRow, targetRow, col) {
    var x = 35 + col * (this.BLOCK_SIZE + 6);
    var y =
      -(this.BLOCK_SIZE + 6) * this.board.RESERVE_ROW +
      sourceRow * (this.BLOCK_SIZE + 6);

    var block = this.createBlock(x, y, {
      asset: 'block' + this.board.grid[targetRow][col],
      row: targetRow,
      col: col,
      type: 'block' + this.board.grid[targetRow][col],
    });
    var targetY = 300 + targetRow * (this.BLOCK_SIZE + 6);

    this.tweens.add({
      targets: block,
      y: targetY,
      duration: this.ANIMATION_TIME,
      ease: 'Bounce.easeOut',
    });
  }

  swapBlocks(block1, block2) {
    this.tweens.add({
      targets: block1,
      x: block2.x,
      y: block2.y,
      duration: this.ANIMATION_TIME / 2,
      ease: 'Bounce.easeOut',
      onComplete: () => {
        this.children.bringToTop(block1);

        // update model
        this.board.swap(block1, block2);

        if (!this.isReversingSwap) {
          var chains = this.board.findAllChains();

          if (chains.length > 0) {
            this.updateBoard();
          } else {
            this.isReversingSwap = true;
            this.swapBlocks(block1, block2);
          }
        } else {
          this.isReversingSwap = false;
          this.clearSelection();
        }
      }
    });

    this.tweens.add({
      targets: block2,
      x: block1.x,
      y: block1.y,
      duration: this.ANIMATION_TIME / 2,
      ease: 'Bounce.easeOut',
      onComplete: () => {
        this.children.bringToTop(block2);
      }
    });
  }

  pickBlock(block) {

    //only swap if the UI is not blocked
    if (this.isBoardBlocked) {
      return;
    }

    //if there is nothing selected
    if (!this.selectedBlock) {
      this.selectedBlock = block;
      console.log(this.selectedBlock);
    }
    else {
      //second block you are selecting is target block
      this.targetBlock = block;

      //only adjacent blocks can swap
      if (this.board.checkAdjacent(this.selectedBlock, this.targetBlock)) {
        //block the UI
        this.isBoardBlocked = true;

        //swap blocks
        this.swapBlocks(this.selectedBlock, this.targetBlock);
      }
      else {
        this.clearSelection();
      }
    }
  }

  clearSelection() {
    this.isBoardBlocked = false;
    this.selectedBlock.setScale(.85);
    this.selectedBlock = null;
    this.targetBlock = null;
  }

  updateBoard() {
    this.board.clearChains();
    this.board.updateGrid();

    //after the dropping has ended
    this.time.delayedCall(this.ANIMATION_TIME, () => {
      //see if there are new chains
      this.time.delayedCall(this.ANIMATION_TIME, () => {
        var chains = this.board.findAllChains();

        if (chains.length > 0) {
          this.updateBoard();
        }
        else {
          this.clearSelection();
        }
      });
    });

    this.displayInventories();
  }

  // createParticles() {
  //   this.particles = this.add.particles('particleImage'); // 'particleImage' is the key for your particle image

  //   this.emitter = this.particles.createEmitter({
  //     speed: 100,
  //     scale: { start: 1, end: 0 },
  //     blendMode: 'ADD'
  //   });
  // }

  // triggerParticles(x, y) {
  //   this.emitter.setPosition(x, y);
  //   this.emitter.explode(20, x, y); // Explode 20 particles at the given position
  // }

  displayInventories() {
    // Clear previous inventory display
    if (this.inventoryDisplayGroup) {
      this.inventoryDisplayGroup.clear(true, true);
    }

    this.inventoryDisplayGroup = this.add.group();

    let startX = 5; // Starting Y position for the first icon
    let iconSize = 15; // Icon size
    let spacing = 5; // Space between each inventory entry
    let inventoryIndex = 0;

    for (let key in this.playerInventory) {
      let iconX = startX + inventoryIndex * (iconSize + spacing);
      let icon = this.add.image(iconX + 5, 240, key).setDisplaySize(iconSize, iconSize);
      let countText = this.add.text(icon.x, 240 + 20, `${this.playerInventory[key]}`, { font: '14px Arial', fill: '#fff' }).setOrigin(0.5, 0.5);

      // Add the icon and text to the display group
      this.inventoryDisplayGroup.add(icon);
      this.inventoryDisplayGroup.add(countText);

      inventoryIndex++;
    }
  }

}
