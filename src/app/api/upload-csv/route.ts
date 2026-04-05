import { NextResponse } from "next/server";
import {
  buildErrorCsv,
  createErrorCsvFileName,
  CsvValidationError,
  parseCsv,
  validateCsvRows,
  type UploadCsvFailureResponse,
  type UploadCsvSuccessResponse,
} from "@/lib/csv";
import { storeErrorCsv, storeUploadedCsv } from "@/lib/upload-storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ message: "CSVファイルを指定してください。" }, { status: 400 });
  }

  const text = await file.text();
  const storedFilePath = await storeUploadedCsv(file.name, text);
  const storedFileName = storedFilePath.split("/").pop() ?? file.name;
  const storedFileUrl = `/api/upload-files/originals/${encodeURIComponent(storedFileName)}`;

  try {
    const rows = parseCsv(text);
    const validatedCsv = validateCsvRows(rows);
    const body: UploadCsvSuccessResponse = {
      status: "success",
      fileName: file.name,
      storedFilePath,
      storedFileUrl,
      headers: validatedCsv.headers,
      records: validatedCsv.records,
      recordCount: validatedCsv.records.length,
    };

    return NextResponse.json(body);
  } catch (error) {
    if (error instanceof CsvValidationError) {
      const errorCsvFileName = createErrorCsvFileName(file.name);
      const errorCsvContent = buildErrorCsv(error.headers, error.issues);
      const errorCsvStoredPath = await storeErrorCsv(errorCsvFileName, errorCsvContent);
      const errorCsvStoredFileName = errorCsvStoredPath.split("/").pop() ?? errorCsvFileName;
      const body: UploadCsvFailureResponse = {
        status: "failure",
        fileName: file.name,
        storedFilePath,
        storedFileUrl,
        errorMessage: error.message,
        errorCount: error.issues.length,
        errorCsvFileName,
        errorCsvContent,
        errorCsvStoredPath,
        errorCsvStoredUrl: `/api/upload-files/errors/${encodeURIComponent(errorCsvStoredFileName)}`,
      };

      return NextResponse.json(body, { status: 422 });
    }

    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "CSVファイルのアップロードに失敗しました。",
      },
      { status: 500 },
    );
  }
}
