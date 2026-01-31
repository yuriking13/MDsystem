import React, { useState } from "react";
import { getErrorMessage } from "../lib/errorUtils";
import { apiAddArticleByDoi } from "../lib/api";

type Props = {
  projectId: string;
  onClose: () => void;
  onSuccess: () => void;
};

export default function AddArticleByDoiModal({
  projectId,
  onClose,
  onSuccess,
}: Props) {
  const [doi, setDoi] = useState("");
  const [status, setStatus] = useState<"candidate" | "selected">("candidate");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!doi.trim()) {
      setError("Введите DOI");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await apiAddArticleByDoi(projectId, doi.trim(), status);

      // Успешно добавлено
      alert(result.message);
      onSuccess();
      onClose();
    } catch (err: any) {
      const errMsg = getErrorMessage(err);

      if (errMsg.includes("404")) {
        setError(
          "Статья с таким DOI не найдена в базе Crossref. Проверьте правильность DOI.",
        );
      } else if (errMsg.includes("409")) {
        setError("Эта статья уже добавлена в проект.");
      } else if (errMsg.includes("403")) {
        setError("У вас нет прав на редактирование этого проекта.");
      } else {
        setError(errMsg);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "500px" }}
      >
        <div className="modal-header">
          <h2>Добавить статью по DOI</h2>
          <button className="close-btn" onClick={onClose} disabled={loading}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div style={{ marginBottom: "16px" }}>
            <label
              style={{ display: "block", marginBottom: "8px", fontWeight: 500 }}
            >
              DOI статьи
            </label>
            <input
              type="text"
              value={doi}
              onChange={(e) => setDoi(e.target.value)}
              placeholder="Например: 10.1038/nature12373"
              disabled={loading}
              style={{
                width: "100%",
                padding: "8px 12px",
                fontSize: "14px",
                border: "1px solid #ddd",
                borderRadius: "4px",
              }}
              autoFocus
            />
            <small
              style={{ color: "#666", marginTop: "4px", display: "block" }}
            >
              Введите полный DOI статьи. Данные будут загружены из базы
              Crossref.
            </small>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label
              style={{ display: "block", marginBottom: "8px", fontWeight: 500 }}
            >
              Статус в проекте
            </label>
            <div style={{ display: "flex", gap: "12px" }}>
              <label
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <input
                  type="radio"
                  value="candidate"
                  checked={status === "candidate"}
                  onChange={(e) => setStatus(e.target.value as "candidate")}
                  disabled={loading}
                />
                Кандидат
              </label>
              <label
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <input
                  type="radio"
                  value="selected"
                  checked={status === "selected"}
                  onChange={(e) => setStatus(e.target.value as "selected")}
                  disabled={loading}
                />
                Отобранная
              </label>
            </div>
          </div>

          {error && (
            <div
              style={{
                padding: "12px",
                backgroundColor: "#fee",
                border: "1px solid #fcc",
                borderRadius: "4px",
                color: "#c33",
                marginBottom: "16px",
              }}
            >
              {error}
            </div>
          )}

          <div className="modal-footer">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                padding: "8px 16px",
                backgroundColor: "#f5f5f5",
                border: "1px solid #ddd",
                borderRadius: "4px",
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading || !doi.trim()}
              style={{
                padding: "8px 16px",
                backgroundColor: loading ? "#ccc" : "#007bff",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: loading || !doi.trim() ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Добавление..." : "Добавить"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
