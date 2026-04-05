import { expect, test } from "@playwright/test";
import {
  clearMailbox,
  clearUploadedFiles,
  fetchUploadedCsvFromLink,
  INVALID_CSV_PATH,
  listMailbox,
  VALID_CSV_PATH,
  openDashboardWithLogin,
  uploadCsv,
  uploadCsvAndCaptureDownload,
} from "./helpers/csv-validate-helper";

// 各テストの前にメールボックスを初期化するためのフック。
// APIリクエストを送信して、メールボックス内のメールをすべて削除する。
// TODO [nits]シナリオごとにDBデータも初期化するようにしたい。
// selenium-testを変更しなくてもシナリオ内の初期化データだけ
// 変更すれば良くなる。より安定したテストになる。
test.beforeEach(async ({ request }) => {
  await clearMailbox(request);
  await clearUploadedFiles(request);
});

test("正常なCSVをアップロードすると内容を表示できる", async ({ page, request }) => {
  await openDashboardWithLogin(page); // ダッシュボードにログインして開く
  await uploadCsv(page, VALID_CSV_PATH); // 正常なCSVファイルをアップロード

  await expect(page.getByText("選択中のファイル: data.csv")).toBeVisible(); // ファイル名の表示を確認
  await expect(page.getByText("列数")).toBeVisible(); // 列数の表示を確認
  await expect(page.getByText("データ行数")).toBeVisible(); // データ行数の表示を確認
  await expect(page.getByRole("columnheader", { name: "id" })).toBeVisible(); // id列のヘッダーを確認
  await expect(page.getByRole("columnheader", { name: "name" })).toBeVisible(); // name列のヘッダーを確認
  await expect(page.getByRole("cell", { name: "1111" })).toBeVisible(); // idの値を確認
  await expect(page.getByRole("cell", { name: "hoge" })).toBeVisible(); // nameの値を確認
  await expect(page.getByText("1行目の id は数値で入力してください。")).toHaveCount(0); // エラーが表示されないことを確認
  await expect(page.getByText("2行目の name は文字列で入力してください。")).toHaveCount(0); // エラーが表示されないことを確認
  await expect(page.getByRole("link", { name: "アップロードCSVを開く" })).toBeVisible(); // ファイルサーバー上のCSVリンクが表示されることを確認

  const uploadedCsvContent = await fetchUploadedCsvFromLink(page, request, "アップロードCSVを開く");
  expect(uploadedCsvContent.replace(/\r\n/g, "\n").trimEnd()).toBe("id,name\n1111,hoge"); // ファイルサーバー上に保存されたCSVの内容を確認

  // メールの内容を確認
  await expect
    .poll(async () => (await listMailbox(request)).map((mail) => mail.subject))
    .toEqual(["アップロード成功"]);

  const successMails = await listMailbox(request);
  expect(successMails[0]?.subject).toBe("アップロード成功"); // 件名を確認
  expect(successMails[0]?.from).toBe("no-reply@example.local"); // 送信元を確認
  expect(successMails[0]?.to).toBe("admin@example.local"); // 送信先を確認
  expect(successMails[0]?.text).toContain("CSVアップロードのバリデーションに成功しました。"); // 本文の内容を確認
  expect(successMails[0]?.text).toContain("ファイル名: data.csv"); // 本文の内容を確認
  expect(successMails[0]?.text).toContain("データ行数: 1"); // 本文の内容を確認
});

test(
  "不正なCSVをアップロードするとバリデーションエラーを表示しエラーファイルを出力する",
  async ({ page, request }) => {
    await openDashboardWithLogin(page); // ダッシュボードにログインして開く

    // 不正なCSVファイルをアップロードして、ダウンロードされるエラーファイルの内容を取得
    const { download, content } = await uploadCsvAndCaptureDownload(page, INVALID_CSV_PATH);

    await expect(page.getByText("選択中のファイル: error-data.csv")).toBeVisible(); // ファイル名の表示を確認
    await expect(page.getByText("2行目の name は文字列で入力してください。")).toBeVisible(); // バリデーションエラーを確認
    await expect(page.getByRole("columnheader", { name: "id" })).toHaveCount(0); // id列のヘッダーが表示されないことを確認
    await expect(page.getByRole("columnheader", { name: "name" })).toHaveCount(0); // name列のヘッダーが表示されないことを確認
    await expect(page.getByRole("cell", { name: "1111" })).toHaveCount(0); // idの値が表示されないことを確認
    expect(download.suggestedFilename()).toBe("error-data-errors.csv"); // ダウンロードされるファイル名を確認
    expect(content).toBe("id,name,error\r\n1111,1234,name must be string"); // ダウンロードされたファイルの内容を確認

    // メールの内容を確認
    await expect
      .poll(async () => (await listMailbox(request)).map((mail) => mail.subject))
      .toEqual(["アップロード失敗"]);

    const failureMails = await listMailbox(request);
    expect(failureMails[0]?.text).toContain("CSVアップロードのバリデーションに失敗しました。"); // 本文の内容を確認
    expect(failureMails[0]?.text).toContain("ファイル名: error-data.csv"); // 件名を確認
    expect(failureMails[0]?.text).toContain("エラー件数: 1"); // 件数を確認
  },
);
