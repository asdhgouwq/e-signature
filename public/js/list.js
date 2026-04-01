/**
 * list.js - 서명 목록 페이지 로직 (관리자 인증 + 다운로드 기능)
 */

// ─── 요소 참조 ──────────────────────────────────────────────────
const grid            = document.getElementById("signatures-grid");
const spinner         = document.getElementById("spinner");
const emptyState      = document.getElementById("empty-state");
const countBadge      = document.getElementById("count-badge");
const toast           = document.getElementById("toast");
const loginOverlay    = document.getElementById("login-overlay");
const adminPwInput    = document.getElementById("admin-password");
const btnLogin        = document.getElementById("btn-login");
const loginError      = document.getElementById("login-error");
const btnLogout       = document.getElementById("btn-logout");
const btnLoginClose   = document.getElementById("btn-login-close");

// 다운로드 툴바 요소
const downloadToolbar = document.getElementById("download-toolbar");
const selectAllChk    = document.getElementById("select-all");
const selectedCount   = document.getElementById("selected-count");
const btnDownloadSel  = document.getElementById("btn-download-sel");
const btnDownloadAll  = document.getElementById("btn-download-all");

// ─── 전역 서명 데이터 (다운로드에 활용) ──────────────────────────
/** @type {{ id: string, name: string, imageData: string, createdAt: string }[]} */
let allSignatures = [];

// ─── 토큰 관리 ──────────────────────────────────────────────────
const TOKEN_KEY = "admin_token";
const getToken   = () => sessionStorage.getItem(TOKEN_KEY);
const saveToken  = (t) => sessionStorage.setItem(TOKEN_KEY, t);
const clearToken = () => sessionStorage.removeItem(TOKEN_KEY);

function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  };
}

// ─── 로그인 모달 ─────────────────────────────────────────────────
function showLoginModal() {
  loginOverlay.style.display = "flex";
  btnLogout.style.display    = "none";
  adminPwInput.value         = "";
  loginError.style.display   = "none";
  setTimeout(() => adminPwInput.focus(), 100);
}

function hideLoginModal() {
  loginOverlay.style.display = "none";
  btnLogout.style.display    = "block";
}

// ─── 토스트 ──────────────────────────────────────────────────────
let toastTimer;
function showToast(message, type = "default") {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.className   = `toast ${type} show`;
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3000);
}

// ─── 날짜 포맷 ───────────────────────────────────────────────────
function formatDate(isoString) {
  return new Date(isoString).toLocaleString("ko-KR", {
    year: "numeric", month: "long", day: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  });
}

// ─── XSS 방지 ────────────────────────────────────────────────────
function escapeHtml(str) {
  const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
  return str.replace(/[&<>"']/g, (m) => map[m]);
}

// ─── 선택 상태 업데이트 ───────────────────────────────────────────
function updateSelectionState() {
  const checkboxes = grid.querySelectorAll(".sig-checkbox");
  const checked    = grid.querySelectorAll(".sig-checkbox:checked");
  const count      = checked.length;

  selectedCount.textContent   = `${count}개 선택됨`;
  btnDownloadSel.disabled     = count === 0;
  btnDownloadSel.textContent  = count > 0 ? `⬇️ 선택 다운로드 (${count})` : "⬇️ 선택 다운로드";

  // 전체 선택 체크박스 상태 동기화
  if (checkboxes.length === 0) {
    selectAllChk.checked       = false;
    selectAllChk.indeterminate = false;
  } else if (count === 0) {
    selectAllChk.checked       = false;
    selectAllChk.indeterminate = false;
  } else if (count === checkboxes.length) {
    selectAllChk.checked       = true;
    selectAllChk.indeterminate = false;
  } else {
    selectAllChk.checked       = false;
    selectAllChk.indeterminate = true;
  }
}

// ─── 이미지 다운로드 (단건) ───────────────────────────────────────
function downloadImage(name, imageData) {
  // 파일명에 사용할 수 없는 문자 제거
  const safeName = name.replace(/[\\/:*?"<>|]/g, "_");
  const link     = document.createElement("a");
  link.href      = imageData;
  link.download  = `${safeName}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ─── 다중 다운로드 (순차, 브라우저 팝업 차단 방지) ──────────────
async function downloadMultiple(items) {
  if (items.length === 0) return;

  showToast(`⬇️ ${items.length}개 파일 다운로드 중...`, "default");

  for (let i = 0; i < items.length; i++) {
    downloadImage(items[i].name, items[i].imageData);
    // 브라우저가 연속 다운로드를 차단하지 않도록 300ms 간격
    if (i < items.length - 1) {
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  showToast(`✅ ${items.length}개 파일 다운로드 완료!`, "success");
}

// ─── 서명 카드 생성 ──────────────────────────────────────────────
function createCard(sig) {
  const card = document.createElement("div");
  card.className  = "sig-card";
  card.dataset.id = sig.id;

  card.innerHTML = `
    <!-- 체크박스 -->
    <label class="sig-check-label" title="선택">
      <input type="checkbox" class="sig-checkbox" data-id="${sig.id}" />
    </label>
    <!-- 서명 썸네일 -->
    <img
      class="sig-thumbnail"
      src="${sig.imageData}"
      alt="${escapeHtml(sig.name)}의 서명 이미지"
      loading="lazy"
    />
    <!-- 이름 + 날짜 -->
    <div class="sig-info">
      <div class="sig-name">👤 ${escapeHtml(sig.name)}</div>
      <div class="sig-date">🕐 ${formatDate(sig.createdAt)}</div>
    </div>
    <!-- 버튼 그룹 -->
    <div class="sig-actions">
      <button class="btn btn-download-single" data-id="${sig.id}" title="이 서명 다운로드">
        ⬇️
      </button>
      <button class="btn btn-danger" data-id="${sig.id}" title="이 서명 삭제">
        🗑️ 삭제
      </button>
    </div>
  `;

  // 카드 클릭 시 체크박스 토글 (체크박스·버튼 자체 클릭 제외)
  card.addEventListener("click", (e) => {
    if (e.target.closest(".sig-check-label") ||
        e.target.closest(".sig-actions")) return;
    const chk = card.querySelector(".sig-checkbox");
    chk.checked = !chk.checked;
    updateSelectionState();
  });

  // 체크박스 change
  card.querySelector(".sig-checkbox").addEventListener("change", updateSelectionState);

  return card;
}

// ─── 서명 목록 불러오기 ──────────────────────────────────────────
async function loadSignatures() {
  spinner.style.display      = "block";
  grid.style.display         = "none";
  emptyState.style.display   = "none";
  downloadToolbar.style.display = "none";

  try {
    const res = await fetch("/api/signatures", { headers: authHeaders() });

    if (res.status === 401) {
      clearToken();
      showLoginModal();
      spinner.style.display = "none";
      return;
    }

    const result = await res.json();
    if (!result.success) throw new Error(result.message);

    allSignatures = result.data;
    countBadge.textContent = allSignatures.length;
    spinner.style.display  = "none";

    if (allSignatures.length === 0) {
      emptyState.style.display = "block";
    } else {
      grid.innerHTML = "";
      allSignatures.forEach((sig) => grid.appendChild(createCard(sig)));
      grid.style.display           = "grid";
      downloadToolbar.style.display = "flex";
      updateSelectionState();
    }
  } catch (err) {
    console.error("서명 목록 로드 오류:", err);
    spinner.style.display = "none";
    showToast("❌ 서명 목록을 불러오지 못했습니다.", "error");
  }
}

// ─── 서명 삭제 ───────────────────────────────────────────────────
async function deleteSignature(id) {
  if (!confirm("이 서명을 삭제하시겠습니까?")) return;

  try {
    const res = await fetch(`/api/signatures/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });

    if (res.status === 401) { clearToken(); showLoginModal(); return; }

    const result = await res.json();
    if (!result.success) throw new Error(result.message);

    // allSignatures에서도 제거
    allSignatures = allSignatures.filter((s) => s.id !== id);

    const card = grid.querySelector(`[data-id="${id}"]`);
    if (card) {
      card.style.transition = "opacity 0.3s, transform 0.3s";
      card.style.opacity    = "0";
      card.style.transform  = "translateX(20px)";
      setTimeout(() => {
        card.remove();
        const remaining = grid.querySelectorAll(".sig-card").length;
        countBadge.textContent = remaining;
        if (remaining === 0) {
          grid.style.display            = "none";
          emptyState.style.display      = "block";
          downloadToolbar.style.display = "none";
        } else {
          updateSelectionState();
        }
      }, 300);
    }

    showToast("🗑️ 서명이 삭제되었습니다.", "success");
  } catch (err) {
    console.error("서명 삭제 오류:", err);
    showToast("❌ 삭제에 실패했습니다.", "error");
  }
}

// ─── 로그인 처리 ─────────────────────────────────────────────────
async function handleLogin() {
  const password = adminPwInput.value.trim();
  if (!password) {
    loginError.textContent   = "❌ 비밀번호를 입력해주세요.";
    loginError.style.display = "block";
    adminPwInput.focus();
    return;
  }

  btnLogin.disabled    = true;
  btnLogin.textContent = "확인 중...";

  try {
    const res    = await fetch("/api/login", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ password }),
    });
    const result = await res.json();

    if (result.success) {
      saveToken(result.token);
      hideLoginModal();
      loadSignatures();
    } else {
      loginError.textContent   = "❌ 비밀번호가 올바르지 않습니다.";
      loginError.style.display = "block";
      adminPwInput.select();
    }
  } catch (err) {
    loginError.textContent   = "❌ 서버 연결에 실패했습니다.";
    loginError.style.display = "block";
  } finally {
    btnLogin.disabled    = false;
    btnLogin.textContent = "🔑 로그인";
  }
}

// ─── 로그아웃 처리 ────────────────────────────────────────────────
async function handleLogout() {
  try {
    await fetch("/api/logout", { method: "POST", headers: authHeaders() });
  } catch (_) {}
  clearToken();
  allSignatures          = [];
  grid.innerHTML         = "";
  countBadge.textContent = "0";
  downloadToolbar.style.display = "none";
  showLoginModal();
  showToast("👋 로그아웃 되었습니다.", "default");
}

// ─── 이벤트 리스너 ───────────────────────────────────────────────

// 전체 선택 체크박스
selectAllChk.addEventListener("change", () => {
  grid.querySelectorAll(".sig-checkbox").forEach((chk) => {
    chk.checked = selectAllChk.checked;
  });
  updateSelectionState();
});

// 선택 다운로드
btnDownloadSel.addEventListener("click", () => {
  const checkedIds = [...grid.querySelectorAll(".sig-checkbox:checked")]
    .map((chk) => chk.dataset.id);
  const items = allSignatures.filter((s) => checkedIds.includes(s.id));
  downloadMultiple(items);
});

// 전체 다운로드
btnDownloadAll.addEventListener("click", () => {
  downloadMultiple(allSignatures);
});

// 그리드 이벤트 위임 (삭제 + 단건 다운로드)
grid.addEventListener("click", (e) => {
  // 삭제
  const delBtn = e.target.closest(".btn-danger");
  if (delBtn) { deleteSignature(delBtn.dataset.id); return; }

  // 단건 다운로드
  const dlBtn = e.target.closest(".btn-download-single");
  if (dlBtn) {
    const sig = allSignatures.find((s) => s.id === dlBtn.dataset.id);
    if (sig) {
      downloadImage(sig.name, sig.imageData);
      showToast(`⬇️ ${sig.name} 다운로드 중...`, "default");
    }
    return;
  }
});

// X 버튼으로 닫기
btnLoginClose.addEventListener("click", () => {
  loginOverlay.style.display = "none";
});

// 오버레이 바깥 클릭으로 닫기 (모달 내부 클릭은 무시)
loginOverlay.addEventListener("click", (e) => {
  if (!e.target.closest("#login-modal")) {
    loginOverlay.style.display = "none";
  }
});

// 로그인 버튼 & Enter 키
btnLogin.addEventListener("click", handleLogin);
adminPwInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") handleLogin();
  loginError.style.display = "none";
});

// 로그아웃 버튼
btnLogout.addEventListener("click", handleLogout);

// ─── 초기화 ──────────────────────────────────────────────────────
if (getToken()) {
  hideLoginModal();
  loadSignatures();
} else {
  showLoginModal();
}
