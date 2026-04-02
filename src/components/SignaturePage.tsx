import { useRef, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import SignatureCanvas from "./SignatureCanvas";
import Toast from "./Toast";

export default function SignaturePage() {
  const [name, setName] = useState("");
  const [hasDrawn, setHasDrawn] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "default" | "success" | "error" } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const showToast = (message: string, type: "default" | "success" | "error" = "default") => {
    setToast({ message, type });
  };

  const handleSignatureChange = useCallback((drawn: boolean) => {
    setHasDrawn(drawn);
  }, []);

  const handleSubmit = async () => {
    if (!name.trim()) {
      showToast("⚠️ 이름을 입력해주세요.", "error");
      return;
    }
    if (!hasDrawn) {
      showToast("⚠️ 서명을 먼저 그려주세요.", "error");
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const imageData = canvas.toDataURL("image/png");
    setSubmitting(true);

    try {
      const { error } = await supabase.from("signatures").insert({
        name: name.trim(),
        image_data: imageData,
      });

      if (error) throw error;

      showToast(`✅ ${name.trim()}님의 서명이 제출되었습니다!`, "success");
      setName("");
      setHasDrawn(false);

      // 캔버스 초기화
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    } catch {
      showToast("❌ 서명 저장에 실패했습니다.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="bg-white rounded-2xl shadow-md p-7 w-full max-w-[680px] max-[480px]:p-5">
      <p className="text-lg font-bold mb-4">서명 정보 입력</p>

      {/* 이름 입력 */}
      <div className="mb-5">
        <label className="block text-sm font-semibold text-slate-800 mb-2">
          이름 <span className="text-red-500 ml-0.5">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="홍길동"
          maxLength={50}
          autoComplete="name"
          className="w-full px-3.5 py-3 border-[1.5px] border-slate-200 rounded-lg text-base text-slate-800 bg-white outline-none transition-all focus:border-indigo-600 focus:ring-[3px] focus:ring-indigo-600/15 placeholder:text-slate-300"
        />
      </div>

      {/* 서명 캔버스 */}
      <div className="mb-5">
        <label className="block text-sm font-semibold text-slate-800 mb-2">
          서명 <span className="text-red-500 ml-0.5">*</span>
        </label>
        <SignatureCanvas onSignatureChange={handleSignatureChange} canvasRef={canvasRef} />
      </div>

      {/* 제출 버튼 */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full py-3 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? "전송 중..." : "✅ 서명 제출"}
      </button>

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </main>
  );
}
