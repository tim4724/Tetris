'use strict';

class Animations {
  constructor(ctx) {
    this.ctx = ctx;
    this.active = [];
  }

  addLineClear(boardX, boardY, cellSize, rows, isTetris, isTSpin) {
    const duration = 300;
    this.active.push({
      type: 'lineClear',
      startTime: performance.now(),
      duration,
      boardX,
      boardY,
      cellSize,
      rows,
      isTetris,
      isTSpin,
      render(ctx, progress) {
        const alpha = 1 - progress;
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.8})`;
        for (const row of this.rows) {
          ctx.fillRect(
            this.boardX,
            this.boardY + row * this.cellSize,
            10 * this.cellSize,
            this.cellSize
          );
        }
      }
    });

    // Text popup for special clears
    if (isTetris) {
      const cx = boardX + 5 * cellSize;
      const cy = boardY + rows[0] * cellSize;
      this.addTextPopup(cx, cy, 'TETRIS!', '#00ffff');
    }
    if (isTSpin) {
      const cx = boardX + 5 * cellSize;
      const cy = boardY + rows[0] * cellSize - cellSize;
      this.addTextPopup(cx, cy, 'T-SPIN!', '#a000f0');
    }
  }

  addGarbageShake(boardX, boardY) {
    const duration = 200;
    this.active.push({
      type: 'shake',
      startTime: performance.now(),
      duration,
      boardX,
      boardY,
      offsetX: 0,
      offsetY: 0,
      update(progress) {
        const intensity = (1 - progress) * 4;
        this.offsetX = (Math.random() - 0.5) * intensity;
        this.offsetY = (Math.random() - 0.5) * intensity;
      },
      render() {
        // Shake is applied via canvas transform in the main render loop
      }
    });
  }

  addTextPopup(x, y, text, color) {
    const duration = 1000;
    this.active.push({
      type: 'textPopup',
      startTime: performance.now(),
      duration,
      x,
      y,
      text,
      color,
      render(ctx, progress) {
        const alpha = 1 - progress;
        const drift = progress * 40;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.font = 'bold 20px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.text, this.x, this.y - drift);
        ctx.restore();
      }
    });
  }

  addKO(boardX, boardY, boardWidth, boardHeight) {
    const duration = 1500;
    this.active.push({
      type: 'ko',
      startTime: performance.now(),
      duration,
      boardX,
      boardY,
      boardWidth,
      boardHeight,
      render(ctx, progress) {
        // Flash effect at the start
        if (progress < 0.2) {
          const flashAlpha = (1 - progress / 0.2) * 0.6;
          ctx.fillStyle = `rgba(255, 0, 0, ${flashAlpha})`;
          ctx.fillRect(this.boardX, this.boardY, this.boardWidth, this.boardHeight);
        }
      }
    });
  }

  addCombo(x, y, combo) {
    if (combo >= 2) {
      this.addTextPopup(x, y, `${combo} COMBO!`, '#ffe66d');
    }
  }

  addBackToBack(x, y) {
    this.addTextPopup(x, y, 'B2B!', '#ff6b6b');
  }

  update(deltaMs) {
    const now = performance.now();
    this.active = this.active.filter(anim => {
      const elapsed = now - anim.startTime;
      const progress = Math.min(elapsed / anim.duration, 1);
      if (anim.update) {
        anim.update(progress);
      }
      return progress < 1;
    });
  }

  render() {
    const ctx = this.ctx;
    const now = performance.now();

    for (const anim of this.active) {
      const elapsed = now - anim.startTime;
      const progress = Math.min(elapsed / anim.duration, 1);
      if (anim.render) {
        anim.render(ctx, progress);
      }
    }
  }

  getShakeOffset() {
    for (const anim of this.active) {
      if (anim.type === 'shake') {
        return { x: anim.offsetX || 0, y: anim.offsetY || 0 };
      }
    }
    return { x: 0, y: 0 };
  }

  getShakeOffsetForBoard(boardX, boardY) {
    for (const anim of this.active) {
      if (anim.type === 'shake' && anim.boardX === boardX && anim.boardY === boardY) {
        return { x: anim.offsetX || 0, y: anim.offsetY || 0 };
      }
    }
    return { x: 0, y: 0 };
  }
}

window.Animations = Animations;
