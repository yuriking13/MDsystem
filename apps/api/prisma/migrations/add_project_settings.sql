-- Добавление полей настроек проекта для типа исследования, протокола и AI-анализа

-- Тип исследования
ALTER TABLE projects ADD COLUMN IF NOT EXISTS research_type VARCHAR(100);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS research_subtype VARCHAR(100);

-- Протокол исследования (CARE, STROBE, CONSORT, PRISMA или другой)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS research_protocol VARCHAR(50);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS protocol_custom_name VARCHAR(200);

-- Настройки AI-анализа
ALTER TABLE projects ADD COLUMN IF NOT EXISTS ai_error_analysis_enabled BOOLEAN DEFAULT false;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS ai_protocol_check_enabled BOOLEAN DEFAULT false;

-- Описание проекта (если еще не добавлено)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS description TEXT;

-- Комментарии к полям:
-- research_type: 'observational_descriptive', 'observational_analytical', 'experimental', 'second_order', 'other'
-- research_subtype: более детальный тип (case_report, cohort, rct и т.д.)
-- research_protocol: 'CARE', 'STROBE', 'CONSORT', 'PRISMA', 'OTHER'
-- ai_error_analysis_enabled: включен ли AI-анализ ошибок I и II рода
-- ai_protocol_check_enabled: включена ли проверка соответствия протоколу
