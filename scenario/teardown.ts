import { rm } from "node:fs/promises";
import path from "node:path";

async function cleanupDirectory(relativeDirPath: string) {
  const targetPath = path.join(process.cwd(), relativeDirPath);

  await rm(targetPath, { recursive: true, force: true });
}

async function globalTeardown() {
  await cleanupDirectory(".uploads");
}

export default globalTeardown;
