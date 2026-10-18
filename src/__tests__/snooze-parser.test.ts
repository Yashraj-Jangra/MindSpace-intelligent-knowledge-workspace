import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { parseSnoozePhrase } from "../lib/snooze-parser";

describe("snooze-parser", () => {
  test("parses relative minutes correctly", () => {
    const before = Date.now();
    const result = parseSnoozePhrase("in 30 minutes");

    assert.ok(result instanceof Date, "Should return a Date instance");
    const diffMs = result.getTime() - before;
    const expectedMs = 30 * 60 * 1000;
    // Allow 1 second delta for execution time
    assert.ok(Math.abs(diffMs - expectedMs) < 1000, "Difference should be ~30 minutes");
  });

  test("parses short minute format '15m'", () => {
    const before = Date.now();
    const result = parseSnoozePhrase("15m");

    assert.ok(result instanceof Date);
    const diffMs = result.getTime() - before;
    assert.ok(Math.abs(diffMs - 15 * 60 * 1000) < 1000);
  });

  test("parses relative hours correctly", () => {
    const before = Date.now();
    const result = parseSnoozePhrase("in 2 hours");

    assert.ok(result instanceof Date);
    const diffMs = result.getTime() - before;
    assert.ok(Math.abs(diffMs - 2 * 60 * 60 * 1000) < 1000);
  });

  test("parses relative days correctly", () => {
    const before = Date.now();
    const result = parseSnoozePhrase("in 3 days");

    assert.ok(result instanceof Date);
    const diffMs = result.getTime() - before;
    assert.ok(Math.abs(diffMs - 3 * 24 * 60 * 60 * 1000) < 1000);
  });

  test("parses 'tomorrow' to 9:00 AM of the next day", () => {
    const result = parseSnoozePhrase("tomorrow");

    assert.ok(result instanceof Date);
    assert.equal(result.getHours(), 9);
    assert.equal(result.getMinutes(), 0);
  });

  test("parses 'tonight' to 8:00 PM (20:00)", () => {
    const result = parseSnoozePhrase("tonight");

    assert.ok(result instanceof Date);
    assert.equal(result.getHours(), 20);
    assert.equal(result.getMinutes(), 0);
  });

  test("parses 'after lunch' to 1:00 PM (13:00)", () => {
    const result = parseSnoozePhrase("after lunch");

    assert.ok(result instanceof Date);
    assert.equal(result.getHours(), 13);
    assert.equal(result.getMinutes(), 0);
  });

  test("returns null for unparseable random gibberish", () => {
    const result = parseSnoozePhrase("gibberish-xyz-random-unparseable");
    assert.equal(result, null);
  });
});
