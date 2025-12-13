"use client";

import { useEffect, useState } from "react";
import { Dashboard } from "@/components/dashboard";
import { Toaster } from "@/components/ui/sonner";
import { auth, googleProvider } from "@/lib/firebase";
import { signInWithPopup, onAuthStateChanged, User, signOut } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, AlertCircle } from "lucide-react";

const ALLOWED_EMAILS = [
  "ponta10sakura@gmail.com",
  "ryo.01bass@gmail.com",
  "toyano.mental@gmail.com"
];

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    if (!auth) return;
    try {
      setError(null);
      console.log("Starting Google Login...");
      await signInWithPopup(auth, googleProvider);
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string };
      console.error("Login Error Details:", err);
      console.error("Error Code:", err.code);
      console.error("Error Message:", err.message);
      setError(`ログインに失敗しました: ${err.message} (${err.code})`);
    }
  };

  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-gray-800">ToyasaPo Login</CardTitle>
            <CardDescription>とやのメンタルクリニック メール返信アシスタント</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800 mb-2">
              <p>指定されたGoogleアカウントでのみログイン可能です。</p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            )}

            <Button onClick={handleLogin} className="w-full py-6 flex items-center justify-center gap-2 text-base">
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Googleでログイン
            </Button>
          </CardContent>
        </Card>
        <Toaster />
      </div>
    );
  }

  // Logged in but not allowed
  if (user.email && !ALLOWED_EMAILS.includes(user.email)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md border-red-200">
          <CardHeader className="text-center">
            <CardTitle className="text-xl font-bold text-red-600">アクセス権限がありません</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 text-center">
            <p className="text-gray-600">
              ログインしたアカウント ({user.email}) はこのアプリケーションへのアクセスが許可されていません。
            </p>
            <Button onClick={handleLogout} variant="outline" className="w-full">
              ログアウトして別のアカウントで試す
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Allowed
  return (
    <main className="min-h-screen bg-background">
      <Dashboard user={user} onLogout={handleLogout} />
      <Toaster />
    </main>
  );
}
