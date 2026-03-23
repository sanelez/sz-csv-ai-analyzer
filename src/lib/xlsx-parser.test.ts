import { describe, it, expect } from "vitest";
import { isXLSXFile, isSupportedFile, SPREADSHEET_ACCEPT } from "./xlsx-parser";

describe("isXLSXFile", () => {
  it("returns true for .xlsx", () => {
    expect(isXLSXFile("data.xlsx")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(isXLSXFile("DATA.XLSX")).toBe(true);
    expect(isXLSXFile("File.Xlsx")).toBe(true);
  });

  it("returns false for .csv", () => {
    expect(isXLSXFile("data.csv")).toBe(false);
  });

  it("returns false for .xls", () => {
    expect(isXLSXFile("data.xls")).toBe(false);
  });

  it("returns false for other extensions", () => {
    expect(isXLSXFile("data.json")).toBe(false);
    expect(isXLSXFile("data.txt")).toBe(false);
  });
});

describe("isSupportedFile", () => {
  it("accepts .csv files", () => {
    expect(isSupportedFile("data.csv")).toBe(true);
    expect(isSupportedFile("DATA.CSV")).toBe(true);
  });

  it("accepts .xlsx files", () => {
    expect(isSupportedFile("data.xlsx")).toBe(true);
    expect(isSupportedFile("DATA.XLSX")).toBe(true);
  });

  it("rejects unsupported formats", () => {
    expect(isSupportedFile("data.json")).toBe(false);
    expect(isSupportedFile("data.xls")).toBe(false);
    expect(isSupportedFile("data.txt")).toBe(false);
    expect(isSupportedFile("data.tsv")).toBe(false);
  });
});

describe("SPREADSHEET_ACCEPT", () => {
  it("includes csv and xlsx", () => {
    expect(SPREADSHEET_ACCEPT).toContain(".csv");
    expect(SPREADSHEET_ACCEPT).toContain(".xlsx");
  });
});
