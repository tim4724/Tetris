'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { GarbageManager } = require('../server/GarbageManager');

function makeManager(...playerIds) {
  const mgr = new GarbageManager();
  for (const id of playerIds) mgr.addPlayer(id);
  return mgr;
}

describe('GarbageManager - garbage lines sent per clear type', () => {
  test('single clear sends 0 garbage lines', () => {
    const mgr = makeManager('p1', 'p2');
    const { sent } = mgr.processLineClear('p1', 1, false, -1, false);
    assert.strictEqual(sent, 0);
  });

  test('double clear sends 1 garbage line', () => {
    const mgr = makeManager('p1', 'p2');
    const { sent } = mgr.processLineClear('p1', 2, false, -1, false);
    assert.strictEqual(sent, 1);
  });

  test('triple clear sends 2 garbage lines', () => {
    const mgr = makeManager('p1', 'p2');
    const { sent } = mgr.processLineClear('p1', 3, false, -1, false);
    assert.strictEqual(sent, 2);
  });

  test('tetris sends 4 garbage lines', () => {
    const mgr = makeManager('p1', 'p2');
    const { sent } = mgr.processLineClear('p1', 4, false, -1, false);
    assert.strictEqual(sent, 4);
  });
});

describe('GarbageManager - T-spin garbage multiplier', () => {
  test('T-spin doubles the garbage for double (1→2)', () => {
    const mgr = makeManager('p1', 'p2');
    const { sent } = mgr.processLineClear('p1', 2, true, -1, false);
    // GARBAGE_TABLE[2]=1, * TSPIN_GARBAGE_MULTIPLIER(2) = 2
    assert.strictEqual(sent, 2);
  });

  test('T-spin triple sends double the normal triple garbage (2→4)', () => {
    const mgr = makeManager('p1', 'p2');
    const { sent } = mgr.processLineClear('p1', 3, true, -1, false);
    // GARBAGE_TABLE[3]=2, * TSPIN_GARBAGE_MULTIPLIER(2) = 4
    assert.strictEqual(sent, 4);
  });

  test('T-spin single (1→0 × 2 = 0 garbage)', () => {
    // GARBAGE_TABLE[1] = 0, * 2 = 0 still
    const mgr = makeManager('p1', 'p2');
    const { sent } = mgr.processLineClear('p1', 1, true, -1, false);
    assert.strictEqual(sent, 0);
  });

  test('T-spin tetris (4→8 garbage)', () => {
    const mgr = makeManager('p1', 'p2');
    const { sent } = mgr.processLineClear('p1', 4, true, -1, false);
    assert.strictEqual(sent, 8); // 4 * 2 = 8
  });
});

describe('GarbageManager - cancellation of incoming garbage', () => {
  test('incoming garbage is cancelled before sending remainder', () => {
    const mgr = makeManager('p1', 'p2');
    // Queue 4 incoming garbage lines for p1 (simulating p2 sent a tetris)
    mgr.queues.get('p1').push({ lines: 4, gapColumn: 0 });

    // p1 clears a tetris (4 garbage to send)
    const { sent, cancelled } = mgr.processLineClear('p1', 4, false, -1, false);
    assert.strictEqual(cancelled, 4, 'All 4 incoming garbage should be cancelled');
    assert.strictEqual(sent, 0, 'No garbage should be sent after full cancellation');
  });

  test('partial cancellation: remaining garbage is sent to opponents', () => {
    const mgr = makeManager('p1', 'p2');
    // Queue 2 incoming garbage lines for p1
    mgr.queues.get('p1').push({ lines: 2, gapColumn: 0 });

    // p1 clears a tetris (4 garbage): cancels 2, sends 2
    const { sent, cancelled } = mgr.processLineClear('p1', 4, false, -1, false);
    assert.strictEqual(cancelled, 2, '2 lines of incoming should be cancelled');
    assert.strictEqual(sent, 2, '2 lines should be sent to opponents');
  });

  test('excess incoming garbage remains in queue after partial cancel', () => {
    const mgr = makeManager('p1', 'p2');
    // 6 incoming garbage, p1 sends a double (1 garbage)
    mgr.queues.get('p1').push({ lines: 6, gapColumn: 3 });

    const { cancelled } = mgr.processLineClear('p1', 2, false, -1, false);
    assert.strictEqual(cancelled, 1, '1 line cancelled');

    const remaining = mgr.queues.get('p1');
    assert.strictEqual(remaining.length, 1, 'Remaining garbage entry should still exist');
    assert.strictEqual(remaining[0].lines, 5, '5 lines should remain in queue');
  });
});

describe('GarbageManager - garbage distribution', () => {
  test('garbage distributes to opponents, not sender', () => {
    const mgr = makeManager('p1', 'p2', 'p3');
    mgr.processLineClear('p1', 4, false, -1, false);

    const p2Queue = mgr.queues.get('p2');
    const p3Queue = mgr.queues.get('p3');
    const p1Queue = mgr.queues.get('p1');

    assert.strictEqual(p2Queue.length, 1, 'p2 should receive garbage');
    assert.strictEqual(p3Queue.length, 1, 'p3 should receive garbage');
    assert.strictEqual(p1Queue.length, 0, 'p1 (sender) should not receive own garbage');
  });

  test('single clear sends no garbage to anyone', () => {
    const mgr = makeManager('p1', 'p2');
    mgr.processLineClear('p1', 1, false, -1, false);

    const p2Queue = mgr.queues.get('p2');
    assert.strictEqual(p2Queue.length, 0, 'p2 should not receive garbage from single clear');
  });

  test('0 lines cleared sends 0 garbage', () => {
    const mgr = makeManager('p1', 'p2');
    const { sent, cancelled } = mgr.processLineClear('p1', 0, false, -1, false);
    assert.strictEqual(sent, 0);
    assert.strictEqual(cancelled, 0);
  });
});

describe('GarbageManager - getIncomingGarbage', () => {
  test('getIncomingGarbage returns queued garbage and clears the queue', () => {
    const mgr = makeManager('p1', 'p2');
    mgr.processLineClear('p1', 4, false, -1, false); // sends 4 to p2

    const incoming = mgr.getIncomingGarbage('p2');
    assert.strictEqual(incoming.length, 1);
    assert.strictEqual(incoming[0].lines, 4);

    // Queue should now be empty
    const again = mgr.getIncomingGarbage('p2');
    assert.strictEqual(again.length, 0);
  });

  test('getIncomingGarbage returns empty array when no garbage queued', () => {
    const mgr = makeManager('p1');
    const incoming = mgr.getIncomingGarbage('p1');
    assert.deepStrictEqual(incoming, []);
  });
});

describe('GarbageManager - player management', () => {
  test('addPlayer creates an empty queue for the player', () => {
    const mgr = new GarbageManager();
    mgr.addPlayer('player1');
    assert.ok(mgr.queues.has('player1'));
    assert.deepStrictEqual(mgr.queues.get('player1'), []);
  });

  test('removePlayer deletes the player queue', () => {
    const mgr = makeManager('p1');
    mgr.removePlayer('p1');
    assert.strictEqual(mgr.queues.has('p1'), false);
  });
});
