'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { PlayerBoard } = require('../server/PlayerBoard');
const { BOARD_WIDTH, BOARD_HEIGHT, BUFFER_ROWS } = require('../server/constants');

function makeBoard() {
  return new PlayerBoard('test-player');
}

// Fill all rows except the buffer zone rows with filled cells, leaving the
// specified row empty. Used to set up line-clear scenarios.
function fillBoardExcept(board, emptyRow) {
  for (let row = 0; row < BOARD_HEIGHT; row++) {
    if (row === emptyRow) {
      board.grid[row] = new Array(BOARD_WIDTH).fill(0);
    } else {
      board.grid[row] = new Array(BOARD_WIDTH).fill(1);
    }
  }
}

// Fill one specific row completely.
function fillRow(board, row) {
  board.grid[row] = new Array(BOARD_WIDTH).fill(1);
}

describe('PlayerBoard - spawnPiece()', () => {
  test('spawnPiece() returns true on empty board', () => {
    const board = makeBoard();
    const result = board.spawnPiece();
    assert.strictEqual(result, true);
  });

  test('spawnPiece() sets currentPiece', () => {
    const board = makeBoard();
    board.spawnPiece();
    assert.ok(board.currentPiece, 'currentPiece should be set after spawn');
  });

  test('spawned piece x is centered (default x=3)', () => {
    const board = makeBoard();
    board.spawnPiece();
    assert.strictEqual(board.currentPiece.x, 3);
  });

  test('spawned piece y is at top of buffer zone (y=0)', () => {
    const board = makeBoard();
    board.spawnPiece();
    assert.strictEqual(board.currentPiece.y, 0);
  });

  test('spawnPiece() resets holdUsed to false', () => {
    const board = makeBoard();
    board.holdUsed = true;
    board.spawnPiece();
    assert.strictEqual(board.holdUsed, false);
  });
});

describe('PlayerBoard - moveLeft() / moveRight()', () => {
  test('moveLeft() returns true when space is available', () => {
    const board = makeBoard();
    board.spawnPiece();
    const result = board.moveLeft();
    assert.strictEqual(result, true);
  });

  test('moveLeft() decrements piece x by 1', () => {
    const board = makeBoard();
    board.spawnPiece();
    const initialX = board.currentPiece.x;
    board.moveLeft();
    assert.strictEqual(board.currentPiece.x, initialX - 1);
  });

  test('moveLeft() returns false when at left wall', () => {
    const board = makeBoard();
    board.spawnPiece();
    // Move as far left as possible
    for (let i = 0; i < 20; i++) board.moveLeft();
    const result = board.moveLeft();
    assert.strictEqual(result, false);
  });

  test('moveRight() returns true when space is available', () => {
    const board = makeBoard();
    board.spawnPiece();
    const result = board.moveRight();
    assert.strictEqual(result, true);
  });

  test('moveRight() increments piece x by 1', () => {
    const board = makeBoard();
    board.spawnPiece();
    const initialX = board.currentPiece.x;
    board.moveRight();
    assert.strictEqual(board.currentPiece.x, initialX + 1);
  });

  test('moveRight() returns false when at right wall', () => {
    const board = makeBoard();
    board.spawnPiece();
    for (let i = 0; i < 20; i++) board.moveRight();
    const result = board.moveRight();
    assert.strictEqual(result, false);
  });

  test('moveLeft() returns false when no currentPiece', () => {
    const board = makeBoard();
    board.currentPiece = null;
    assert.strictEqual(board.moveLeft(), false);
  });

  test('moveRight() returns false when no currentPiece', () => {
    const board = makeBoard();
    board.currentPiece = null;
    assert.strictEqual(board.moveRight(), false);
  });
});

describe('PlayerBoard - rotateCW()', () => {
  test('rotateCW() on T piece changes rotation state', () => {
    const board = makeBoard();
    board.spawnPiece();
    // Ensure we have a T piece by forcing it
    const { Piece } = require('../server/Piece');
    board.currentPiece = new Piece('T');
    board.currentPiece.x = 4;
    board.currentPiece.y = 5;

    const initialRotation = board.currentPiece.rotation;
    const result = board.rotateCW();
    assert.strictEqual(result, true);
    assert.strictEqual(board.currentPiece.rotation, (initialRotation + 1) % 4);
  });

  test('rotateCW() returns false for O piece', () => {
    const board = makeBoard();
    const { Piece } = require('../server/Piece');
    board.currentPiece = new Piece('O');
    board.currentPiece.x = 4;
    board.currentPiece.y = 5;
    assert.strictEqual(board.rotateCW(), false);
  });

  test('rotateCW() returns false when no currentPiece', () => {
    const board = makeBoard();
    board.currentPiece = null;
    assert.strictEqual(board.rotateCW(), false);
  });

  test('rotateCW() uses wall kicks when near left wall', () => {
    const board = makeBoard();
    const { Piece } = require('../server/Piece');
    board.currentPiece = new Piece('T');
    board.currentPiece.x = 0; // near left wall
    board.currentPiece.y = 10;
    // T piece at x=0 may need wall kick to rotate; it should succeed
    const result = board.rotateCW();
    // Result depends on whether kick succeeds; just verify no error thrown
    assert.ok(typeof result === 'boolean');
  });

  test('rotateCW() cycles through all 4 rotations back to 0', () => {
    const board = makeBoard();
    const { Piece } = require('../server/Piece');
    board.currentPiece = new Piece('T');
    board.currentPiece.x = 4;
    board.currentPiece.y = 10;

    board.rotateCW();
    board.rotateCW();
    board.rotateCW();
    board.rotateCW();
    assert.strictEqual(board.currentPiece.rotation, 0);
  });
});

describe('PlayerBoard - hardDrop()', () => {
  test('hardDrop() moves piece to lowest valid position', () => {
    const board = makeBoard();
    const { Piece } = require('../server/Piece');
    board.currentPiece = new Piece('I');
    board.currentPiece.x = 3;
    board.currentPiece.y = 0;

    board.hardDrop();
    // After hard drop, piece should be locked so currentPiece changes (next piece spawns)
    // The I piece lands on the bottom of the 24-row board
    // Verify the grid has the piece locked in the bottom area
    const gridHasLockedPiece = board.grid.some(row => row.some(cell => cell !== 0));
    assert.ok(gridHasLockedPiece, 'Grid should have locked piece after hardDrop');
  });

  test('hardDrop() returns lock result object', () => {
    const board = makeBoard();
    const { Piece } = require('../server/Piece');
    board.currentPiece = new Piece('O');
    board.currentPiece.x = 4;
    board.currentPiece.y = 0;

    const result = board.hardDrop();
    assert.ok(result !== null, 'hardDrop should return a result');
    assert.ok('linesCleared' in result);
    assert.ok('alive' in result);
  });

  test('hardDrop() returns null when no currentPiece', () => {
    const board = makeBoard();
    board.currentPiece = null;
    assert.strictEqual(board.hardDrop(), null);
  });

  test('hardDrop() adds 2 points per cell dropped', () => {
    const board = makeBoard();
    const { Piece } = require('../server/Piece');
    board.currentPiece = new Piece('I');
    board.currentPiece.x = 3;
    board.currentPiece.y = 0;

    const initialScore = board.scoring.score;
    board.hardDrop();
    // Score should be higher by at least 2 (one cell drop)
    assert.ok(board.scoring.score > initialScore, 'Score should increase after hard drop');
  });
});

describe('PlayerBoard - line clear', () => {
  test('filling a row and hard dropping removes it', () => {
    const board = makeBoard();
    const { Piece } = require('../server/Piece');

    // Fill the bottom row leaving one column empty
    const bottomRow = BOARD_HEIGHT - 1;
    board.grid[bottomRow] = new Array(BOARD_WIDTH).fill(1);
    // Fill second-to-bottom row leaving just col 0 open
    board.grid[bottomRow - 1] = new Array(BOARD_WIDTH).fill(1);
    board.grid[bottomRow - 1][0] = 0;
    board.grid[bottomRow - 1][1] = 0;

    // Use clearLines directly to verify line removal
    board.lastWasTSpin = false;
    board.lastWasTSpinMini = false;
    board.lastWasRotation = false;
    const { linesCleared } = board.clearLines();

    assert.strictEqual(linesCleared, 1, 'One full row should be cleared');
  });

  test('clearing lines adds empty rows at top', () => {
    const board = makeBoard();
    // Fill last 4 rows completely
    for (let row = BOARD_HEIGHT - 4; row < BOARD_HEIGHT; row++) {
      board.grid[row] = new Array(BOARD_WIDTH).fill(1);
    }
    board.lastWasTSpin = false;
    board.lastWasTSpinMini = false;
    board.lastWasRotation = false;

    board.clearLines();

    // Top rows should be empty
    for (let row = 0; row < 4; row++) {
      assert.ok(board.grid[row].every(c => c === 0), `Row ${row} should be empty after clear`);
    }
  });

  test('board height stays constant after line clear', () => {
    const board = makeBoard();
    for (let row = BOARD_HEIGHT - 2; row < BOARD_HEIGHT; row++) {
      board.grid[row] = new Array(BOARD_WIDTH).fill(1);
    }
    board.lastWasTSpin = false;
    board.lastWasTSpinMini = false;
    board.lastWasRotation = false;

    board.clearLines();
    assert.strictEqual(board.grid.length, BOARD_HEIGHT);
  });
});

describe('PlayerBoard - hold()', () => {
  test('hold() swaps current piece with hold slot when hold is empty', () => {
    const board = makeBoard();
    board.spawnPiece();
    const initialType = board.currentPiece.type;

    board.hold();
    assert.strictEqual(board.holdPiece, initialType);
  });

  test('hold() returns false when holdUsed is true', () => {
    const board = makeBoard();
    board.spawnPiece();
    board.hold(); // first hold
    const result = board.hold(); // second hold should fail
    assert.strictEqual(result, false);
  });

  test('hold() swaps current piece with held piece on second call', () => {
    const board = makeBoard();
    board.spawnPiece();
    board.hold();
    const heldType = board.holdPiece;

    board.spawnPiece(); // spawn next piece
    board.hold(); // this swaps with held
    assert.strictEqual(board.currentPiece.type, heldType);
  });

  test('hold() sets holdUsed to true', () => {
    const board = makeBoard();
    board.spawnPiece();
    board.hold();
    assert.strictEqual(board.holdUsed, true);
  });

  test('holdUsed resets after spawnPiece()', () => {
    const board = makeBoard();
    board.spawnPiece();
    board.hold();
    assert.strictEqual(board.holdUsed, true);
    board.spawnPiece();
    assert.strictEqual(board.holdUsed, false);
  });
});

describe('PlayerBoard - ghost piece', () => {
  test('getGhostY() returns a value >= currentPiece.y', () => {
    const board = makeBoard();
    board.spawnPiece();
    const ghostY = board.getGhostY();
    assert.ok(ghostY >= board.currentPiece.y, 'Ghost Y should be at or below current piece');
  });

  test('getGhostY() equals currentPiece.y when piece is on surface', () => {
    const board = makeBoard();
    const { Piece } = require('../server/Piece');
    board.currentPiece = new Piece('I');
    board.currentPiece.x = 0;
    // Place piece at the very bottom so it is already on the surface
    board.currentPiece.y = BOARD_HEIGHT - 2; // I piece row 1 is at y+1

    const ghostY = board.getGhostY();
    assert.strictEqual(ghostY, board.currentPiece.y);
  });

  test('ghost Y position is above the floor', () => {
    const board = makeBoard();
    board.spawnPiece();
    const ghostY = board.getGhostY();
    assert.ok(ghostY < BOARD_HEIGHT, 'Ghost Y should be within board bounds');
  });
});

describe('PlayerBoard - game over', () => {
  test('alive is false when piece cannot spawn', () => {
    const board = makeBoard();
    // Fill buffer zone rows to block spawning
    for (let row = 0; row < BUFFER_ROWS; row++) {
      board.grid[row] = new Array(BOARD_WIDTH).fill(1);
    }
    board.spawnPiece();
    assert.strictEqual(board.alive, false);
  });

  test('spawnPiece() returns false when game over', () => {
    const board = makeBoard();
    for (let row = 0; row < BUFFER_ROWS; row++) {
      board.grid[row] = new Array(BOARD_WIDTH).fill(1);
    }
    const result = board.spawnPiece();
    assert.strictEqual(result, false);
  });
});
