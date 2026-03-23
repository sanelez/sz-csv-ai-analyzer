import { describe, it, expect } from "vitest";
import { convertXLSXRows } from "./xlsx-parser";

describe("convertXLSXRows", () => {
  it("converts basic rows with header", () => {
    const rows = [
      ["Name", "Age", "City"],
      ["Alice", 30, "Paris"],
      ["Bob", 25, "London"],
    ];
    const data = convertXLSXRows(rows);

    expect(data.headers).toEqual(["Name", "Age", "City"]);
    expect(data.rowCount).toBe(2);
    expect(data.rows[0]).toEqual(["Alice", "30", "Paris"]);
    expect(data.rows[1]).toEqual(["Bob", "25", "London"]);
  });

  it("converts all cell types to strings", () => {
    const rows = [
      ["str", "num", "bool", "date", "nil"],
      ["hello", 42, true, new Date("2024-01-15T00:00:00Z"), null],
    ];
    const data = convertXLSXRows(rows);

    expect(data.rows[0]![0]).toBe("hello");
    expect(data.rows[0]![1]).toBe("42");
    expect(data.rows[0]![2]).toBe("true");
    expect(typeof data.rows[0]![3]).toBe("string"); // Date.toString()
    expect(data.rows[0]![4]).toBe("");
  });

  it("handles no-header mode", () => {
    const rows = [
      ["Alice", "30"],
      ["Bob", "25"],
    ];
    const data = convertXLSXRows(rows, { hasHeader: false });

    expect(data.headers).toEqual(["Column 1", "Column 2"]);
    expect(data.rowCount).toBe(2);
  });

  it("skips empty rows", () => {
    const rows = [
      ["A", "B"],
      ["1", "2"],
      [null, null],
      ["3", "4"],
    ];
    const data = convertXLSXRows(rows, { skipEmpty: true });

    expect(data.rowCount).toBe(2);
  });

  it("keeps empty rows when skipEmpty is false", () => {
    const rows = [
      ["A", "B"],
      ["1", "2"],
      [null, null],
      ["3", "4"],
    ];
    const data = convertXLSXRows(rows, { skipEmpty: false });

    expect(data.rowCount).toBe(3);
  });

  it("returns empty for no data", () => {
    const data = convertXLSXRows([]);
    expect(data.headers).toEqual([]);
    expect(data.rowCount).toBe(0);
  });

  it("normalizes uneven row lengths", () => {
    const rows = [
      ["A", "B", "C"],
      ["1"],
      ["2", "3", "4"],
    ];
    const data = convertXLSXRows(rows);

    expect(data.rows[0]).toEqual(["1", "", ""]);
    expect(data.rows[1]).toEqual(["2", "3", "4"]);
  });

  it("generates names for empty headers", () => {
    const rows = [
      ["", "Name", ""],
      ["1", "Alice", "x"],
    ];
    const data = convertXLSXRows(rows);

    expect(data.headers).toEqual(["Column 1", "Name", "Column 3"]);
  });

  it("infers column types", () => {
    const rows = [
      ["num", "text", "bool"],
      [42, "hello", true],
      [100, "world", false],
    ];
    const data = convertXLSXRows(rows);

    expect(data.columns[0]!.type).toBe("number");
    expect(data.columns[1]!.type).toBe("string");
    expect(data.columns[2]!.type).toBe("boolean");
  });
});
