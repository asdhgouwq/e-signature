import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import type { Signature } from "../types";
import LoginModal from "./LoginModal";
import Toast from "./Toast";

const TOKEN_KEY = "admin_token";

export default function ListPage() {
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_KEY));
  const [showLogin, setShowLogin] = useState(!token);
  const [toast, setToast] = useState<{ message: string; type: "default" | "success" | "error" } | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const showToast = (message: string, type: "default" | "success" | "error" = "default") => {
    setToast({ message, type });
  };

  const loadSignatures = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("signatures")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSignatures(data || []);
    } catch {
      showToast("❌ 서명 목록을 불러오지 못했습니다.", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      loadSignatures();
    } else {
      setLoading(false);
    }
  }, [token, loadSignatures]);

  const handleLogin = (newToken: string) => {
    sessionStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
    setShowLogin(false);
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch { /* ignore */ }
    sessionStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setSignatures([]);
    setShowLogin(true);
    showToast("👋 로그아웃 되었습니다.");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("이 서명을 삭제하시겠습니까?")) return;

    try {
      const { error } = await supabase.from("signatures").delete().eq("id", id);
      if (error) throw error;

      setSignatures((prev) => prev.filter((s) => s.id !== id));
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      showToast("🗑️ 서명이 삭제되었습니다.", "success");
    } catch {
      showToast("❌ 삭제에 실패했습니다.", "error");
    }
  };

  const downloadImage = (name: string, imageData: string) => {
    const safeName = name.replace(/[\\/:*?"<>|]/g, "_");
    const link = document.createElement("a");
    link.href = imageData;
    link.download = `${safeName}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadMultiple = async (items: Signature[]) => {
    if (items.length === 0) return;
    showToast(`⬇️ ${items.length}개 파일 다운로드 중...`);

    for (let i = 0; i < items.length; i++) {
      downloadImage(items[i].name, items[i].image_data);
      if (i < items.length - 1) {
        await new Promise((r) => setTimeout(r, 300));
      }
    }
    showToast(`✅ ${items.length}개 파일 다운로드 완료!`, "success");
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === signatures.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(signatures.map((s) => s.id)));
    }
  };

  const formatDate = (isoString: string) =>
    new Date(isoString).toLocaleString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

  // 로그인 모달
  if (showLogin) {
    return (
      <>
        <main className="bg-white rounded-2xl shadow-md p-7 w-full max-w-[680px] max-[480px]:p-5">
          <p className="text-lg font-bold mb-4 flex items-center">
            제출된 서명
            <span className="ml-2 bg-indigo-50 text-indigo-600 rounded-full px-2.5 py-0.5 text-xs font-semibold">0</span>
          </p>
          <div className="text-center py-12 text-slate-500">
            <div className="text-5xl mb-3">🔐</div>
            <p>관리자 인증이 필요합니다.</p>
            <button
              onClick={() => setShowLogin(true)}
              className="mt-4 px-6 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-all"
            >
              🔑 로그인
            </button>
          </div>
        </main>
        <LoginModal onLogin={handleLogin} onClose={() => setShowLogin(false)} />
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </>
    );
  }

  return (
    <main className="bg-white rounded-2xl shadow-md p-7 w-full max-w-[680px] max-[480px]:p-5 relative">
      {/* 로그아웃 */}
      <button
        onClick={handleLogout}
        className="absolute top-4 right-4 px-3.5 py-1.5 bg-transparent text-slate-500 border-[1.5px] border-slate-200 rounded-lg text-xs font-medium hover:bg-red-500 hover:border-red-500 hover:text-white transition-all"
      >
        🔓 로그아웃
      </button>

      <p className="text-lg font-bold mb-4 flex items-center">
        제출된 서명
        <span className="ml-2 bg-indigo-50 text-indigo-600 rounded-full px-2.5 py-0.5 text-xs font-semibold">
          {signatures.length}
        </span>
      </p>

      {/* 다운로드 툴바 */}
      {signatures.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap bg-indigo-50 border-[1.5px] border-indigo-200 rounded-lg px-3.5 py-2.5 mb-3.5 text-sm">
          <label className="inline-flex items-center gap-1.5 font-semibold text-indigo-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={selected.size === signatures.length && signatures.length > 0}
              ref={(el) => {
                if (el) el.indeterminate = selected.size > 0 && selected.size < signatures.length;
              }}
              onChange={toggleSelectAll}
              className="w-4 h-4 accent-indigo-600 cursor-pointer"
            />
            <span>전체 선택</span>
          </label>
          <span className="text-slate-500 text-xs flex-1">{selected.size}개 선택됨</span>
          <div className="flex gap-2 ml-auto">
            <button
              onClick={() => {
                const items = signatures.filter((s) => selected.has(s.id));
                downloadMultiple(items);
              }}
              disabled={selected.size === 0}
              className="px-3.5 py-1.5 bg-indigo-50 text-indigo-600 border-[1.5px] border-indigo-600 rounded-lg text-xs font-semibold hover:bg-indigo-600 hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ⬇️ 선택 다운로드{selected.size > 0 && ` (${selected.size})`}
            </button>
            <button
              onClick={() => downloadMultiple(signatures)}
              className="px-3.5 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-all"
            >
              📦 전체 다운로드
            </button>
          </div>
        </div>
      )}

      {/* 로딩 */}
      {loading && (
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 border-3 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      )}

      {/* 서명 목록 */}
      {!loading && signatures.length > 0 && (
        <div className="grid gap-4 mt-2">
          {signatures.map((sig) => (
            <div
              key={sig.id}
              onClick={(e) => {
                if ((e.target as HTMLElement).closest(".sig-actions") || (e.target as HTMLElement).closest("label")) return;
                toggleSelect(sig.id);
              }}
              className={`flex items-center gap-4 p-4 border-[1.5px] rounded-xl transition-all cursor-pointer hover:shadow-md hover:-translate-y-0.5 max-[480px]:flex-col max-[480px]:items-start ${
                selected.has(sig.id)
                  ? "bg-indigo-50 border-indigo-600 shadow-[0_0_0_2px_rgba(79,70,229,0.15)]"
                  : "bg-white border-slate-200"
              }`}
            >
              {/* 체크박스 */}
              <label className="flex items-center shrink-0 cursor-pointer" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={selected.has(sig.id)}
                  onChange={() => toggleSelect(sig.id)}
                  className="w-[18px] h-[18px] accent-indigo-600 cursor-pointer"
                />
              </label>

              {/* 서명 이미지 */}
              <img
                src={sig.image_data}
                alt={`${sig.name}의 서명`}
                loading="lazy"
                className="w-[100px] h-[60px] object-contain rounded-lg border border-slate-200 bg-gray-50 shrink-0 max-[480px]:w-full max-[480px]:h-[90px]"
              />

              {/* 정보 */}
              <div className="flex-1 min-w-0">
                <div className="text-base font-semibold mb-1 truncate">👤 {sig.name}</div>
                <div className="text-xs text-slate-500">🕐 {formatDate(sig.created_at)}</div>
              </div>

              {/* 액션 버튼 */}
              <div className="sig-actions flex flex-col gap-1.5 shrink-0">
                <button
                  onClick={() => downloadImage(sig.name, sig.image_data)}
                  className="px-2.5 py-1.5 bg-transparent text-indigo-600 border-[1.5px] border-indigo-600 rounded-lg text-sm hover:bg-indigo-600 hover:text-white transition-all"
                  title="다운로드"
                >
                  ⬇️
                </button>
                <button
                  onClick={() => handleDelete(sig.id)}
                  className="px-3 py-1.5 bg-transparent text-red-500 border-[1.5px] border-red-500 rounded-lg text-xs font-semibold hover:bg-red-500 hover:text-white transition-all"
                  title="삭제"
                >
                  🗑️ 삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 빈 상태 */}
      {!loading && signatures.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          <div className="text-5xl mb-3">📭</div>
          <p className="mb-4">아직 제출된 서명이 없습니다.</p>
          <a
            href="/"
            className="inline-flex px-6 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-all no-underline"
          >
            ✏️ 첫 서명 남기기
          </a>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </main>
  );
}
