'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { installCloseGuard } = require('../app/unsaved-changes');
const tick = () => new Promise(resolve => setImmediate(resolve));

function windowFixture() {
    return { webContents: new EventEmitter(), closed: false, isDestroyed: () => false,
        destroy() { this.closed = true; },
        close() {
            this.webContents.emit('will-prevent-unload', { preventDefault: () => { this.closed = true; } });
        } };
}

test('cancel preserves window and discard permits the second close', async () => {
    const window = windowFixture();
    const responses = [0, 1];
    installCloseGuard(window, { showMessageBox: async () => ({ response: responses.shift() }) });
    window.close();
    await tick();
    assert.equal(window.closed, false);
    window.close();
    await tick();
    assert.equal(window.closed, true);
});

test('repeated close requests show only one confirmation', async () => {
    const window = windowFixture();
    let finish;
    let count = 0;
    installCloseGuard(window, { showMessageBox: () => {
        count++;
        return new Promise(resolve => { finish = resolve; });
    } });
    window.close();
    window.close();
    assert.equal(count, 1);
    finish({ response: 0 });
    await tick();
    assert.equal(window.closed, false);
});
