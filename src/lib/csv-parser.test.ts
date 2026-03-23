import { describe, it, expect } from "vitest";
import { parseCSV, inferColumnType } from "./csv-parser";

describe("parseCSV", () => {
  it("parses basic CSV with headers", () => {
    const data = parseCSV("name,age,city\nAlice,30,Paris\nBob,25,London");
    expect(data.headers).toEqual(["name", "age", "city"]);
    expect(data.rowCount).toBe(2);
    expect(data.rows[0]).toEqual(["Alice", "30", "Paris"]);
  });

  it("auto-detects semicolon delimiter", () => {
    const data = parseCSV("a;b;c\n1;2;3");
    expect(data.headers).toEqual(["a", "b", "c"]);
    expect(data.rows[0]).toEqual(["1", "2", "3"]);
  });

  it("auto-detects tab delimiter", () => {
    const data = parseCSV("a\tb\tc\n1\t2\t3");
    expect(data.headers).toEqual(["a", "b", "c"]);
    expect(data.rows[0]).toEqual(["1", "2", "3"]);
  });

  it("uses explicit delimiter from settings", () => {
    const data = parseCSV("a|b|c\n1|2|3", {
      delimiter: "|",
      hasHeader: true,
      encoding: "UTF-8",
      skipEmptyLines: true,
    });
    expect(data.headers).toEqual(["a", "b", "c"]);
  });

  it("handles no-header mode", () => {
    const data = parseCSV("1,2,3\n4,5,6", {
      delimiter: "",
      hasHeader: false,
      encoding: "UTF-8",
      skipEmptyLines: true,
    });
    expect(data.headers).toEqual(["Column 1", "Column 2", "Column 3"]);
    expect(data.rowCount).toBe(2);
  });

  it("returns empty data for empty input", () => {
    const data = parseCSV("");
    expect(data.headers).toEqual([]);
    expect(data.rowCount).toBe(0);
  });

  it("handles quoted fields with commas", () => {
    const data = parseCSV(
      'name,desc\n"Alice","Has a, comma"\n"Bob","No comma"',
    );
    expect(data.rows[0]![1]).toBe("Has a, comma");
  });

  it("infers column types", () => {
    const data = parseCSV(
      "num,text,date\n42,hello,2024-01-01\n100,world,2024-02-15",
    );
    const types = data.columns.map((c) => c.type);
    expect(types).toEqual(["number", "string", "date"]);
  });

  it("generates column names for empty headers", () => {
    const data = parseCSV(",b,\n1,2,3");
    expect(data.headers).toEqual(["Column 1", "b", "Column 3"]);
  });
});

describe("inferColumnType", () => {
  it("detects numbers", () => {
    expect(inferColumnType(["1", "2.5", "100", "3.14"])).toBe("number");
  });

  it("detects strings", () => {
    expect(inferColumnType(["hello", "world"])).toBe("string");
  });

  it("detects dates", () => {
    expect(inferColumnType(["2024-01-01", "2024-12-31"])).toBe("date");
  });

  it("detects booleans", () => {
    expect(inferColumnType(["true", "false", "yes", "no"])).toBe("boolean");
  });

  it("returns string for empty values", () => {
    expect(inferColumnType(["", "", ""])).toBe("string");
  });

  it("returns string for mixed types", () => {
    expect(inferColumnType(["1", "hello", "3"])).toBe("string");
  });
});
