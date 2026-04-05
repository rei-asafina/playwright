import { NextResponse } from "next/server";
import { clearStoredMails, listStoredMails } from "@/lib/mailbox";

export const dynamic = "force-dynamic";

// テスト用のメールを保存しておくAPI
export async function GET() {
  const mails = await listStoredMails();

  return NextResponse.json({ mails });
}

// テスト用のメールを削除するAPI
export async function DELETE() {
  await clearStoredMails();

  return NextResponse.json({ ok: true });
}
