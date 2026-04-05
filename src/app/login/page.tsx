import { LoginForm } from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <main>
      <section className="panel stack" aria-labelledby="login-heading">
        <h1 id="login-heading">ログイン</h1>
        <p className="muted">固定値の認証情報でログイン成功・失敗を切り替えます。</p>
        <LoginForm />
      </section>
    </main>
  );
}
