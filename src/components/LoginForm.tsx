"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { authenticate } from "@/lib/auth";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // フォームの送信処理
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const result = authenticate(email, password);

    if (!result.success) {
      setErrorMessage(result.message);
      return;
    }

    setErrorMessage("");
    router.push(`/dashboard?user=${encodeURIComponent(result.user.name)}`);
  };

  return (
    <form className="stack" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="email">メールアドレス</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="password">パスワード</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </div>

      <p className="error" aria-live="polite" data-testid="login-error">
        {errorMessage}
      </p>

      <button type="submit">ログイン</button>
    </form>
  );
}
