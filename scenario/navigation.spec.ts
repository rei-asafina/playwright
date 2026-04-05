import { expect, test } from "@playwright/test";

test("ホーム画面を表示できる", async ({ page }) => {
  await page.goto("/"); // ホーム画面にアクセス

  await expect(page.getByRole("heading", { name: "ホーム" })).toBeVisible(); // ホームの見出しが表示されていることを確認
  await expect(page.getByRole("button", { name: "ログインへ" })).toBeVisible(); // ログインへボタンが表示されていることを確認
});

test("ホームからログイン画面へ遷移できる", async ({ page }) => {
  await page.goto("/"); // ホーム画面にアクセス
  await page.getByRole("button", { name: "ログインへ" }).click(); // ログインへボタンをクリック

  await expect(page).toHaveURL(/\/login$/); // URLが/loginで終わることを確認
  await expect(page.getByRole("heading", { name: "ログイン" })).toBeVisible(); // ログインの見出しが表示されていることを確認
});
