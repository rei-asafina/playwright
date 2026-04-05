export type ValidationResult = {
  headers: string[];
  records: string[][];
};

export type CsvValidationIssue = {
  row: string[];
  uiMessage: string;
  csvMessage: string;
};

export type UploadCsvSuccessResponse = {
  status: "success";
  fileName: string;
  storedFilePath: string;
  storedFileUrl: string;
  headers: string[];
  records: string[][];
  recordCount: number;
};

export type UploadCsvFailureResponse = {
  status: "failure";
  fileName: string;
  storedFilePath: string;
  storedFileUrl: string;
  errorMessage: string;
  errorCount?: number;
  errorCsvFileName?: string;
  errorCsvContent?: string;
  errorCsvStoredPath?: string;
  errorCsvStoredUrl?: string;
};

export type UploadCsvResponse = UploadCsvSuccessResponse | UploadCsvFailureResponse;

export class CsvValidationError extends Error {
  headers: string[];
  issues: CsvValidationIssue[];

  constructor(headers: string[], issues: CsvValidationIssue[]) {
    super(issues[0]?.uiMessage ?? "CSVのバリデーションに失敗しました。", {
      cause: issues,
    });
    this.name = "CsvValidationError";
    this.headers = headers;
    this.issues = issues;
    Object.setPrototypeOf(this, CsvValidationError.prototype);
  }
}

export function escapeCsvValue(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

export function buildErrorCsv(headers: string[], issues: CsvValidationIssue[]): string {
  const csvHeaders = [...headers, "error"];
  const csvRows = issues.map(({ row, csvMessage }) => [...row, csvMessage]);

  return [csvHeaders, ...csvRows]
    .map((record) => record.map((value) => escapeCsvValue(value)).join(","))
    .join("\r\n");
}

export function createErrorCsvFileName(originalFileName: string): string {
  const extensionIndex = originalFileName.lastIndexOf(".");

  if (extensionIndex === -1) {
    return `${originalFileName}-errors.csv`;
  }

  const baseName = originalFileName.slice(0, extensionIndex);

  return `${baseName}-errors.csv`;
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentValue = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentValue += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }

      continue;
    }

    if (char === "," && !inQuotes) {
      currentRow.push(currentValue.trim());
      currentValue = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }

      currentRow.push(currentValue.trim());
      rows.push(currentRow);
      currentRow = [];
      currentValue = "";
      continue;
    }

    currentValue += char;
  }

  if (currentValue.length > 0 || currentRow.length > 0) {
    currentRow.push(currentValue.trim());
    rows.push(currentRow);
  }

  return rows
    .map((row) => row.map((cell) => cell.trim()))
    .filter((row) => row.some((cell) => cell.length > 0));
}

export function validateCsvRows(rows: string[][]): ValidationResult {
  if (rows.length === 0) {
    throw new Error("CSVファイルに表示できるデータがありません。");
  }

  const [firstRow, ...otherRows] = rows;

  if (!firstRow || firstRow.every((cell) => cell.length === 0)) {
    throw new Error("ヘッダー行が見つかりません。");
  }

  const normalizedHeaders = firstRow.map((header) => header.trim().toLowerCase());
  const idIndex = normalizedHeaders.indexOf("id");
  const nameIndex = normalizedHeaders.indexOf("name");

  if (idIndex === -1 || nameIndex === -1) {
    throw new Error("CSVヘッダーには id と name が必要です。");
  }

  const columnCount = firstRow.length;
  const normalizedRows = otherRows.map((row) => {
    if (row.length >= columnCount) {
      return row.slice(0, columnCount);
    }

    return [...row, ...Array.from({ length: columnCount - row.length }, () => "")];
  });

  const issues: CsvValidationIssue[] = [];

  normalizedRows.forEach((row, rowIndex) => {
    const csvRowNumber = rowIndex + 2;
    const idValue = row[idIndex] ?? "";
    const nameValue = row[nameIndex] ?? "";
    const uiErrors: string[] = [];
    const csvErrors: string[] = [];

    if (!/^\d+$/.test(idValue)) {
      uiErrors.push(`${csvRowNumber}行目の id は数値で入力してください。`);
      csvErrors.push("id must be integer");
    }

    if (nameValue.length === 0) {
      uiErrors.push(`${csvRowNumber}行目の name は文字列で入力してください。`);
      csvErrors.push("name must be string");
    }

    if (!Number.isNaN(Number(nameValue))) {
      uiErrors.push(`${csvRowNumber}行目の name は文字列で入力してください。`);
      csvErrors.push("name must be string");
    }

    if (uiErrors.length > 0) {
      issues.push({
        row,
        uiMessage: uiErrors.join(" / "),
        csvMessage: Array.from(new Set(csvErrors)).join("; "),
      });
    }
  });

  if (issues.length > 0) {
    throw new CsvValidationError(firstRow, issues);
  }

  return {
    headers: firstRow,
    records: normalizedRows,
  };
}
