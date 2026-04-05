import { mkdir, readdir, readFile, rm } from "node:fs/promises";
import path from "node:path";

export type StoredMail = {
  id: string;
  subject: string;
  text: string;
  html: string | null;
  from: string;
  to: string;
  date: string;
};

const MAILBOX_DIR = path.join(process.cwd(), ".mailbox", "messages");

async function ensureMailboxDir() {
  await mkdir(MAILBOX_DIR, { recursive: true });
}

// テスト用のメールをローカルに保存する関数。
// 実際のアプリでは、メールはSMTPサーバーなどを通じて送信されることが多いですが、
// ここではシンプルにファイルとして保存する形にしています。
export async function listStoredMails(): Promise<StoredMail[]> {
  await ensureMailboxDir();
  const fileNames = (await readdir(MAILBOX_DIR))
    .filter((fileName) => fileName.endsWith(".json"))
    .sort();

  const mails = await Promise.all(
    fileNames.map(async (fileName) => {
      const filePath = path.join(MAILBOX_DIR, fileName);
      const content = await readFile(filePath, "utf-8");

      return JSON.parse(content) as StoredMail;
    }),
  );

  return mails.sort((left, right) => left.date.localeCompare(right.date));
}

// テスト用のメールを削除する関数。
export async function clearStoredMails() {
  await ensureMailboxDir();
  const fileNames = await readdir(MAILBOX_DIR);

  await Promise.all(
    fileNames.map((fileName) => rm(path.join(MAILBOX_DIR, fileName), { force: true })),
  );
}
