'use strict';

const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { INPUT } = require('../public/shared/protocol');

global.INPUT = INPUT;
Object.defineProperty(globalThis, 'navigator', {
  value: { vibrate() {} },
  configurable: true
});

const TouchInput = require('../public/controller/TouchInput.js');

function createMockElement() {
  return {
    style: {},
    addEventListener() {},
    removeEventListener() {},
    setPointerCapture() {}
  };
}

function pointerEvent(overrides) {
  return {
    button: 0,
    pointerId: 1,
    clientX: 0,
    clientY: 0,
    timeStamp: 0,
    preventDefault() {},
    ...overrides
  };
}

describe('TouchInput hard drop gesture', () => {
  let actions;
  let touchInput;

  beforeEach(() => {
    actions = [];
    touchInput = new TouchInput(createMockElement(), (action, data) => {
      actions.push({ action, data });
    });
  });

  test('diagonal downward swipe favors hard drop over horizontal ratchet', () => {
    touchInput._onPointerDown(pointerEvent({ clientX: 0, clientY: 0, timeStamp: 0 }));
    touchInput._onPointerMove(pointerEvent({ clientX: 54, clientY: 92, timeStamp: 70 }));
    touchInput._onPointerUp(pointerEvent({ clientX: 60, clientY: 150, timeStamp: 120 }));

    assert.equal(actions.some(entry => entry.action === INPUT.LEFT || entry.action === INPUT.RIGHT), false);
    assert.equal(actions[actions.length - 1].action, INPUT.HARD_DROP);
  });

  test('horizontal drag still emits ratcheted movement', () => {
    touchInput._onPointerDown(pointerEvent({ clientX: 0, clientY: 0, timeStamp: 0 }));
    touchInput._onPointerMove(pointerEvent({ clientX: 60, clientY: 20, timeStamp: 80 }));

    assert.deepEqual(actions.map(entry => entry.action), [INPUT.RIGHT]);
  });
});
