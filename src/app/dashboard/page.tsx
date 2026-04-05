"use client";

import { ChangeEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { UploadCsvResponse } from "@/lib/csv";

type UploadNotificationPayload = {
  status: "success" | "failure";
  fileName: string;
  recordCount?: number;
  errorCount?: number;
  errorMessage?: string;
};

type UploadCsvApiError = {
  message: string;
};

// エラー内容をCSVファイルとしてダウンロードする関数
function downloadCsvFile(fileName: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = objectUrl;
  link.download = fileName;
  link.click();

  URL.revokeObjectURL(objectUrl);
}

function isUploadCsvResponse(value: unknown): value is UploadCsvResponse {
  return (
    !!value &&
    typeof value === "object" &&
    "status" in value &&
    "fileName" in value &&
    (value.status === "success" || value.status === "failure")
  );
}

// CSVアップロードの結果をサーバーに通知する関数。サーバー側でメール送信などの処理を行う想定。
async function notifyUploadResult(payload: UploadNotificationPayload) {
  try {
    const response = await fetch("/api/upload-notify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error("アップロード結果メールの送信に失敗しました。");
    }
  } catch (error) {
    console.error("Failed to send upload result email", error);
  }
}

async function uploadCsvToServer(file: File): Promise<UploadCsvResponse> {
  const formData = new FormData();

  formData.set("file", file);

  const response = await fetch("/api/upload-csv", {
    method: "POST",
    body: formData,
  });
  const body = (await response.json()) as UploadCsvResponse | UploadCsvApiError;

  if (!isUploadCsvResponse(body)) {
    throw new Error(body.message ?? "CSVファイルのアップロードに失敗しました。");
  }

  return body;
}

// ダッシュボードページのコンポーネント。CSVファイルのアップロードとバリデーション、結果の表示を行う。
export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userName = searchParams.get("user") ?? "Test User";
  const [fileName, setFileName] = useState("");
  const [storedFileUrl, setStoredFileUrl] = useState("");
  const [errorFileUrl, setErrorFileUrl] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [records, setRecords] = useState<string[][]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) {
      setFileName("");
      setStoredFileUrl("");
      setErrorFileUrl("");
      setHeaders([]);
      setRecords([]);
      setErrorMessage("");
      return;
    }

    try {
      const result = await uploadCsvToServer(selectedFile);

      setFileName(result.fileName);
      setStoredFileUrl(result.storedFileUrl);
      setErrorFileUrl("");

      if (result.status === "success") {
        setHeaders(result.headers);
        setRecords(result.records);
        setErrorMessage("");
        await notifyUploadResult({
          status: "success",
          fileName: result.fileName,
          recordCount: result.recordCount,
        });
        return;
      }

      setHeaders([]);
      setRecords([]);

      if (result.errorCsvFileName && result.errorCsvContent) {
        downloadCsvFile(result.errorCsvFileName, result.errorCsvContent);
        setErrorFileUrl(result.errorCsvStoredUrl ?? "");
        setErrorMessage(`${result.errorMessage} エラー内容をCSVとしてダウンロードしました。`);
      } else {
        setErrorMessage(result.errorMessage);
      }

      await notifyUploadResult({
        status: "failure",
        fileName: result.fileName,
        errorCount: result.errorCount,
        errorMessage: result.errorMessage,
      });
    } catch (error) {
      setFileName(selectedFile.name);
      setStoredFileUrl("");
      setErrorFileUrl("");
      setHeaders([]);
      setRecords([]);

      const fallbackErrorMessage =
        error instanceof Error ? error.message : "CSVファイルの読み込みに失敗しました。";

      setErrorMessage(fallbackErrorMessage);
      await notifyUploadResult({
        status: "failure",
        fileName: selectedFile.name,
        errorMessage: fallbackErrorMessage,
      });
    } finally {
      event.target.value = "";
    }
  };

  return (
    <main>
      <section className="panel dashboard-panel stack" aria-labelledby="dashboard-heading">
        <h1 id="dashboard-heading">ログイン成功</h1>
        <p>
          ユーザー名: <strong>{userName}</strong>
        </p>

        <section className="stack" aria-labelledby="csv-upload-heading">
          <div className="stack compact-gap">
            <h2 id="csv-upload-heading">CSVアップロード</h2>
            <p className="muted">
              CSVファイルを選択すると、1行目をヘッダーとして表形式で表示します。
            </p>
          </div>

          <label className="upload-box" htmlFor="csv-file-input">
            <span>ここをクリックしてCSVファイルを選択</span>
            <input
              id="csv-file-input"
              name="csv-file-input"
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
            />
          </label>

          <p className="status" aria-live="polite">
            {fileName ? `選択中のファイル: ${fileName}` : "まだファイルは選択されていません。"}
          </p>

          {storedFileUrl ? (
            <p className="muted">
              保存済みファイル: <a href={storedFileUrl} target="_blank" rel="noreferrer">アップロードCSVを開く</a>
            </p>
          ) : null}

          {errorFileUrl ? (
            <p className="muted">
              エラーファイル: <a href={errorFileUrl} target="_blank" rel="noreferrer">保存済みエラーCSVを開く</a>
            </p>
          ) : null}

          {errorMessage ? (
            <p className="error" aria-live="assertive">
              {errorMessage}
            </p>
          ) : null}

          {headers.length > 0 ? (
            <div className="stack compact-gap">
              <div className="summary-grid" aria-label="CSVの概要">
                <div className="summary-card">
                  <span className="summary-label">列数</span>
                  <strong>{headers.length}</strong>
                </div>
                <div className="summary-card">
                  <span className="summary-label">データ行数</span>
                  <strong>{records.length}</strong>
                </div>
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      {headers.map((header, index) => (
                        <th key={`${header}-${index}`} scope="col">
                          {header || `列${index + 1}`}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {records.length > 0 ? (
                      records.map((record, rowIndex) => (
                        <tr key={`row-${rowIndex}`}>
                          {record.map((cell, cellIndex) => (
                            <td key={`cell-${rowIndex}-${cellIndex}`}>{cell}</td>
                          ))}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={headers.length}>ヘッダーのみのCSVです。</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </section>

        <div className="actions">
          <button type="button" className="button-secondary" onClick={() => router.push("/")}>
            ログアウト
          </button>
        </div>
      </section>
    </main>
  );
}
