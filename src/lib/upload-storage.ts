import { mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const UPLOAD_ROOT_DIR = path.join(process.cwd(), ".uploads");
const ORIGINAL_UPLOAD_DIR = path.join(UPLOAD_ROOT_DIR, "originals");
const ERROR_UPLOAD_DIR = path.join(UPLOAD_ROOT_DIR, "errors");

export type StoredUploadFile = {
  category: "originals" | "errors";
  storedFileName: string;
  originalFileName: string;
  filePath: string;
  downloadUrl: string;
  size: number;
  updatedAt: string;
};

async function ensureUploadDirs() {
  await Promise.all([
    mkdir(ORIGINAL_UPLOAD_DIR, { recursive: true }),
    mkdir(ERROR_UPLOAD_DIR, { recursive: true }),
  ]);
}

function sanitizeFileName(fileName: string) {
  const extension = path.extname(fileName);
  const baseName = path.basename(fileName, extension);
  const safeBaseName = baseName.replace(/[^a-zA-Z0-9-_]/g, "-").replace(/-+/g, "-") || "upload";

  return `${safeBaseName}${extension}`;
}

function createStoredFileName(fileName: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const randomSuffix = Math.random().toString(36).slice(2, 10);

  return `${timestamp}-${randomSuffix}-${sanitizeFileName(fileName)}`;
}

function buildDownloadUrl(category: StoredUploadFile["category"], storedFileName: string) {
  return `/api/upload-files/${category}/${encodeURIComponent(storedFileName)}`;
}

function extractOriginalFileName(storedFileName: string) {
  const segments = storedFileName.split("-");

  if (segments.length <= 5) {
    return storedFileName;
  }

  return segments.slice(5).join("-");
}

async function storeFile(directoryPath: string, fileName: string, content: string) {
  await ensureUploadDirs();

  const storedFileName = createStoredFileName(fileName);
  const filePath = path.join(directoryPath, storedFileName);

  await writeFile(filePath, content, "utf-8");

  return path.relative(process.cwd(), filePath);
}

export async function storeUploadedCsv(fileName: string, content: string) {
  return storeFile(ORIGINAL_UPLOAD_DIR, fileName, content);
}

export async function storeErrorCsv(fileName: string, content: string) {
  return storeFile(ERROR_UPLOAD_DIR, fileName, content);
}

export async function listUploadedFiles(): Promise<StoredUploadFile[]> {
  await ensureUploadDirs();

  const directories = [
    { category: "originals" as const, dirPath: ORIGINAL_UPLOAD_DIR },
    { category: "errors" as const, dirPath: ERROR_UPLOAD_DIR },
  ];

  const entries = await Promise.all(
    directories.map(async ({ category, dirPath }) => {
      const fileNames = await readdir(dirPath);

      return Promise.all(
        fileNames.map(async (storedFileName) => {
          const filePath = path.join(dirPath, storedFileName);
          const fileStat = await stat(filePath);

          return {
            category,
            storedFileName,
            originalFileName: extractOriginalFileName(storedFileName),
            filePath: path.relative(process.cwd(), filePath),
            downloadUrl: buildDownloadUrl(category, storedFileName),
            size: fileStat.size,
            updatedAt: fileStat.mtime.toISOString(),
          } satisfies StoredUploadFile;
        }),
      );
    }),
  );

  return entries.flat().sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export async function readUploadedFile(category: StoredUploadFile["category"], storedFileName: string) {
  await ensureUploadDirs();

  const directoryPath = category === "originals" ? ORIGINAL_UPLOAD_DIR : ERROR_UPLOAD_DIR;
  const safeName = path.basename(storedFileName);
  const filePath = path.join(directoryPath, safeName);
  const content = await readFile(filePath);

  return {
    content,
    filePath: path.relative(process.cwd(), filePath),
  };
}

export async function clearUploadedFiles() {
  await rm(UPLOAD_ROOT_DIR, { recursive: true, force: true });
  await ensureUploadDirs();
}
