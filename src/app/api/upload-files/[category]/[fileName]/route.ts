import { NextResponse } from "next/server";
import { readUploadedFile } from "@/lib/upload-storage";

type RouteContext = {
  params: Promise<{
    category: string;
    fileName: string;
  }>;
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isUploadCategory(value: string): value is "originals" | "errors" {
  return value === "originals" || value === "errors";
}

export async function GET(_request: Request, context: RouteContext) {
  const { category, fileName } = await context.params;

  if (!isUploadCategory(category)) {
    return NextResponse.json({ message: "不正なカテゴリです。" }, { status: 400 });
  }

  try {
    const { content } = await readUploadedFile(category, decodeURIComponent(fileName));

    return new NextResponse(content, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `inline; filename="${encodeURIComponent(fileName)}"`,
      },
    });
  } catch {
    return NextResponse.json({ message: "ファイルが見つかりません。" }, { status: 404 });
  }
}
