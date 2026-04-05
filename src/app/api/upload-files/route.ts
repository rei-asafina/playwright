import { NextResponse } from "next/server";
import { clearUploadedFiles, listUploadedFiles } from "@/lib/upload-storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const files = await listUploadedFiles();

  return NextResponse.json({ files });
}

export async function DELETE() {
  await clearUploadedFiles();

  return NextResponse.json({ ok: true });
}
