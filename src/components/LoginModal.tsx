import { useState } from "react";

interface LoginModalProps {
  onLogin: (token: string) => void;
  onClose: () => void;
}

export default function LoginModal({ onLogin, onClose }: LoginModalProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!password.trim()) {
      setError("❌ 비밀번호를 입력해주세요.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const result = await res.json();

      if (result.success) {
        onLogin(result.token);
      } else {
        setError("❌ 비밀번호가 올바르지 않습니다.");
        setPassword("");
      }
    } catch {
      setError("❌ 서버 연결에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-6 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl p-10 w-full max-w-[400px] text-center animate-slide-up-modal relative max-[480px]:p-7">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3.5 right-3.5 w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-red-100 hover:text-red-500 transition-all text-lg"
        >
          ✕
        </button>

        <div className="text-5xl mb-3">🔐</div>
        <h2 className="text-xl font-bold text-slate-800 mb-1.5">관리자 인증</h2>
        <p className="text-sm text-slate-500 mb-6">서명 목록은 관리자만 열람할 수 있습니다.</p>

        <div className="flex flex-col gap-3">
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError("");
            }}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            placeholder="비밀번호를 입력하세요"
            maxLength={100}
            autoComplete="current-password"
            autoFocus
            className="w-full px-3.5 py-3 border-[1.5px] border-slate-200 rounded-lg text-base text-slate-800 bg-white text-center tracking-widest outline-none transition-all focus:border-indigo-600 focus:ring-[3px] focus:ring-indigo-600/15 placeholder:text-slate-300 placeholder:tracking-normal"
          />

          {error && (
            <p className="text-sm text-red-500 font-medium animate-shake">{error}</p>
          )}

          <button
            type="button"
            onClick={handleLogin}
            disabled={loading}
            className="w-full py-3 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-all disabled:opacity-50"
          >
            {loading ? "확인 중..." : "🔑 로그인"}
          </button>
        </div>
      </div>
    </div>
  );
}
