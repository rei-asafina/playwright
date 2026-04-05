import { NextResponse } from "next/server";
import { sendUploadResultEmail, type UploadMailPayload } from "@/lib/mail";

// APIルートはデフォルトで静的に最適化されるため、リクエストごとに動的に処理するよう指定
function isUploadMailPayload(value: unknown): value is UploadMailPayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const payload = value as Record<string, unknown>;

  return (
    (payload.status === "success" || payload.status === "failure") &&
    typeof payload.fileName === "string"
  );
}

// APIルートはデフォルトで静的に最適化されるため、リクエストごとに動的に処理するよう指定
export async function POST(request: Request) {
  try {
    const payload = await request.json();

    if (!isUploadMailPayload(payload)) {
      return NextResponse.json({ message: "リクエストが不正です。" }, { status: 400 });
    }

    await sendUploadResultEmail(payload);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "メール送信に失敗しました。",
      },
      { status: 500 },
    );
  }
}
