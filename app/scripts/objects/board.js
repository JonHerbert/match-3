export default class Board {
  /**
   *  My custom object.
   *
   *  @class Board
   *  @constructor
   *  @param {Phaser.Scene} scene - The scene that owns this sprite.
   */
  constructor(scene, rows, cols, blockVariations) {
    this.scene = scene;
    this.rows = rows;
    this.cols = cols;
    this.blockVariations = blockVariations;

    //main grid
    this.grid = [];

    for (let i = 0; i < rows; i++) {
      this.grid.push([]);

      for (let j = 0; j < cols; j++) {
        this.grid[i].push(0);
      }
    }

    //reserve grid on the top, for when new blocks are needed
    this.reserveGrid = [];
    this.RESERVE_ROW = rows;

    for (let i = 0; i < this.RESERVE_ROW; i++) {
      this.reserveGrid.push([]);

      for (let j = 0; j < cols; j++) {
        this.reserveGrid[i].push(0);
      }
    }

    this.populateGrid();
    this.populateReserveGrid();
  }

  populateGrid() {
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        const variation = Phaser.Math.Between(1, this.blockVariations);
        this.grid[i][j] = variation;
      }
    }

    //if there are any chains, re-populate
    var chains = this.findAllChains();
    if (chains.length > 0) {
      this.populateGrid();
    }
  }

  populateReserveGrid() {
    for (let i = 0; i < this.RESERVE_ROW; i++) {
      for (let j = 0; j < this.cols; j++) {
        const variation = Phaser.Math.Between(1, this.blockVariations);
        this.reserveGrid[i][j] = variation;
      }
    }
  }

  dumpBoard() {
    var prettyString = '';

    for (let i = 0; i < this.RESERVE_ROW; i++) {
      prettyString += '\n';
      for (let j = 0; j < this.cols; j++) {
        prettyString += ' ' + this.reserveGrid[i][j];
      }
    }

    prettyString += '\n';

    for (let j = 0; j < this.cols; j++) {
      prettyString += ' -';
    }

    for (let i = 0; i < this.rows; i++) {
      prettyString += '\n';
      for (let j = 0; j < this.cols; j++) {
        prettyString += ' ' + this.grid[i][j];
      }
    }

    return prettyString;
  }

  /*
   * swapping blocks
   */
  swap(source, target) {
    var temp = this.grid[target.row][target.col];
    this.grid[target.row][target.col] = this.grid[source.row][source.col];
    this.grid[source.row][source.col] = temp;

    var tempPos = { row: source.row, col: source.col };
    source.row = target.row;
    source.col = target.col;

    target.row = tempPos.row;
    target.col = tempPos.col;
  }

  /*
   * check if two blocks are adjacent
   */
  checkAdjacent(source, target) {
    var diffRow = Math.abs(source.row - target.row);
    var diffCol = Math.abs(source.col - target.col);
    return (diffRow === 1 && diffCol === 0) || (diffRow === 0 && diffCol === 1);
  }

  /*
   * check whether a single block is chained or not
   */
  isChained(block) {
    var isChained = false;
    var variation = this.grid[block.row][block.col];
    var row = block.row;
    var col = block.col;

    //left
    if (
      variation == this.grid[row][col - 1] &&
      variation == this.grid[row][col - 2]
    ) {
      isChained = true;
    }

    //right
    if (
      variation == this.grid[row][col + 1] &&
      variation == this.grid[row][col + 2]
    ) {
      isChained = true;
    }

    //up
    if (this.grid[row - 2]) {
      if (
        variation == this.grid[row - 1][col] &&
        variation == this.grid[row - 2][col]
      ) {
        isChained = true;
      }
    }

    //down
    if (this.grid[row + 2]) {
      if (
        variation == this.grid[row + 1][col] &&
        variation == this.grid[row + 2][col]
      ) {
        isChained = true;
      }
    }

    // center - horizontal
    if (
      variation == this.grid[row][col - 1] &&
      variation == this.grid[row][col + 1]
    ) {
      isChained = true;
    }

    // center - vertical
    if (this.grid[row + 1] && this.grid[row - 1]) {
      if (
        variation == this.grid[row + 1][col] &&
        variation == this.grid[row - 1][col]
      ) {
        isChained = true;
      }
    }

    return isChained;
  }

  /*
   * find all the chains
   */
  findAllChains() {
    var chained = [];
    var i, j;

    for (i = 0; i < this.rows; i++) {
      for (j = 0; j < this.cols; j++) {
        if (this.isChained({ row: i, col: j })) {
          chained.push({ row: i, col: j });
        }
      }
    }

    return chained;
  }

  /*
   * clear all the chains
   */
  clearChains() {
    var chainedBlocks = this.findAllChains();
    chainedBlocks.forEach(block => {
      let blockObject = this.scene.getBlockFromColRow(block);
      if (this.scene.playerInventory[blockObject.type] !== undefined) {
        this.scene.playerInventory[blockObject.type]++;
      }
      this.grid[block.row][block.col] = 0;
      blockObject.deactivate();
    });
  }

  /*
  drop a block in the main grid from a position to another. the source is set to zero
  */
  dropBlock(sourceRow, targetRow, col) {
    this.grid[targetRow][col] = this.grid[sourceRow][col];
    this.grid[sourceRow][col] = 0;

    this.scene.dropBlock(sourceRow, targetRow, col);
  }

  /*
  drop a block in the reserve grid from a position to another. the source is set to zero
  */
  dropReserveBlock(sourceRow, targetRow, col) {
    this.grid[targetRow][col] = this.reserveGrid[sourceRow][col];
    this.reserveGrid[sourceRow][col] = 0;

    this.scene.dropReserveBlock(sourceRow, targetRow, col);
  }

  /*
   *move down blocks to fill in empty slots
   */
  updateGrid() {
    var foundBlock;

    //go through all the rows, from the bottom up
    for (let i = this.rows - 1; i >= 0; i--) {
      for (let j = 0; j < this.cols; j++) {
        //if the block if zero, then get climb up to get a non-zero one
        if (this.grid[i][j] === 0) {
          foundBlock = false;

          //climb up in the main grid
          for (let k = i - 1; k >= 0; k--) {
            if (this.grid[k][j] > 0) {
              this.dropBlock(k, i, j);
              foundBlock = true;
              break;
            }
          }

          if (!foundBlock) {
            //climb up in the reserve grid
            for (let k = this.RESERVE_ROW - 1; k >= 0; k--) {
              if (this.reserveGrid[k][j] > 0) {
                this.dropReserveBlock(k, i, j);
                break;
              }
            }
          }
        }
      }
    }

    if (!this.checkForPossibleMatches()) {
      console.log('No matches possible');
      this.resetBoard();
    }

    //repopulate the reserve
    this.populateReserveGrid();
  }

  resetBoard() {
    let noMatches;
    do {
      // Shuffle the grid
      this.shuffleGrid();

      // Check if there are any possible matches
      noMatches = !this.checkForPossibleMatches();
    } while (noMatches); // Continue shuffling if no matches are found
  }

  checkForPossibleMatches() {
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        if (this.canBlockMakeMatch({ row, col })) {
          return true; // A match is possible
        }
      }
    }
    return false; // No matches possible
  }

  canBlockMakeMatch(position) {
    // Temporary swap each neighbor and check if it forms a chain
    let directions = [
      { row: -1, col: 0 }, // Up
      { row: 1, col: 0 },  // Down
      { row: 0, col: -1 }, // Left
      { row: 0, col: 1 }   // Right
    ];

    for (let i = 0; i < directions.length; i++) {
      let neighbor = {
        row: position.row + directions[i].row,
        col: position.col + directions[i].col
      };

      if (neighbor.row >= 0 && neighbor.row < this.rows &&
        neighbor.col >= 0 && neighbor.col < this.cols) {
        // Swap blocks
        this.swap(position, neighbor);
        let isMatch = this.isChained(position) || this.isChained(neighbor);
        // Swap back
        this.swap(position, neighbor);

        if (isMatch) {
          return true; // Found a potential match
        }
      }
    }

    return false; // No matches found for this block
  }

  shuffleGrid() {
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        let randomRow = Math.floor(Math.random() * this.rows);
        let randomCol = Math.floor(Math.random() * this.cols);
        // Swap the blocks
        let temp = this.grid[row][col];
        this.grid[row][col] = this.grid[randomRow][randomCol];
        this.grid[randomRow][randomCol] = temp;
      }
    }
  }
}
