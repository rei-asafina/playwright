"use client";

import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  return (
    <main>
      <section className="panel stack" aria-labelledby="home-heading">
        <h1 id="home-heading">ホーム</h1>
        <p className="muted">Playwrightで画面表示・画面遷移・入力結果を確認するための最小アプリです。</p>
        <button type="button" onClick={() => router.push("/login")}>ログインへ</button>
      </section>
    </main>
  );
}
