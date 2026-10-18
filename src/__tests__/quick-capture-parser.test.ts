import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { parseQuickCapture } from "../lib/quick-capture-parser";

describe("quick-capture-parser", () => {
  test("handles empty or null string gracefully", () => {
    const result = parseQuickCapture("");
    assert.equal(result.rawText, "");
    assert.equal(result.cleanText, "");
    assert.deepEqual(result.tags, []);
    assert.deepEqual(result.urls, []);
    assert.equal(result.suggestedType, "NOTE");
  });

  test("extracts single and multiple URLs correctly", () => {
    const input = "Read this article https://nextjs.org/docs and also https://prisma.io";
    const result = parseQuickCapture(input);

    assert.equal(result.urls.length, 2);
    assert.equal(result.urls[0], "https://nextjs.org/docs");
    assert.equal(result.urls[1], "https://prisma.io");
  });

  test("extracts tags and lowercases them", () => {
    const input = "Refactor database models #Backend #Architecture #Prisma";
    const result = parseQuickCapture(input);

    assert.deepEqual(result.tags, ["backend", "architecture", "prisma"]);
  });

  test("extracts critical priority and removes priority flag from clean text", () => {
    const input = "Deploy security patch !critical for auth flow";
    const result = parseQuickCapture(input);

    assert.equal(result.priority, "CRITICAL");
    assert.ok(!result.cleanText.includes("!critical"));
    assert.equal(result.cleanText, "Deploy security patch for auth flow");
    assert.equal(result.suggestedType, "TASK");
  });

  test("extracts priority aliases (!p0, !p1, !med, !low)", () => {
    const p0 = parseQuickCapture("Hotfix bug !p0");
    assert.equal(p0.priority, "CRITICAL");

    const p1 = parseQuickCapture("Write docs !high");
    assert.equal(p1.priority, "HIGH");

    const p2 = parseQuickCapture("Update dependencies !med");
    assert.equal(p2.priority, "MEDIUM");

    const p3 = parseQuickCapture("Nice to have feature !low");
    assert.equal(p3.priority, "LOW");
  });

  test("suggests WEB_CLIP when input is predominantly a URL", () => {
    const result = parseQuickCapture("https://github.com/trending");
    assert.equal(result.suggestedType, "WEB_CLIP");
  });

  test("extracts relative due date 'in 2 hours'", () => {
    const before = Date.now();
    const result = parseQuickCapture("Submit assignment in 2 hours !high");

    assert.ok(result.dueDate instanceof Date);
    const diffMs = result.dueDate.getTime() - before;
    assert.ok(Math.abs(diffMs - 2 * 60 * 60 * 1000) < 1000);
    assert.equal(result.priority, "HIGH");
    assert.equal(result.suggestedType, "TASK");
  });
});
