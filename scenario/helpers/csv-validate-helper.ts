import { readFile } from "node:fs/promises";
import path from "node:path";
import type { APIRequestContext, Download, Page } from "@playwright/test";
import { loginAsValidUser } from "./auth-helper";

export const VALID_CSV_PATH = "scenario/fixtures/data.csv";
export const INVALID_CSV_PATH = "scenario/fixtures/error-data.csv";

export type MailRecord = {
  id: string;
  subject: string;
  text: string;
  html: string | null;
  from: string;
  to: string;
  date: string;
};

// ダッシュボードページを有効なユーザーで開くためのヘルパー関数。
export async function openDashboardWithLogin(page: Page) {
  await loginAsValidUser(page);
}

// CSVファイルをアップロードするためのヘルパー関数。ファイル入力要素に指定したCSVファイルをセットする。
export async function uploadCsv(page: Page, relativeFilePath: string) {
  await page.locator("#csv-file-input").setInputFiles(path.join(process.cwd(), relativeFilePath));
}

// CSVファイルをアップロードして、ダウンロードイベントをキャプチャするためのヘルパー関数。
export async function uploadCsvAndCaptureDownload(
  page: Page,
  relativeFilePath: string,
): Promise<{ download: Download; content: string }> {
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    uploadCsv(page, relativeFilePath),
  ]);

  const downloadPath = await download.path();

  if (!downloadPath) {
    throw new Error("ダウンロードファイルのパスを取得できませんでした。");
  }

  const content = await readFile(downloadPath, "utf-8");

  return { download, content };
}

// テスト用のメールボックスを初期化するためのヘルパー関数。
// APIリクエストを送信して、メールボックス内のメールをすべて削除する。
export async function clearMailbox(request: APIRequestContext) {
  const response = await request.delete("/api/test-mails");

  if (!response.ok()) {
    throw new Error("メールボックスの初期化に失敗しました。");
  }
}

// アップロード済みファイルを初期化するためのヘルパー関数。
export async function clearUploadedFiles(request: APIRequestContext) {
  const response = await request.delete("/api/upload-files");

  if (!response.ok()) {
    throw new Error("アップロード済みファイルの初期化に失敗しました。");
  }
}

// テスト用のメールボックスからメールを取得するためのヘルパー関数。
// APIリクエストを送信して、メールのリストをJSON形式で受け取る。
export async function listMailbox(request: APIRequestContext): Promise<MailRecord[]> {
  const response = await request.get("/api/test-mails");

  if (!response.ok()) {
    throw new Error("メールボックスの取得に失敗しました。");
  }

  const body = (await response.json()) as { mails: MailRecord[] };

  return body.mails;
}

// 画面上のリンクからファイルサーバー上のCSVを取得するためのヘルパー関数。
export async function fetchUploadedCsvFromLink(
  page: Page,
  request: APIRequestContext,
  linkName: string,
) {
  const href = await page.getByRole("link", { name: linkName }).getAttribute("href");

  if (!href) {
    throw new Error("アップロード済みCSVのリンクを取得できませんでした。");
  }

  const response = await request.get(href);

  if (!response.ok()) {
    throw new Error("アップロード済みCSVの取得に失敗しました。");
  }

  return response.text();
}
