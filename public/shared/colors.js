'use strict';

// Tetromino colors (index matches PIECE_TYPE_TO_ID: 1=I, 2=J, 3=L, 4=O, 5=S, 6=T, 7=Z)
const PIECE_COLORS = {
  0: '#000000',    // empty
  1: '#00F0F0',    // I - cyan
  2: '#0000F0',    // J - blue
  3: '#F0A000',    // L - orange
  4: '#F0F000',    // O - yellow
  5: '#00F000',    // S - green
  6: '#A000F0',    // T - purple
  7: '#F00000',    // Z - red
  8: '#808080'     // garbage - gray
};

// Lighter versions for ghost pieces
const GHOST_COLORS = {
  1: 'rgba(0, 240, 240, 0.25)',
  2: 'rgba(0, 0, 240, 0.25)',
  3: 'rgba(240, 160, 0, 0.25)',
  4: 'rgba(240, 240, 0, 0.25)',
  5: 'rgba(0, 240, 0, 0.25)',
  6: 'rgba(160, 0, 240, 0.25)',
  7: 'rgba(240, 0, 0, 0.25)'
};

// Player accent colors
const PLAYER_COLORS = [
  '#FF6B6B', // Player 1 - red
  '#4ECDC4', // Player 2 - teal
  '#FFE66D', // Player 3 - yellow
  '#A78BFA'  // Player 4 - purple
];

const PLAYER_NAMES = ['Player 1', 'Player 2', 'Player 3', 'Player 4'];

// Board appearance
const GRID_LINE_COLOR = '#1a1a2e';
const BOARD_BG_COLOR = '#0f0f23';
const BORDER_COLOR = '#333366';

// Export for both Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PIECE_COLORS, GHOST_COLORS, PLAYER_COLORS, PLAYER_NAMES, GRID_LINE_COLOR, BOARD_BG_COLOR, BORDER_COLOR };
}
