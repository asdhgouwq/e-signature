/**
 * server.js - 전자 서명 웹앱의 백엔드 서버
 *
 * 역할:
 *  - 프론트엔드 HTML/CSS/JS 파일들을 정적으로 제공
 *  - 서명 데이터(이름 + 서명 이미지)를 JSON 파일에 저장
 *  - REST API를 통해 서명 목록 조회, 저장, 삭제 기능 제공
 *  - 관리자 비밀번호 인증으로 목록/삭제 API 보호
 */
const cors = require("cors");
app.use(cors());
const express = require("express"); // 웹 서버 프레임워크
const cors = require("cors"); // Cross-Origin Resource Sharing 허용
const fs = require("fs"); // 파일 시스템 접근 (Node.js 내장)
const path = require("path"); // 파일 경로 처리 (Node.js 내장)
const crypto = require("crypto"); // 토큰 생성 (Node.js 내장)
const { v4: uuidv4 } = require("uuid"); // 고유 ID 생성

// ─── 관리자 비밀번호 설정 ────────────────────────────────────────────────────
// ⚠️  비밀번호를 변경하려면 아래 값을 수정하세요
const ADMIN_PASSWORD = "admin";

// 로그인된 세션 토큰을 메모리에 저장 (서버 재시작 시 초기화됨)
const validTokens = new Set();

const app = express();
const PORT = 3000;

// ─── 데이터 파일 경로 설정 ───────────────────────────────────────────────────
// signatures.json 파일이 없으면 자동으로 생성됩니다.
const DATA_FILE = path.join(__dirname, "data", "signatures.json");

// data 폴더가 없으면 생성
if (!fs.existsSync(path.join(__dirname, "data"))) {
  fs.mkdirSync(path.join(__dirname, "data"));
}

// signatures.json 파일이 없으면 빈 배열로 초기화
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2), "utf-8");
}

// ─── 미들웨어 설정 ───────────────────────────────────────────────────────────
app.use(cors()); // 모든 도메인에서의 요청 허용
app.use(express.json({ limit: "10mb" })); // JSON 요청 파싱 (Base64 이미지가 크므로 10mb로 설정)
app.use(express.static(path.join(__dirname, "public"))); // public 폴더를 정적 파일로 서빙

// ─── 유틸리티 함수 ──────────────────────────────────────────────────────────

/** signatures.json 파일에서 데이터를 읽어 배열로 반환 */
function readSignatures() {
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/** signatures 배열을 signatures.json 파일에 저장 */
function writeSignatures(signatures) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(signatures, null, 2), "utf-8");
}

// ─── 인증 미들웨어 ──────────────────────────────────────────────────────────

/**
 * Authorization: Bearer <token> 헤더를 검사합니다.
 * 토큰이 없거나 유효하지 않으면 401을 반환합니다.
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers["authorization"] || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token || !validTokens.has(token)) {
    return res.status(401).json({ success: false, message: "인증이 필요합니다." });
  }
  next();
}

// ─── 인증 API ────────────────────────────────────────────────────────────────

/**
 * POST /api/login
 * 관리자 비밀번호를 확인하고 세션 토큰을 발급합니다.
 * 요청 body: { password: string }
 */
app.post("/api/login", (req, res) => {
  const { password } = req.body;
  if (!password || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, message: "비밀번호가 올바르지 않습니다." });
  }
  // 랜덤 토큰 생성 후 저장
  const token = crypto.randomBytes(32).toString("hex");
  validTokens.add(token);
  console.log("관리자 로그인 성공");
  res.json({ success: true, token });
});

/**
 * POST /api/logout
 * 현재 세션 토큰을 무효화합니다.
 */
app.post("/api/logout", (req, res) => {
  const authHeader = req.headers["authorization"] || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (token) validTokens.delete(token);
  res.json({ success: true, message: "로그아웃 되었습니다." });
});

// ─── API 라우트 ──────────────────────────────────────────────────────────────

/**
 * GET /api/signatures
 * 저장된 모든 서명 목록을 반환합니다.
 * 최신 서명이 위로 오도록 내림차순 정렬합니다.
 */
app.get("/api/signatures", requireAuth, (req, res) => {
  try {
    const signatures = readSignatures();
    // 최신 순으로 정렬 (createdAt 기준 내림차순)
    signatures.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ success: true, data: signatures });
  } catch (err) {
    console.error("서명 목록 조회 오류:", err);
    res.status(500).json({ success: false, message: "서버 오류가 발생했습니다." });
  }
});

/**
 * POST /api/signatures
 * 새 서명을 저장합니다.
 * 요청 body: { name: string, imageData: string (Base64) }
 */
app.post("/api/signatures", (req, res) => {
  try {
    const { name, imageData } = req.body;

    // 유효성 검사
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: "이름을 입력해주세요." });
    }
    if (!imageData || !imageData.startsWith("data:image/")) {
      return res.status(400).json({ success: false, message: "유효한 서명 이미지가 없습니다." });
    }

    // 새 서명 객체 생성
    const newSignature = {
      id: uuidv4(),           // 고유 ID
      name: name.trim(),      // 사용자 이름
      imageData: imageData,   // Base64 인코딩된 서명 이미지
      createdAt: new Date().toISOString(), // 저장 시각
    };

    // 기존 목록에 추가 후 저장
    const signatures = readSignatures();
    signatures.push(newSignature);
    writeSignatures(signatures);

    console.log(`새 서명 저장됨: ${newSignature.name} (ID: ${newSignature.id})`);
    res.status(201).json({ success: true, data: newSignature });
  } catch (err) {
    console.error("서명 저장 오류:", err);
    res.status(500).json({ success: false, message: "서버 오류가 발생했습니다." });
  }
});

/**
 * DELETE /api/signatures/:id
 * 특정 ID의 서명을 삭제합니다.
 */
app.delete("/api/signatures/:id", requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    const signatures = readSignatures();

    const index = signatures.findIndex((s) => s.id === id);
    if (index === -1) {
      return res.status(404).json({ success: false, message: "해당 서명을 찾을 수 없습니다." });
    }

    const deleted = signatures.splice(index, 1)[0];
    writeSignatures(signatures);

    console.log(`서명 삭제됨: ${deleted.name} (ID: ${id})`);
    res.json({ success: true, message: "서명이 삭제되었습니다." });
  } catch (err) {
    console.error("서명 삭제 오류:", err);
    res.status(500).json({ success: false, message: "서버 오류가 발생했습니다." });
  }
});

// ─── 서버 시작 ──────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ 서버가 실행 중입니다 `);
  console.log(`📝 서명 입력 페이지 `);
  console.log(`📋 서명 목록 페이지`);
});
