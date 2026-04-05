import type { Page } from "@playwright/test";
import { VALID_EMAIL, VALID_PASSWORD } from "../../src/lib/auth";

// テスト用の有効なユーザーでログインするためのヘルパー関数。
// ログインページにアクセスし、メールアドレスとパスワードを入力してログインボタンをクリックする。
export async function loginAsValidUser(page: Page) {
  await page.goto("/login");
  await page.getByLabel("メールアドレス").fill(VALID_EMAIL);
  await page.getByLabel("パスワード").fill(VALID_PASSWORD);
  await page.getByRole("button", { name: "ログイン" }).click();
}
