import React, { useState } from "react";
import { getErrorMessage } from "../../lib/errorUtils";
import { apiAdminGenerateToken } from "../../lib/adminApi";
import { useAdminAuth } from "../../lib/AdminContext";
import {
  IconSettings,
  IconKey,
  IconShield,
  IconCheckCircle,
} from "../../components/FlowbiteIcons";

export default function AdminSettingsPage() {
  const { admin } = useAdminAuth();
  const [newToken, setNewToken] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleGenerateToken() {
    if (!confirm("Вы уверены? Старый токен перестанет работать.")) return;

    setGenerating(true);
    try {
      const result = await apiAdminGenerateToken();
      setNewToken(result.token);
      setCopied(false);
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setGenerating(false);
    }
  }

  function copyToken() {
    if (newToken) {
      navigator.clipboard.writeText(newToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>
            <IconSettings size="lg" />
            Настройки администратора
          </h1>
          <p className="admin-page-subtitle">Безопасность и конфигурация</p>
        </div>
      </div>

      <div className="admin-settings-grid">
        {/* Admin Info */}
        <div className="admin-card">
          <div className="admin-card-header">
            <h3>
              <IconShield size="sm" />
              Информация об администраторе
            </h3>
          </div>
          <div className="admin-card-content">
            <div className="admin-info-list">
              <div className="admin-info-item">
                <span className="admin-info-label">Email</span>
                <span className="admin-info-value">{admin?.email}</span>
              </div>
              <div className="admin-info-item">
                <span className="admin-info-label">ID</span>
                <span className="admin-info-value mono">{admin?.id}</span>
              </div>
              <div className="admin-info-item">
                <span className="admin-info-label">Роль</span>
                <span className="admin-info-value">
                  <span className="admin-badge admin-badge-admin">
                    Администратор
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 2FA Token */}
        <div className="admin-card">
          <div className="admin-card-header">
            <h3>
              <IconKey size="sm" />
              Токен двухфакторной аутентификации
            </h3>
          </div>
          <div className="admin-card-content">
            <p className="admin-settings-description">
              Сгенерируйте специальный токен для дополнительной защиты входа в
              админ-панель. После генерации токен будет требоваться при каждом
              входе.
            </p>

            {newToken ? (
              <div className="admin-token-result">
                <div className="admin-token-warning">
                  <IconShield className="text-warning" />
                  <span>
                    Сохраните этот токен! Он показывается только один раз.
                  </span>
                </div>
                <div className="admin-token-display">
                  <code>{newToken}</code>
                  <button className="btn secondary" onClick={copyToken}>
                    {copied ? (
                      <>
                        <IconCheckCircle className="text-success" />
                        Скопировано
                      </>
                    ) : (
                      "Копировать"
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <button
                className="btn"
                onClick={handleGenerateToken}
                disabled={generating}
              >
                <IconKey size="sm" />
                {generating ? "Генерация..." : "Сгенерировать новый токен"}
              </button>
            )}

            <div className="admin-settings-note">
              <strong>Примечание:</strong> Если вы потеряете токен, вам нужно
              будет сгенерировать новый. Старый токен перестанет работать.
            </div>
          </div>
        </div>

        {/* Security Tips */}
        <div className="admin-card">
          <div className="admin-card-header">
            <h3>
              <IconShield size="sm" />
              Рекомендации по безопасности
            </h3>
          </div>
          <div className="admin-card-content">
            <ul className="admin-tips-list">
              <li>
                <IconCheckCircle size="sm" className="text-success" />
                <span>Используйте двухфакторную аутентификацию</span>
              </li>
              <li>
                <IconCheckCircle size="sm" className="text-success" />
                <span>Храните токен в надёжном месте (менеджер паролей)</span>
              </li>
              <li>
                <IconCheckCircle size="sm" className="text-success" />
                <span>Не передавайте учётные данные админа третьим лицам</span>
              </li>
              <li>
                <IconCheckCircle size="sm" className="text-success" />
                <span>Регулярно проверяйте журнал аудита</span>
              </li>
              <li>
                <IconCheckCircle size="sm" className="text-success" />
                <span>Используйте VPN при доступе к админ-панели</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Data Privacy Info */}
        <div className="admin-card">
          <div className="admin-card-header">
            <h3>Конфиденциальность данных пользователей</h3>
          </div>
          <div className="admin-card-content">
            <p className="admin-settings-description">
              MDsystem обеспечивает минимальный доступ администраторов к файлам
              проектов пользователей для защиты их интеллектуальной
              собственности.
            </p>

            <div className="admin-privacy-list">
              <div className="admin-privacy-item allowed">
                <strong>Доступно администраторам:</strong>
                <ul>
                  <li>Метаданные проектов (название, дата создания)</li>
                  <li>Статистика использования (время, действия)</li>
                  <li>Системные ошибки и логи</li>
                  <li>Информация о подписках</li>
                </ul>
              </div>
              <div className="admin-privacy-item restricted">
                <strong>Ограниченный доступ:</strong>
                <ul>
                  <li>Содержимое документов пользователей</li>
                  <li>Загруженные файлы научных работ</li>
                  <li>Личные заметки в проектах</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
