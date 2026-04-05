const http = require("node:http");
const path = require("node:path");
const { mkdir, writeFile } = require("node:fs/promises");
const { SMTPServer } = require("smtp-server");
const { simpleParser } = require("mailparser");

const SMTP_PORT = Number(process.env.SMTP_PORT ?? 2525);
const HEALTH_PORT = Number(process.env.MAIL_HEALTH_PORT ?? 4025);
const MAILBOX_DIR = path.join(process.cwd(), ".mailbox", "messages");

// ローカルのディレクトリにメールを保存するための関数。ディレクトリが存在しない場合は作成する。
async function ensureMailboxDir() {
  await mkdir(MAILBOX_DIR, { recursive: true });
}

// 受信したメールをローカルのファイルに保存する関数。メールの内容をJSON形式で保存する。
async function storeMail(parsedMail) {
  await ensureMailboxDir();

  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const filePath = path.join(MAILBOX_DIR, `${id}.json`);
  const record = {
    id,
    subject: parsedMail.subject ?? "",
    text: parsedMail.text ?? "",
    html: typeof parsedMail.html === "string" ? parsedMail.html : null,
    from: parsedMail.from?.text ?? "",
    to: parsedMail.to?.text ?? "",
    date: parsedMail.date?.toISOString() ?? new Date().toISOString(),
  };

  await writeFile(filePath, JSON.stringify(record, null, 2), "utf-8");
}

// SMTPサーバーの設定。認証やSTARTTLSは無効にして、受信したメールをsimpleParserで解析し、storeMail関数で保存する。
const smtpServer = new SMTPServer({
  authOptional: true,
  disabledCommands: ["AUTH", "STARTTLS"],
  onData(stream, _session, callback) {
    simpleParser(stream)
      .then(async (parsedMail) => {
        await storeMail(parsedMail);
        callback();
      })
      .catch((error) => callback(error));
  },
});

// ヘルスチェック用のHTTPサーバー。/healthエンドポイントにアクセスすると、JSON形式でステータスを返す。
// それ以外のパスにアクセスした場合は404 Not Foundを返す。
const healthServer = http.createServer((request, response) => {
  if (request.url === "/health") {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ status: "ok" }));
    return;
  }

  response.writeHead(404, { "Content-Type": "text/plain" });
  response.end("Not Found");
});

// サーバーを起動する関数。指定したポートでサーバーをリッスンし、エラーが発生した場合はPromiseを拒否する。
function startServer(server, port, name) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => {
      server.off("error", reject);
      console.log(`${name} listening on 127.0.0.1:${port}`);
      resolve();
    });
  });
}

// サーバーを起動する関数。SMTPサーバーとヘルスチェックサーバーの両方を起動する。
function closeServer(server) {
  return new Promise((resolve) => {
    server.close(() => resolve());
  });
}

// サーバーをシャットダウンする関数。両方のサーバーを閉じてからプロセスを終了する。
async function shutdown() {
  await Promise.allSettled([
    closeServer(smtpServer),
    closeServer(healthServer),
  ]);
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

Promise.all([
  ensureMailboxDir(),
  startServer(smtpServer, SMTP_PORT, "SMTP server"),
  startServer(healthServer, HEALTH_PORT, "Mail health server"),
]).catch((error) => {
  console.error("Failed to start mail server", error);
  process.exit(1);
});
