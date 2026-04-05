type SendMailOptions = {
  from: string;
  to: string;
  subject: string;
  text: string;
};

type Transporter = {
  sendMail(mailOptions: SendMailOptions): Promise<unknown>;
};

type MailTransportOptions = {
  host: string;
  port: number;
  secure: boolean;
  tls: {
    rejectUnauthorized: boolean;
  };
};

const nodemailer = require("nodemailer") as {
  createTransport(options: MailTransportOptions): Transporter;
};

export type UploadMailStatus = "success" | "failure";

// CSVアップロードの結果をメールで通知するためのペイロードの型定義
export type UploadMailPayload = {
  status: UploadMailStatus;
  fileName: string;
  recordCount?: number;
  errorCount?: number;
  errorMessage?: string;
};

const DEFAULT_SMTP_PORT = 2525;
const SMTP_HOST = process.env.SMTP_HOST ?? "127.0.0.1";
const SMTP_PORT = parseSmtpPort(process.env.SMTP_PORT);
const UPLOAD_MAIL_FROM = process.env.UPLOAD_MAIL_FROM ?? "no-reply@example.local";
const UPLOAD_MAIL_TO = process.env.UPLOAD_MAIL_TO ?? "admin@example.local";

let transporter: Transporter | null = null;

// SMTPポートの環境変数を安全にパースする関数
function parseSmtpPort(value: string | undefined) {
  const port = Number(value ?? DEFAULT_SMTP_PORT);

  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    return DEFAULT_SMTP_PORT;
  }

  return port;
}

function getTransporter(): Transporter {
  if (transporter) {
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: false,
    tls: {
      rejectUnauthorized: false,
    },
  });

  return transporter;
}

function buildUploadResultText(payload: UploadMailPayload) {
  if (payload.status === "success") {
    return [
      "CSVアップロードのバリデーションに成功しました。",
      `ファイル名: ${payload.fileName}`,
      `データ行数: ${payload.recordCount ?? 0}`,
    ].join("\n");
  }

  return [
    "CSVアップロードのバリデーションに失敗しました。",
    `ファイル名: ${payload.fileName}`,
    ...(typeof payload.errorCount === "number" ? [`エラー件数: ${payload.errorCount}`] : []),
    ...(payload.errorMessage ? [`エラー内容: ${payload.errorMessage}`] : []),
  ].join("\n");
}

export async function sendUploadResultEmail(payload: UploadMailPayload) {
  const subject = payload.status === "success" ? "アップロード成功" : "アップロード失敗";
  const text = buildUploadResultText(payload);

  await getTransporter().sendMail({
    from: UPLOAD_MAIL_FROM,
    to: UPLOAD_MAIL_TO,
    subject,
    text,
  });
}
