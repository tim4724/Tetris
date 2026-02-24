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
  }

  render(playerState) {
    const ctx = this.ctx;

    // 1. Player name + color indicator above board
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
    const nameY = this.boardY - 12;

    // Color dot
    ctx.fillStyle = this.accentColor;
    ctx.beginPath();
    ctx.arc(this.boardX + 8, nameY - 4, 5, 0, Math.PI * 2);
    ctx.fill();

    // Name text
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.max(12, this.cellSize * 0.55)}px 'Courier New', monospace`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(name, this.boardX + 20, this.boardY - 4);
  }

  drawHoldPanel(playerState) {
    const ctx = this.ctx;
    const panelX = this.boardX - this.panelWidth - 8;
    const panelY = this.boardY;
    const labelSize = Math.max(10, this.cellSize * 0.45);

    // Label
    ctx.fillStyle = '#8888aa';
    ctx.font = `${labelSize}px 'Courier New', monospace`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('HOLD', panelX, panelY);

    // Panel background
    const boxY = panelY + labelSize + 4;
    const boxSize = this.miniSize * 4.5;
    ctx.fillStyle = 'rgba(15, 15, 35, 0.8)';
    ctx.fillRect(panelX, boxY, boxSize, boxSize);
    ctx.strokeStyle = BORDER_COLOR;
    ctx.lineWidth = 1;
    ctx.strokeRect(panelX, boxY, boxSize, boxSize);

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
    const panelX = this.boardX + this.boardWidth + 8;
    const panelY = this.boardY;
    const labelSize = Math.max(10, this.cellSize * 0.45);

    // Label
    ctx.fillStyle = '#8888aa';
    ctx.font = `${labelSize}px 'Courier New', monospace`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('NEXT', panelX, panelY);

    const boxWidth = this.miniSize * 4.5;
    const pieceSpacing = this.miniSize * 3;
    const startY = panelY + labelSize + 4;

    // Panel background
    const nextCount = playerState.nextPieces ? Math.min(playerState.nextPieces.length, 5) : 0;
    const boxHeight = pieceSpacing * Math.max(nextCount, 1) + this.miniSize;
    ctx.fillStyle = 'rgba(15, 15, 35, 0.8)';
    ctx.fillRect(panelX, startY, boxWidth, boxHeight);
    ctx.strokeStyle = BORDER_COLOR;
    ctx.lineWidth = 1;
    ctx.strokeRect(panelX, startY, boxWidth, boxHeight);

    // Next pieces
    if (playerState.nextPieces) {
      for (let i = 0; i < Math.min(playerState.nextPieces.length, 5); i++) {
        const py = startY + i * pieceSpacing + pieceSpacing / 2;
        this.drawMiniPiece(
          panelX + boxWidth / 2,
          py,
          playerState.nextPieces[i],
          this.miniSize
        );
      }
    }
  }

  drawScorePanel(playerState) {
    const ctx = this.ctx;
    const panelY = this.boardY + this.boardHeight + 8;
    const fontSize = Math.max(11, this.cellSize * 0.5);

    ctx.font = `bold ${fontSize}px 'Courier New', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    // Score
    ctx.fillStyle = '#ffffff';
    ctx.fillText(
      String(playerState.score || 0).padStart(8, '0'),
      this.boardX + this.boardWidth / 2,
      panelY
    );

    // Level + Lines
    const smallSize = Math.max(9, this.cellSize * 0.4);
    ctx.font = `${smallSize}px 'Courier New', monospace`;
    ctx.fillStyle = '#8888aa';
    const statsY = panelY + fontSize + 4;
    ctx.fillText(
      `LV ${playerState.level || 1}  LN ${playerState.lines || 0}`,
      this.boardX + this.boardWidth / 2,
      statsY
    );
  }

  drawGarbageMeter(pendingGarbage) {
    const ctx = this.ctx;
    const meterWidth = 4;
    const meterX = this.boardX + this.boardWidth - meterWidth - 1;
    const maxRows = 20;
    const rows = Math.min(pendingGarbage, maxRows);
    const meterHeight = (rows / maxRows) * this.boardHeight;
    const meterY = this.boardY + this.boardHeight - meterHeight;

    ctx.fillStyle = '#ff4444';
    ctx.globalAlpha = 0.8;
    ctx.fillRect(meterX, meterY, meterWidth, meterHeight);
    ctx.globalAlpha = 1.0;
  }

  drawKOOverlay() {
    const ctx = this.ctx;

    // Darken the board
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(this.boardX, this.boardY, this.boardWidth, this.boardHeight);

    // KO text
    const koSize = Math.max(24, this.cellSize * 2);
    ctx.font = `bold ${koSize}px 'Courier New', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ff4444';
    ctx.fillText(
      'K.O.',
      this.boardX + this.boardWidth / 2,
      this.boardY + this.boardHeight / 2
    );
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

      ctx.fillStyle = color;
      ctx.fillRect(dx + inset, dy + inset, size - inset * 2, size - inset * 2);

      // Subtle highlight
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fillRect(dx + inset, dy + inset, size - inset * 2, 1);
      ctx.fillRect(dx + inset, dy + inset, 1, size - inset * 2);
    }
  }
}

window.UIRenderer = UIRenderer;
