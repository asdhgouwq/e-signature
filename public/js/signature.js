/**
 * signature.js - 서명 캔버스 로직
 *
 * 역할:
 *  - Canvas API를 사용해 마우스/터치 드로잉 구현
 *  - 서명 완료 후 Base64 이미지로 변환
 *  - 서버로 이름 + 서명 데이터 전송
 */

// ─── 요소 참조 ──────────────────────────────────────────────────
const canvas    = document.getElementById("signature-canvas");
const ctx       = canvas.getContext("2d"); // 2D 드로잉 컨텍스트
const wrapper   = document.getElementById("canvas-wrapper");
const hint      = document.getElementById("canvas-hint");
const btnClear  = document.getElementById("btn-clear");
const btnSubmit = document.getElementById("btn-submit");
const nameInput = document.getElementById("signer-name");

// ─── 상태 변수 ──────────────────────────────────────────────────
let isDrawing = false;    // 현재 그리는 중인지 여부
let hasDrawn  = false;    // 최소 한 획이라도 그렸는지 여부

// ─── 캔버스 크기 설정 ────────────────────────────────────────────
// CSS 크기와 실제 픽셀 크기를 맞춰 고해상도(Retina) 디스플레이에서도 선명하게
function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr  = window.devicePixelRatio || 1;

  // 이전에 그린 내용을 임시로 저장
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  canvas.width  = rect.width  * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  // 캔버스 기본 스타일 설정
  ctx.strokeStyle = "#1e293b"; // 선 색상 (진한 네이비)
  ctx.lineWidth   = 2.5;       // 선 굵기
  ctx.lineCap     = "round";   // 선 끝을 둥글게
  ctx.lineJoin    = "round";   // 꺾이는 부분도 둥글게

  // 저장된 이미지 복원
  ctx.putImageData(imageData, 0, 0);
}

// ─── 이벤트 좌표 추출 ────────────────────────────────────────────
// 마우스 이벤트와 터치 이벤트 모두에서 캔버스 내부 상대 좌표를 반환
function getPos(e) {
  const rect = canvas.getBoundingClientRect();
  if (e.touches) {
    // 터치 이벤트 처리
    const touch = e.touches[0] || e.changedTouches[0];
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    };
  }
  // 마우스 이벤트 처리
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  };
}

// ─── 드로잉 함수 ─────────────────────────────────────────────────
function startDraw(e) {
  e.preventDefault();
  isDrawing = true;
  const pos = getPos(e);
  ctx.beginPath();
  ctx.moveTo(pos.x, pos.y); // 시작점 이동 (선이 그려지지 않음)
}

function draw(e) {
  e.preventDefault();
  if (!isDrawing) return;

  const pos = getPos(e);
  ctx.lineTo(pos.x, pos.y); // 이전 점에서 현재 점까지 선 경로 추가
  ctx.stroke();              // 실제로 선 그리기

  // 처음 그리는 순간 안내 문구 숨기기
  if (!hasDrawn) {
    hasDrawn = true;
    hint.style.opacity = "0";
    hint.style.transition = "opacity 0.3s";
  }
}

function endDraw(e) {
  e.preventDefault();
  isDrawing = false;
}

// ─── 이벤트 리스너 등록 ──────────────────────────────────────────

// 마우스 이벤트
canvas.addEventListener("mousedown",  startDraw);
canvas.addEventListener("mousemove",  draw);
canvas.addEventListener("mouseup",    endDraw);
canvas.addEventListener("mouseleave", endDraw); // 캔버스 밖으로 나가도 종료

// 터치 이벤트 (모바일 지원)
canvas.addEventListener("touchstart", startDraw, { passive: false });
canvas.addEventListener("touchmove",  draw,      { passive: false });
canvas.addEventListener("touchend",   endDraw,   { passive: false });

// 창 크기 변경시 캔버스 재설정
window.addEventListener("resize", resizeCanvas);

// ─── 지우기 버튼 ─────────────────────────────────────────────────
btnClear.addEventListener("click", () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height); // 캔버스 전체 지우기
  hasDrawn = false;
  hint.style.opacity = "1"; // 안내 문구 다시 표시
});

// ─── 토스트 알림 함수 ─────────────────────────────────────────────
const toast = document.getElementById("toast");
let toastTimer;

function showToast(message, type = "default") {
  clearTimeout(toastTimer);
  toast.textContent  = message;
  toast.className    = `toast ${type} show`;
  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

// ─── 제출 버튼 ────────────────────────────────────────────────────
btnSubmit.addEventListener("click", async () => {
  // 1) 이름 검사
  const name = nameInput.value.trim();
  if (!name) {
    showToast("⚠️ 이름을 입력해주세요.", "error");
    nameInput.focus();
    return;
  }

  // 2) 서명 검사
  if (!hasDrawn) {
    showToast("⚠️ 서명을 먼저 그려주세요.", "error");
    return;
  }

  // 3) 서명 이미지를 Base64 문자열로 추출
  // "image/png" → png 형식으로 캔버스 내용을 Data URL로 변환
  const imageData = canvas.toDataURL("image/png");

  // 4) 버튼 비활성화 (중복 제출 방지)
  btnSubmit.disabled = true;
  btnSubmit.textContent = "전송 중...";

  try {
    // 5) 서버에 POST 요청
    const response = await fetch("/api/signatures", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, imageData }),
    });

    const result = await response.json();

    if (result.success) {
      // 성공 처리
      showToast(`✅ ${name}님의 서명이 제출되었습니다!`, "success");
      // 폼 초기화
      nameInput.value = "";
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      hasDrawn = false;
      hint.style.opacity = "1";
    } else {
      // 서버에서 반환한 오류 메시지 표시
      showToast(`❌ ${result.message}`, "error");
    }
  } catch (err) {
    // 네트워크 오류 등
    console.error("서명 제출 오류:", err);
    showToast("❌ 서버 연결에 실패했습니다. 서버가 실행 중인지 확인하세요.", "error");
  } finally {
    // 버튼 복구
    btnSubmit.disabled = false;
    btnSubmit.textContent = "✅ 서명 제출";
  }
});

// ─── 초기화 ───────────────────────────────────────────────────────
// 페이지 로드시 캔버스 크기 설정
resizeCanvas();
