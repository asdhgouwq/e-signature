import { useEffect } from "react";

interface ToastProps {
  message: string;
  type?: "default" | "success" | "error";
  onClose: () => void;
}

export default function Toast({ message, type = "default", onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  const bgColor =
    type === "success"
      ? "bg-emerald-500"
      : type === "error"
        ? "bg-red-500"
        : "bg-slate-800";

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
      <div
        className={`${bgColor} text-white px-6 py-3 rounded-full text-sm font-medium shadow-lg whitespace-nowrap`}
      >
        {message}
      </div>
    </div>
  );
}
