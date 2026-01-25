import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  apiAdminGetActivity,
  apiAdminGetCalendar,
  apiAdminGetDailyActivity,
  apiAdminGetUsers,
  type ActivityItem,
  type CalendarDay,
  type DailyUserActivity,
  type UserListItem,
} from "../../lib/adminApi";
import {
  IconCalendar,
  IconUsers,
  IconChartBar,
  IconRefresh,
  IconArrowLeft,
  IconArrowRight,
  IconFilter,
} from "../../components/FlowbiteIcons";

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours > 0) {
    return `${hours}ч ${mins}м`;
  }
  return `${mins}м`;
}

const ACTION_TYPE_LABELS: Record<string, string> = {
  page_view: "Просмотр страницы",
  api_call: "API запрос",
  document_edit: "Редактирование документа",
  search: "Поиск",
  login: "Вход",
  logout: "Выход",
};

const MONTHS = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
];

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

type ViewMode = "calendar" | "list";

export default function AdminActivityPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<ViewMode>("calendar");
  
  // Calendar state
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [calendarData, setCalendarData] = useState<CalendarDay[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dailyActivity, setDailyActivity] = useState<DailyUserActivity[]>([]);
  
  // Filter state
  const [selectedUserId, setSelectedUserId] = useState<string | null>(
    searchParams.get("userId")
  );
  const [users, setUsers] = useState<UserListItem[]>([]);
  
  // List state
  const [activityList, setActivityList] = useState<ActivityItem[]>([]);
  const [listPage, setListPage] = useState(1);
  const [listTotal, setListTotal] = useState(0);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load users for filter
  useEffect(() => {
    apiAdminGetUsers(1, 100).then((data) => setUsers(data.users));
  }, []);

  // Load calendar data
  useEffect(() => {
    if (viewMode !== "calendar") return;
    
    setLoading(true);
    setError(null);
    
    apiAdminGetCalendar(year, month, selectedUserId || undefined)
      .then((data) => setCalendarData(data.days))
      .catch((err) => setError(err?.message || "Ошибка загрузки"))
      .finally(() => setLoading(false));
  }, [year, month, selectedUserId, viewMode]);

  // Load daily activity when date selected
  useEffect(() => {
    if (!selectedDate) {
      setDailyActivity([]);
      return;
    }
    
    apiAdminGetDailyActivity(selectedDate, selectedUserId || undefined)
      .then((data) => setDailyActivity(data.users))
      .catch(console.error);
  }, [selectedDate, selectedUserId]);

  // Load activity list
  useEffect(() => {
    if (viewMode !== "list") return;
    
    setLoading(true);
    apiAdminGetActivity({
      userId: selectedUserId || undefined,
      page: listPage,
      limit: 50,
    })
      .then((data) => {
        setActivityList(data.activity);
        setListTotal(data.total);
      })
      .catch((err) => setError(err?.message || "Ошибка загрузки"))
      .finally(() => setLoading(false));
  }, [selectedUserId, listPage, viewMode]);

  function handleUserChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const userId = e.target.value || null;
    setSelectedUserId(userId);
    setSelectedDate(null);
    if (userId) {
      setSearchParams({ userId });
    } else {
      setSearchParams({});
    }
  }

  function prevMonth() {
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
    setSelectedDate(null);
  }

  function nextMonth() {
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
    setSelectedDate(null);
  }

  // Generate calendar grid
  function renderCalendar() {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const daysInMonth = lastDay.getDate();
    
    // Get the day of week for the first day (0 = Sunday, we need Monday = 0)
    let startDay = firstDay.getDay() - 1;
    if (startDay < 0) startDay = 6;
    
    const calendarMap: Record<string, CalendarDay> = {};
    calendarData.forEach((day) => {
      calendarMap[day.date] = day;
    });

    const weeks: React.ReactNode[] = [];
    let currentWeek: React.ReactNode[] = [];
    
    // Empty cells before first day
    for (let i = 0; i < startDay; i++) {
      currentWeek.push(<div key={`empty-${i}`} className="admin-calendar-cell empty" />);
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const dayData = calendarMap[dateStr];
      const isSelected = selectedDate === dateStr;
      const hasActivity = !!dayData;
      
      const minutes = dayData ? parseFloat(dayData.total_minutes || "0") : 0;
      const intensity = Math.min(minutes / 60, 1); // Max intensity at 60+ minutes
      
      currentWeek.push(
        <div
          key={day}
          className={`admin-calendar-cell ${hasActivity ? "has-activity" : ""} ${isSelected ? "selected" : ""}`}
          onClick={() => hasActivity && setSelectedDate(dateStr)}
          style={hasActivity ? { 
            "--activity-intensity": intensity,
          } as React.CSSProperties : undefined}
        >
          <span className="admin-calendar-day">{day}</span>
          {hasActivity && (
            <div className="admin-calendar-info">
              <span className="admin-calendar-users">
                <IconUsers size="sm" /> {dayData.unique_users}
              </span>
              <span className="admin-calendar-time">
                {formatMinutes(minutes)}
              </span>
            </div>
          )}
        </div>
      );
      
      if (currentWeek.length === 7) {
        weeks.push(
          <div key={`week-${weeks.length}`} className="admin-calendar-week">
            {currentWeek}
          </div>
        );
        currentWeek = [];
      }
    }
    
    // Fill remaining cells
    while (currentWeek.length > 0 && currentWeek.length < 7) {
      currentWeek.push(
        <div key={`empty-end-${currentWeek.length}`} className="admin-calendar-cell empty" />
      );
    }
    if (currentWeek.length > 0) {
      weeks.push(
        <div key={`week-${weeks.length}`} className="admin-calendar-week">
          {currentWeek}
        </div>
      );
    }
    
    return weeks;
  }

  return (
    <div className="admin-page">
        <div className="admin-page-header">
          <div>
            <h1>
              <IconCalendar size="lg" />
              Активность пользователей
            </h1>
            <p className="admin-page-subtitle">
              Отслеживание времени и действий пользователей
            </p>
          </div>
          <div className="admin-view-toggle">
            <button
              className={`btn ${viewMode === "calendar" ? "" : "secondary"}`}
              onClick={() => setViewMode("calendar")}
            >
              <IconCalendar size="sm" />
              Календарь
            </button>
            <button
              className={`btn ${viewMode === "list" ? "" : "secondary"}`}
              onClick={() => setViewMode("list")}
            >
              <IconChartBar size="sm" />
              Список
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="admin-filters">
          <div className="admin-filter-group">
            <label>
              <IconFilter size="sm" />
              Фильтр по пользователю
            </label>
            <select value={selectedUserId || ""} onChange={handleUserChange}>
              <option value="">Все пользователи</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.email}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="alert admin-alert">
            <span>{error}</span>
          </div>
        )}

        {viewMode === "calendar" ? (
          <div className="admin-calendar-container">
            {/* Calendar Navigation */}
            <div className="admin-calendar-header">
              <button className="btn secondary" onClick={prevMonth}>
                <IconArrowLeft size="sm" />
              </button>
              <h2 className="admin-calendar-title">
                {MONTHS[month - 1]} {year}
              </h2>
              <button className="btn secondary" onClick={nextMonth}>
                <IconArrowRight size="sm" />
              </button>
            </div>

            {/* Calendar Grid */}
            <div className="admin-calendar">
              <div className="admin-calendar-weekdays">
                {WEEKDAYS.map((day) => (
                  <div key={day} className="admin-calendar-weekday">{day}</div>
                ))}
              </div>
              {loading ? (
                <div className="admin-loading-content">
                  <div className="admin-loading-spinner"></div>
                </div>
              ) : (
                <div className="admin-calendar-grid">
                  {renderCalendar()}
                </div>
              )}
            </div>

            {/* Daily Details */}
            {selectedDate && (
              <div className="admin-card admin-daily-detail">
                <div className="admin-card-header">
                  <h3>
                    Активность за {new Date(selectedDate).toLocaleDateString("ru-RU", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </h3>
                  <button
                    className="btn secondary"
                    onClick={() => setSelectedDate(null)}
                  >
                    Закрыть
                  </button>
                </div>
                <div className="admin-card-content">
                  {dailyActivity.length > 0 ? (
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Пользователь</th>
                          <th>Действий</th>
                          <th>Время</th>
                          <th>Первая активность</th>
                          <th>Последняя активность</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dailyActivity.map((user) => (
                          <tr key={user.user_id}>
                            <td className="admin-table-email">{user.email}</td>
                            <td>{user.actions_count}</td>
                            <td>{formatMinutes(parseFloat(user.total_minutes || "0"))}</td>
                            <td className="admin-table-date">{formatDate(user.first_activity)}</td>
                            <td className="admin-table-date">{formatDate(user.last_activity)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="admin-empty">Загрузка данных...</p>
                  )}
                </div>
              </div>
            )}

            {/* Legend */}
            <div className="admin-calendar-legend">
              <span className="admin-legend-item">
                <span className="admin-legend-color low"></span>
                Низкая активность
              </span>
              <span className="admin-legend-item">
                <span className="admin-legend-color medium"></span>
                Средняя активность
              </span>
              <span className="admin-legend-item">
                <span className="admin-legend-color high"></span>
                Высокая активность
              </span>
            </div>
          </div>
        ) : (
          /* List View */
          <div className="admin-card">
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Пользователь</th>
                    <th>Действие</th>
                    <th>Детали</th>
                    <th>IP адрес</th>
                    <th>Длительность</th>
                    <th>Дата</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="admin-table-loading">
                        <div className="admin-loading-spinner"></div>
                      </td>
                    </tr>
                  ) : activityList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="admin-table-empty">
                        Нет данных об активности
                      </td>
                    </tr>
                  ) : (
                    activityList.map((item) => (
                      <tr key={item.id}>
                        <td className="admin-table-email">{item.email}</td>
                        <td>
                          <span className={`admin-badge admin-badge-${item.action_type}`}>
                            {ACTION_TYPE_LABELS[item.action_type] || item.action_type}
                          </span>
                        </td>
                        <td className="admin-table-detail">
                          {item.action_detail && typeof item.action_detail === "object" 
                            ? JSON.stringify(item.action_detail).slice(0, 50)
                            : "—"}
                        </td>
                        <td className="mono">{item.ip_address || "—"}</td>
                        <td>{item.duration_seconds ? `${item.duration_seconds}с` : "—"}</td>
                        <td className="admin-table-date">{formatDate(item.created_at)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {listTotal > 50 && (
              <div className="admin-pagination">
                <button
                  className="btn secondary"
                  disabled={listPage === 1}
                  onClick={() => setListPage(listPage - 1)}
                >
                  Назад
                </button>
                <span className="admin-pagination-info">
                  Страница {listPage} из {Math.ceil(listTotal / 50)}
                </span>
                <button
                  className="btn secondary"
                  disabled={listPage >= Math.ceil(listTotal / 50)}
                  onClick={() => setListPage(listPage + 1)}
                >
                  Вперёд
                </button>
              </div>
            )}
          </div>
        )}
    </div>
  );
}
