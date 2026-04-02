import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import SignaturePage from "./components/SignaturePage";
import ListPage from "./components/ListPage";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<SignaturePage />} />
        <Route path="/list" element={<ListPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
