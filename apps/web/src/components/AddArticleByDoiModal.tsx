import React, { useState } from "react";
import { getErrorMessage } from "../lib/errorUtils";
import { apiAddArticleByDoi } from "../lib/api";
import { useLanguage } from "../lib/LanguageContext";

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
  const { t } = useLanguage();
  const [doi, setDoi] = useState("");
  const [status, setStatus] = useState<"candidate" | "selected">("candidate");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!doi.trim()) {
      setError(t("Введите DOI", "Please enter DOI"));
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
    } catch (err: unknown) {
      const errMsg = getErrorMessage(err);

      if (errMsg.includes("404")) {
        setError(
          t(
            "Статья с таким DOI не найдена в базе Crossref. Проверьте правильность DOI.",
            "Article with this DOI was not found in Crossref database. Please check the DOI.",
          ),
        );
      } else if (errMsg.includes("409")) {
        setError(
          t(
            "Эта статья уже добавлена в проект.",
            "This article is already added to the project.",
          ),
        );
      } else if (errMsg.includes("403")) {
        setError(
          t(
            "У вас нет прав на редактирование этого проекта.",
            "You don't have permission to edit this project.",
          ),
        );
      } else {
        setError(errMsg);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content add-article-doi-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 className="modal-title">
            {t("Добавить статью по DOI", "Add Article by DOI")}
          </h2>
          <button className="modal-close" onClick={onClose} disabled={loading}>
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <label className="form-label">
              <span className="form-label-text">
                {t("DOI статьи", "Article DOI")}
              </span>
              <input
                type="text"
                className="form-input"
                value={doi}
                onChange={(e) => setDoi(e.target.value)}
                placeholder={t(
                  "Например: 10.1038/nature12373",
                  "Example: 10.1038/nature12373",
                )}
                disabled={loading}
                autoFocus
              />
              <small className="add-article-doi-help">
                {t(
                  "Введите полный DOI статьи. Данные будут загружены из базы Crossref.",
                  "Enter the full article DOI. Data will be loaded from Crossref database.",
                )}
              </small>
            </label>

            <label className="form-label">
              <span className="form-label-text">
                {t("Статус в проекте", "Project Status")}
              </span>
              <div className="add-article-doi-status-options">
                <label className="add-article-doi-status-option">
                  <input
                    type="radio"
                    value="candidate"
                    checked={status === "candidate"}
                    onChange={(e) => setStatus(e.target.value as "candidate")}
                    disabled={loading}
                  />
                  {t("Кандидат", "Candidate")}
                </label>
                <label className="add-article-doi-status-option">
                  <input
                    type="radio"
                    value="selected"
                    checked={status === "selected"}
                    onChange={(e) => setStatus(e.target.value as "selected")}
                    disabled={loading}
                  />
                  {t("Отобранная", "Selected")}
                </label>
              </div>
            </label>

            {error && <div className="alert-error">{error}</div>}
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              {t("Отмена", "Cancel")}
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading || !doi.trim()}
            >
              {loading ? t("Добавление...", "Adding...") : t("Добавить", "Add")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
