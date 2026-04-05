export const VALID_EMAIL = "test@example.com";
export const VALID_PASSWORD = "password123";
export const AUTH_ERROR_MESSAGE = "メールアドレスまたはパスワードが正しくありません";

export type AuthResult =
  | {
    success: true;
    user: {
      name: string;
      email: string;
    };
  }
  | {
    success: false;
    message: string;
  };

// 簡単な認証関数。
// 実際のアプリでは、サーバーサイドで認証処理を行い、クライアントにはトークンなどを返す形になることが多いですが、
// ここではシンプルに関数内で完結させています。
export function authenticate(email: string, password: string): AuthResult {
  if (email === VALID_EMAIL && password === VALID_PASSWORD) {
    return {
      success: true,
      user: {
        name: "Test User",
        email,
      },
    };
  }

  return {
    success: false,
    message: AUTH_ERROR_MESSAGE,
  };
}
