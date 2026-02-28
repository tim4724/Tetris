'use strict';

const MINI_PIECES = {
  I: [[0,1],[1,1],[2,1],[3,1]],
  O: [[0,0],[1,0],[0,1],[1,1]],
  T: [[0,1],[1,1],[2,1],[1,0]],
  S: [[1,0],[2,0],[0,1],[1,1]],
  Z: [[0,0],[1,0],[1,1],[2,1]],
  J: [[0,0],[0,1],[1,1],[2,1]],
  L: [[2,0],[0,1],[1,1],[2,1]]
};

// Bounding boxes for centering mini pieces
const MINI_BOUNDS = {};
for (const [type, blocks] of Object.entries(MINI_PIECES)) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const [bx, by] of blocks) {
    minX = Math.min(minX, bx);
    maxX = Math.max(maxX, bx);
    minY = Math.min(minY, by);
    maxY = Math.max(maxY, by);
  }
  MINI_BOUNDS[type] = { minX, maxX, minY, maxY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

// Map piece type string to typeId for color lookup
const PIECE_TYPE_TO_ID = { I: 1, J: 2, L: 3, O: 4, S: 5, T: 6, Z: 7 };

class UIRenderer {
  constructor(ctx, boardX, boardY, cellSize, boardWidthPx, boardHeightPx, playerIndex) {
    this.ctx = ctx;
    this.boardX = boardX;
    this.boardY = boardY;
    this.cellSize = cellSize;
    this.boardWidth = boardWidthPx;
    this.boardHeight = boardHeightPx;
    this.playerIndex = playerIndex;
    this.accentColor = PLAYER_COLORS[playerIndex] || PLAYER_COLORS[0];
    this.panelWidth = cellSize * 4.5;
    this.miniSize = cellSize * 0.6;
    this.panelGap = Math.max(10, cellSize * 0.4);
    this._fontLoaded = document.fonts?.check?.('12px Orbitron') ?? false;
    this._labelFont = this._fontLoaded ? 'Orbitron' : '"Courier New", monospace';
  }

  render(playerState) {
    // Re-check font availability (it may load after first render)
    if (!this._fontLoaded) {
      this._fontLoaded = document.fonts?.check?.('12px Orbitron') ?? false;
      if (this._fontLoaded) this._labelFont = 'Orbitron';
    }

    // 1. Player name + accent stripe above board
    this.drawPlayerName(playerState);

    // 2. Hold piece panel (left of board)
    this.drawHoldPanel(playerState);

    // 3. Next pieces panel (right of board)
    this.drawNextPanel(playerState);

    // 4. Score display below board
    this.drawScorePanel(playerState);

    // 5. Garbage meter (right edge of board)
    if (playerState.pendingGarbage > 0) {
      this.drawGarbageMeter(playerState.pendingGarbage);
    }

    // 6. KO overlay
    if (playerState.alive === false) {
      this.drawKOOverlay();
    }
  }

  drawPlayerName(playerState) {
    const ctx = this.ctx;
    const name = playerState.playerName || PLAYER_NAMES[this.playerIndex] || ('Player ' + (this.playerIndex + 1));
    const nameY = this.boardY - 8;
    const fontSize = Math.max(12, this.cellSize * 0.55);

    // Accent stripe under name area
    const stripeH = 2;
    ctx.fillStyle = this.accentColor;
    ctx.fillRect(this.boardX, nameY + 2, this.boardWidth, stripeH);

    // Subtle glow behind stripe
    const rgb = this._hexToRgb(this.accentColor);
    if (rgb) {
      const glowGrad = ctx.createLinearGradient(this.boardX, nameY - 2, this.boardX, nameY + stripeH + 6);
      glowGrad.addColorStop(0, 'transparent');
      glowGrad.addColorStop(0.5, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`);
      glowGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = glowGrad;
      ctx.fillRect(this.boardX, nameY - 2, this.boardWidth, stripeH + 8);
    }

    // Name text
    ctx.fillStyle = '#ffffff';
    ctx.font = `700 ${fontSize}px ${this._labelFont}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(name, this.boardX + 2, nameY - 2);

    // Level badge on right side
    if (playerState.level) {
      const lvlSize = Math.max(9, this.cellSize * 0.38);
      ctx.font = `700 ${lvlSize}px ${this._labelFont}`;
      ctx.textAlign = 'right';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.fillText(`LV ${playerState.level}`, this.boardX + this.boardWidth - 2, nameY - 2);
    }
  }

  drawHoldPanel(playerState) {
    const ctx = this.ctx;
    const panelX = this.boardX - this.panelWidth - this.panelGap;
    const panelY = this.boardY;
    const labelSize = Math.max(9, this.cellSize * 0.38);
    const boxSize = this.miniSize * 4.5;

    // Label
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = `700 ${labelSize}px ${this._labelFont}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.letterSpacing = '0.15em';
    ctx.fillText('HOLD', panelX + boxSize / 2, panelY);
    ctx.letterSpacing = '0px';

    // Panel background with rounded rect
    const boxY = panelY + labelSize + 6;
    this._drawPanel(panelX, boxY, boxSize, boxSize);

    // Hold piece
    if (playerState.holdPiece) {
      this.drawMiniPiece(
        panelX + boxSize / 2,
        boxY + boxSize / 2,
        playerState.holdPiece,
        this.miniSize
      );
    }
  }

  drawNextPanel(playerState) {
    const ctx = this.ctx;
    const panelX = this.boardX + this.boardWidth + this.panelGap;
    const panelY = this.boardY;
    const labelSize = Math.max(9, this.cellSize * 0.38);
    const boxWidth = this.miniSize * 4.5;
    const pieceSpacing = this.miniSize * 3;
    const startY = panelY + labelSize + 6;

    // Label
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = `700 ${labelSize}px ${this._labelFont}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.letterSpacing = '0.15em';
    ctx.fillText('NEXT', panelX + boxWidth / 2, panelY);
    ctx.letterSpacing = '0px';

    // Panel background
    const nextCount = playerState.nextPieces ? Math.min(playerState.nextPieces.length, 5) : 0;
    const boxHeight = pieceSpacing * Math.max(nextCount, 1) + this.miniSize;
    this._drawPanel(panelX, startY, boxWidth, boxHeight);

    // Next pieces
    if (playerState.nextPieces) {
      for (let i = 0; i < Math.min(playerState.nextPieces.length, 5); i++) {
        const py = startY + i * pieceSpacing + pieceSpacing / 2;
        // First piece slightly larger/brighter
        const scale = i === 0 ? 1.1 : 1.0;
        const alpha = i === 0 ? 1.0 : 0.7 - i * 0.06;
        ctx.globalAlpha = alpha;
        this.drawMiniPiece(
          panelX + boxWidth / 2,
          py,
          playerState.nextPieces[i],
          this.miniSize * scale
        );
        ctx.globalAlpha = 1.0;
      }
    }
  }

  drawScorePanel(playerState) {
    const ctx = this.ctx;
    const panelY = this.boardY + this.boardHeight + 10;
    const scoreSize = Math.max(14, this.cellSize * 0.7);

    // Score — large prominent number
    ctx.font = `700 ${scoreSize}px ${this._labelFont}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    // Score text with subtle glow
    const scoreStr = String(playerState.score || 0).padStart(8, '0');
    const rgb = this._hexToRgb(this.accentColor);
    if (rgb) {
      ctx.shadowColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`;
      ctx.shadowBlur = 8;
    }
    ctx.fillStyle = '#ffffff';
    ctx.fillText(
      scoreStr,
      this.boardX + this.boardWidth / 2,
      panelY
    );
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    // Lines count
    const smallSize = Math.max(9, this.cellSize * 0.38);
    ctx.font = `500 ${smallSize}px ${this._labelFont}`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    const statsY = panelY + scoreSize + Math.max(6, this.cellSize * 0.25);
    ctx.fillText(
      `${playerState.lines || 0} LINES`,
      this.boardX + this.boardWidth / 2,
      statsY
    );
  }

  drawGarbageMeter(pendingGarbage) {
    const ctx = this.ctx;
    const meterWidth = 4;
    const meterX = this.boardX - meterWidth - 3;
    const maxRows = 20;
    const rows = Math.min(pendingGarbage, maxRows);
    const meterHeight = (rows / maxRows) * this.boardHeight;
    const meterY = this.boardY + this.boardHeight - meterHeight;
    const r = 2;

    // Pulsing glow for high garbage
    const pulse = rows > 10 ? 0.6 + 0.3 * Math.sin(performance.now() / 200) : 0.8;

    // Background track
    ctx.fillStyle = 'rgba(255, 68, 68, 0.08)';
    ctx.fillRect(meterX, this.boardY, meterWidth, this.boardHeight);

    // Active meter
    const grad = ctx.createLinearGradient(meterX, meterY, meterX, meterY + meterHeight);
    grad.addColorStop(0, `rgba(255, 100, 68, ${pulse})`);
    grad.addColorStop(1, `rgba(255, 34, 34, ${pulse})`);
    ctx.fillStyle = grad;
    ctx.fillRect(meterX, meterY, meterWidth, meterHeight);

    // Glow
    ctx.shadowColor = 'rgba(255, 68, 68, 0.4)';
    ctx.shadowBlur = 6;
    ctx.fillRect(meterX, meterY, meterWidth, meterHeight);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  }

  drawKOOverlay() {
    const ctx = this.ctx;

    // Darken the board with vignette
    const grad = ctx.createRadialGradient(
      this.boardX + this.boardWidth / 2,
      this.boardY + this.boardHeight / 2,
      0,
      this.boardX + this.boardWidth / 2,
      this.boardY + this.boardHeight / 2,
      this.boardWidth * 0.7
    );
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.5)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0.75)');
    ctx.fillStyle = grad;
    ctx.fillRect(this.boardX, this.boardY, this.boardWidth, this.boardHeight);

    // KO text with glow
    const koSize = Math.max(28, this.cellSize * 2.2);
    ctx.font = `900 ${koSize}px ${this._labelFont}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Red glow
    ctx.shadowColor = 'rgba(255, 50, 50, 0.6)';
    ctx.shadowBlur = 20;
    ctx.fillStyle = '#ff4444';
    ctx.fillText(
      'K.O.',
      this.boardX + this.boardWidth / 2,
      this.boardY + this.boardHeight / 2
    );
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    // Scanlines over the darkened board
    ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
    for (let y = this.boardY; y < this.boardY + this.boardHeight; y += 3) {
      ctx.fillRect(this.boardX, y, this.boardWidth, 1);
    }
  }

  drawMiniPiece(centerX, centerY, pieceType, size) {
    const ctx = this.ctx;
    const blocks = MINI_PIECES[pieceType];
    if (!blocks) return;

    const bounds = MINI_BOUNDS[pieceType];
    const typeId = PIECE_TYPE_TO_ID[pieceType];
    const color = PIECE_COLORS[typeId] || '#ffffff';

    // Center the piece within the given area
    const offsetX = centerX - (bounds.w * size) / 2;
    const offsetY = centerY - (bounds.h * size) / 2;

    for (const [bx, by] of blocks) {
      const dx = offsetX + (bx - bounds.minX) * size;
      const dy = offsetY + (by - bounds.minY) * size;
      const inset = 0.5;
      const r = Math.min(2, size * 0.1);

      // Mini block with gradient
      const grad = ctx.createLinearGradient(dx, dy, dx, dy + size);
      grad.addColorStop(0, color);
      grad.addColorStop(1, this._darkenColor(color, 15));
      ctx.fillStyle = grad;
      this._roundRect(dx + inset, dy + inset, size - inset * 2, size - inset * 2, r);
      ctx.fill();

      // Top highlight
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(dx + inset + r, dy + inset, size - inset * 2 - r * 2, 1);
    }
  }

  _drawPanel(x, y, w, h) {
    const ctx = this.ctx;
    const r = Math.min(6, this.cellSize * 0.2);

    // Glass panel background — brighter than page bg for contrast
    ctx.fillStyle = 'rgba(18, 18, 45, 0.9)';
    this._roundRect(x, y, w, h, r);
    ctx.fill();

    // Visible border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1;
    this._roundRect(x, y, w, h, r);
    ctx.stroke();

    // Top edge highlight
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.stroke();
  }

  _roundRect(x, y, w, h, r) {
    const ctx = this.ctx;
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  _hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  _darkenColor(hex, percent) {
    const rgb = this._hexToRgb(hex);
    if (!rgb) return hex;
    const factor = 1 - percent / 100;
    return `rgb(${Math.round(rgb.r * factor)}, ${Math.round(rgb.g * factor)}, ${Math.round(rgb.b * factor)})`;
  }
}

window.UIRenderer = UIRenderer;
