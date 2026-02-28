'use strict';

const { GARBAGE_TABLE, TSPIN_GARBAGE_MULTIPLIER, COMBO_GARBAGE } = require('./constants');

class GarbageManager {
  constructor() {
    this.queues = new Map(); // playerId -> array of { lines, gapColumn, senderId }
  }

  addPlayer(playerId) {
    this.queues.set(playerId, []);
  }

  removePlayer(playerId) {
    this.queues.delete(playerId);
  }

  processLineClear(senderId, linesCleared, isTSpin, combo, backToBack) {
    if (linesCleared === 0) return { sent: 0, cancelled: 0, deliveries: [] };

    // Calculate garbage lines to send
    let garbageLines = GARBAGE_TABLE[linesCleared] || 0;

    // T-spin doubles garbage
    if (isTSpin) {
      garbageLines *= TSPIN_GARBAGE_MULTIPLIER;
    }

    // Combo bonus
    if (combo >= 0) {
      const comboIndex = Math.min(combo, COMBO_GARBAGE.length - 1);
      garbageLines += COMBO_GARBAGE[comboIndex];
    }

    // Back-to-back bonus for tetris or t-spin
    if (backToBack && (linesCleared === 4 || isTSpin)) {
      garbageLines += 1;
    }

    if (garbageLines <= 0) return { sent: 0, cancelled: 0, deliveries: [] };

    // Cancel sender's incoming garbage first
    const senderQueue = this.queues.get(senderId) || [];
    let remaining = garbageLines;
    let cancelled = 0;

    while (remaining > 0 && senderQueue.length > 0) {
      const front = senderQueue[0];
      if (front.lines <= remaining) {
        remaining -= front.lines;
        cancelled += front.lines;
        senderQueue.shift();
      } else {
        front.lines -= remaining;
        cancelled += remaining;
        remaining = 0;
      }
    }

    // Distribute remainder to opponents
    let sent = 0;
    const deliveries = [];
    if (remaining > 0) {
      const gapColumn = this.generateGapColumn();
      for (const [playerId, queue] of this.queues) {
        if (playerId !== senderId) {
          queue.push({ lines: remaining, gapColumn, senderId });
          deliveries.push({ fromId: senderId, toId: playerId, lines: remaining, gapColumn });
          sent = remaining;
        }
      }
    }

    return { sent, cancelled, deliveries };
  }

  getIncomingGarbage(playerId) {
    const queue = this.queues.get(playerId);
    if (!queue || queue.length === 0) return [];
    const garbage = queue.splice(0);
    return garbage;
  }

  generateGapColumn() {
    return Math.floor(Math.random() * 10);
  }
}

module.exports = { GarbageManager };
