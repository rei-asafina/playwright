import { expect, test } from "@playwright/test";
import { AUTH_ERROR_MESSAGE, VALID_EMAIL, VALID_PASSWORD } from "../src/lib/auth";
import { loginAsValidUser } from "./helpers/auth-helper";
import { createScreenshotTaker } from "./helpers/screenshot-helper";

const takeAuthScreenshot = createScreenshotTaker("auth.spec.ts"); // スクリーンショットを保存する関数を作成

test("正常ログインでダッシュボードへ遷移できる", async ({ page }) => {
  await page.goto("/login"); // ログイン画面にアクセス
  await takeAuthScreenshot(page, "normal-before-input.png"); // ログイン前の状態をスクリーンショットで保存

  await page.getByLabel("メールアドレス").fill(VALID_EMAIL); // メールアドレスを入力
  await page.getByLabel("パスワード").fill(VALID_PASSWORD); // パスワードを入力
  await page.getByRole("button", { name: "ログイン" }).click(); // ログインボタンをクリック
  await expect(page).toHaveURL(/\/dashboard\?user=Test%20User$/); // ダッシュボードに遷移していることを確認
  await takeAuthScreenshot(page, "normal-after-submit.png"); // ログイン後の状態をスクリーンショットで保存

  await expect(page.getByRole("heading", { name: "ログイン成功" })).toBeVisible(); // ログイン成功の見出しが表示されていることを確認
  await expect(page.getByText("Test User")).toBeVisible(); // ユーザー名が表示されていることを確認
  await takeAuthScreenshot(page, "normal-success.png"); // ログイン成功の状態をスクリーンショットで保存
});

test("異常ログインではエラーが表示されてログイン画面に留まる", async ({ page }) => {
  await page.goto("/login"); // ログイン画面にアクセス
  await takeAuthScreenshot(page, "error-before-input.png"); // ログイン前の状態をスクリーンショットで保存

  await page.getByLabel("メールアドレス").fill("wrong@example.com"); // メールアドレスを入力
  await page.getByLabel("パスワード").fill("invalid-password"); // パスワードを入力
  await page.getByRole("button", { name: "ログイン" }).click(); // ログインボタンをクリック

  await expect(page).toHaveURL(/\/login$/); // ログイン画面に留まっていることを確認
  await takeAuthScreenshot(page, "error-after-submit.png"); // ログイン後の状態をスクリーンショットで保存

  await expect(page.getByTestId("login-error")).toHaveText(AUTH_ERROR_MESSAGE); // エラーメッセージが表示されていることを確認
  await takeAuthScreenshot(page, "error-message.png"); // エラーメッセージの状態をスクリーンショットで保存
});

test("ログアウトでホームへ戻れる", async ({ page }) => {
  await loginAsValidUser(page); // ダッシュボードにログインして開く
  await page.getByRole("button", { name: "ログアウト" }).click(); // ログアウトボタンをクリック

  await expect(page).toHaveURL(/\/$/); // ホームに遷移していることを確認
  await expect(page.getByRole("heading", { name: "ホーム" })).toBeVisible(); // ホームの見出しが表示されていることを確認
});
