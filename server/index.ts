import "dotenv/config";
import express from "express";
import cors from "cors";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin";
const validTokens = new Set<string>();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// React 빌드 파일 서빙
app.use(express.static(path.join(__dirname, "..", "dist")));

// ─── 인증 API ────────────────────────────────────────────────────

app.post("/api/login", (req, res) => {
  const { password } = req.body;
  if (!password || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, message: "비밀번호가 올바르지 않습니다." });
  }
  const token = crypto.randomBytes(32).toString("hex");
  validTokens.add(token);
  console.log("관리자 로그인 성공");
  res.json({ success: true, token });
});

app.post("/api/logout", (req, res) => {
  const authHeader = req.headers["authorization"] || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (token) validTokens.delete(token);
  res.json({ success: true, message: "로그아웃 되었습니다." });
});

// ─── SPA 폴백 ────────────────────────────────────────────────────
// API 외의 모든 요청은 React의 index.html로 전달
app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "..", "dist", "index.html"));
});

// ─── 서버 시작 ───────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`서버가 실행 중입니다 (포트: ${PORT})`);
});
