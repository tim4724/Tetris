'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { PIECES, WALL_KICKS, I_WALL_KICKS, Piece } = require('../server/Piece');

const PIECE_TYPES = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];

describe('Piece - rotation states', () => {
  test('all 7 piece types are defined', () => {
    for (const type of PIECE_TYPES) {
      assert.ok(PIECES[type], `PIECES should contain type ${type}`);
    }
  });

  test('each piece has exactly 4 rotation states', () => {
    for (const type of PIECE_TYPES) {
      assert.strictEqual(PIECES[type].length, 4, `${type} should have 4 rotation states`);
    }
  });

  test('each rotation state has exactly 4 blocks', () => {
    for (const type of PIECE_TYPES) {
      for (let r = 0; r < 4; r++) {
        assert.strictEqual(
          PIECES[type][r].length, 4,
          `${type} rotation ${r} should have 4 blocks`
        );
      }
    }
  });

  test('O piece all rotation states are equivalent', () => {
    const base = JSON.stringify(PIECES['O'][0]);
    for (let r = 1; r < 4; r++) {
      assert.strictEqual(
        JSON.stringify(PIECES['O'][r]),
        base,
        `O piece rotation ${r} should equal rotation 0`
      );
    }
  });
});

describe('Piece - wall kick tables', () => {
  const standardTransitions = ['0>1', '1>0', '1>2', '2>1', '2>3', '3>2', '3>0', '0>3'];

  test('standard wall kick table has all 8 rotation transitions', () => {
    for (const key of standardTransitions) {
      assert.ok(WALL_KICKS[key], `WALL_KICKS should have entry for ${key}`);
    }
  });

  test('I piece wall kick table has all 8 rotation transitions', () => {
    for (const key of standardTransitions) {
      assert.ok(I_WALL_KICKS[key], `I_WALL_KICKS should have entry for ${key}`);
    }
  });

  test('each standard wall kick entry has 5 offsets', () => {
    for (const key of standardTransitions) {
      assert.strictEqual(
        WALL_KICKS[key].length, 5,
        `WALL_KICKS[${key}] should have 5 offsets`
      );
    }
  });

  test('each I piece wall kick entry has 5 offsets', () => {
    for (const key of standardTransitions) {
      assert.strictEqual(
        I_WALL_KICKS[key].length, 5,
        `I_WALL_KICKS[${key}] should have 5 offsets`
      );
    }
  });

  test('Piece.getWallKicks returns I_WALL_KICKS for I piece', () => {
    const piece = new Piece('I');
    const kicks = piece.getWallKicks(0, 1);
    assert.deepStrictEqual(kicks, I_WALL_KICKS['0>1']);
  });

  test('Piece.getWallKicks returns WALL_KICKS for non-I pieces', () => {
    for (const type of ['J', 'L', 'S', 'T', 'Z']) {
      const piece = new Piece(type);
      const kicks = piece.getWallKicks(0, 1);
      assert.deepStrictEqual(kicks, WALL_KICKS['0>1'], `${type} should use standard wall kicks`);
    }
  });
});

describe('Piece - clone()', () => {
  test('clone() creates an object with the same properties', () => {
    const original = new Piece('T');
    original.rotation = 2;
    original.x = 5;
    original.y = 7;
    const cloned = original.clone();

    assert.strictEqual(cloned.type, original.type);
    assert.strictEqual(cloned.rotation, original.rotation);
    assert.strictEqual(cloned.x, original.x);
    assert.strictEqual(cloned.y, original.y);
    assert.strictEqual(cloned.typeId, original.typeId);
  });

  test('clone() is an independent copy (mutating clone does not affect original)', () => {
    const original = new Piece('S');
    original.x = 3;
    original.y = 0;
    const cloned = original.clone();

    cloned.x = 9;
    cloned.y = 10;
    cloned.rotation = 3;

    assert.strictEqual(original.x, 3);
    assert.strictEqual(original.y, 0);
    assert.strictEqual(original.rotation, 0);
  });
});

describe('Piece - getAbsoluteBlocks()', () => {
  test('returns blocks offset by piece x,y position', () => {
    const piece = new Piece('O');
    piece.x = 2;
    piece.y = 3;

    const relativeBlocks = piece.getBlocks();
    const absoluteBlocks = piece.getAbsoluteBlocks();

    assert.strictEqual(absoluteBlocks.length, 4);
    for (let i = 0; i < 4; i++) {
      const [relCol, relRow] = relativeBlocks[i];
      const [absCol, absRow] = absoluteBlocks[i];
      assert.strictEqual(absCol, relCol + piece.x, `block ${i} col should be offset by x`);
      assert.strictEqual(absRow, relRow + piece.y, `block ${i} row should be offset by y`);
    }
  });

  test('returns different absolute positions for different x,y', () => {
    const a = new Piece('T');
    a.x = 0;
    a.y = 0;
    const b = new Piece('T');
    b.x = 5;
    b.y = 10;

    const blocksA = a.getAbsoluteBlocks();
    const blocksB = b.getAbsoluteBlocks();

    for (let i = 0; i < 4; i++) {
      assert.strictEqual(blocksB[i][0], blocksA[i][0] + 5);
      assert.strictEqual(blocksB[i][1], blocksA[i][1] + 10);
    }
  });
});
