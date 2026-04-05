import { mkdir } from "node:fs/promises";
import path from "node:path";
import type { Page } from "@playwright/test";

const RUN_TIMESTAMP = new Date().toISOString().replace(/[:.]/g, "-");

// ファイル名に使用できない文字を置換する関数。
// アルファベット、数字、ドット、アンダースコア、ハイフン以外の文字をハイフンに置換する。
function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]+/g, "-");
}

// スクリーンショットを保存するディレクトリのパスを生成する関数。
export function getScreenshotDirectory(specFileName: string) {
  return path.join("scenario", "screenshots", specFileName, RUN_TIMESTAMP);
}

// スクリーンショットを撮るための関数を生成する関数。
export function createScreenshotTaker(specFileName: string) {
  const relativeDirectory = getScreenshotDirectory(specFileName);

  return async (page: Page, fileName: string) => {
    const absoluteDirectory = path.join(process.cwd(), relativeDirectory);

    await mkdir(absoluteDirectory, { recursive: true });
    await page.screenshot({
      path: path.join(absoluteDirectory, sanitizeFileName(fileName)),
      fullPage: true,
    });
  };
}
