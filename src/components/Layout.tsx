import { NavLink, Outlet } from "react-router-dom";

export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center px-4 py-6 pb-12">
      {/* 헤더 */}
      <header className="text-center mb-8 w-full max-w-[680px]">
        <a href="/" className="inline-flex items-center gap-2.5 text-2xl font-bold text-indigo-600 no-underline mb-1">
          <span className="text-3xl">✍️</span>
          <span>전자 서명</span>
        </a>
        <p className="text-sm text-slate-500">안전하고 간편한 디지털 서명 서비스</p>
      </header>

      {/* 탭 네비게이션 */}
      <nav className="flex gap-2 bg-indigo-50 rounded-lg p-1 w-full max-w-[680px] mb-5">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex-1 text-center py-2 px-3 rounded-md text-sm font-medium transition-all ${
              isActive
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-500 hover:bg-indigo-600 hover:text-white hover:shadow-sm"
            }`
          }
        >
          ✏️ 서명하기
        </NavLink>
        <NavLink
          to="/list"
          className={({ isActive }) =>
            `flex-1 text-center py-2 px-3 rounded-md text-sm font-medium transition-all ${
              isActive
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-500 hover:bg-indigo-600 hover:text-white hover:shadow-sm"
            }`
          }
        >
          📋 서명 목록
        </NavLink>
      </nav>

      {/* 페이지 콘텐츠 */}
      <Outlet />
    </div>
  );
}
