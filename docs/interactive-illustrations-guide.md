# Система интерактивных иллюстраций для лэндинга

Система для создания динамичных SVG иллюстраций с эффектами параллакса и плавными переходами между секциями лэндинга.

## 🎨 Возможности

- **Динамические SVG анимации** с плавными переходами
- **Параллакс эффект** при движении мыши
- **Эффект погружения** при скролле между секциями
- **Автоматическая анимация** при входе элементов в viewport
- **Responsive дизайн** с адаптацией под мобильные устройства
- **Поддержка prefers-reduced-motion** для пользователей с ограниченными возможностями

## 📦 Структура файлов

```
apps/web/src/
├── components/
│   └── InteractiveLandingIllustration.tsx  # Основной компонент иллюстраций
├── lib/
│   ├── useScrollEffect.ts                   # Хуки для скролл-эффектов
│   └── illustrationPatterns.tsx             # Библиотека паттернов и градиентов
├── styles/
│   └── landing-animations.css               # CSS анимации и стили
└── pages/
    └── LandingPage.tsx                      # Интегрированная лэндинг страница
```

## 🚀 Использование

### Базовое использование

```tsx
import InteractiveLandingIllustration from "../components/InteractiveLandingIllustration";

function MySection() {
  return (
    <section data-section="my-section">
      <div className="content">
        <h2>Заголовок</h2>
        <p>Текст секции</p>
      </div>
      <div className="feature-illustration">
        <InteractiveLandingIllustration variant="hero" />
      </div>
    </section>
  );
}
```

### Доступные варианты (variants)

- `hero` - Главная секция с документом/dashboard
- `features` - Сетка функций с узлами
- `workflow` - Процессный флоу с шагами
- `stats` - Анимированная диаграмма
- `pricing` - Карточки тарифов
- `testimonials` / `cta` - Концентрические круги

### Использование хуков

```tsx
import {
  useScrollEffect,
  useSectionTransition,
  useParallax,
} from "../lib/useScrollEffect";

function CustomComponent() {
  // Отслеживание скролла и видимости
  const { isVisible, scrollProgress, mousePosition, ref } = useScrollEffect({
    trackProgress: true,
    trackMouse: true,
  });

  // Параллакс эффект
  const parallaxOffset = useParallax(0.5);

  // Отслеживание активных секций
  useSectionTransition();

  return (
    <div
      ref={ref as any}
      style={{
        opacity: scrollProgress,
        transform: `translateY(${parallaxOffset}px)`,
      }}
    >
      {isVisible && <YourContent />}
    </div>
  );
}
```

## 🎭 Создание кастомных иллюстраций

### 1. Использование готовых паттернов

```tsx
import {
  ILLUSTRATION_GRADIENTS,
  generateFloatingParticles,
  generateBlob,
  renderGradientDefs,
} from "../lib/illustrationPatterns";

function CustomIllustration({ scrollProgress }: { scrollProgress: number }) {
  const particles = generateFloatingParticles(
    12,
    { width: 800, height: 600 },
    scrollProgress,
  );

  return (
    <svg viewBox="0 0 800 600">
      {renderGradientDefs([
        ILLUSTRATION_GRADIENTS.sunset,
        ILLUSTRATION_GRADIENTS.ocean,
      ])}

      {/* Органическая форма */}
      <path
        d={generateBlob(400, 300, 150, 0.3, 8)}
        fill="url(#sunset)"
        opacity={scrollProgress}
      />

      {/* Плавающие частицы */}
      {particles.map((particle, i) => (
        <circle key={i} {...particle.props} fill="url(#ocean)" />
      ))}
    </svg>
  );
}
```

### 2. Добавление новых вариантов

Откройте `InteractiveLandingIllustration.tsx` и добавьте новый case в `renderIllustration()`:

```tsx
case "myCustomVariant":
  return (
    <svg viewBox="0 0 800 600" className="landing-illustration">
      <defs>
        <linearGradient id="myGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#your-color" />
          <stop offset="100%" stopColor="#another-color" />
        </linearGradient>
      </defs>

      {/* Ваша SVG графика */}
      <circle
        cx="400"
        cy="300"
        r={100 + scrollProgress * 50}
        fill="url(#myGradient)"
        opacity={opacityProgress}
      />
    </svg>
  );
```

### 3. Использование библиотеки градиентов

```tsx
import {
  ILLUSTRATION_GRADIENTS,
  COLOR_SCHEMES,
} from "../lib/illustrationPatterns";

// Готовые градиенты:
// - sunset (красно-оранжевый)
// - ocean (голубой)
// - purple (фиолетовый)
// - peach (персиковый)
// - mint (мятный)
// - aurora (северное сияние)
// - cosmic (космос)

// Цветовые схемы:
// - tech, nature, fire, ice, sunset, cosmic
```

## 🎬 Анимации

### CSS классы

- `.interactive-landing-illustration` - базовый контейнер
- `[data-section]` - секция с эффектом погружения
- `.section-active` - активная секция
- `.parallax-container` - контейнер для параллакса
- `.stagger-fade-in` - постепенное появление дочерних элементов

### CSS переменные

Используйте CSS переменные для кастомизации:

```css
:root {
  --color-primary: #667eea;
  --color-primary-rgb: 102, 126, 234;
}
```

## 🛠️ Интеграция в новые страницы

### Шаг 1: Добавьте data-section атрибут

```tsx
<section data-section="unique-id" className="public-section">
  {/* Контент */}
</section>
```

### Шаг 2: Используйте хук useSectionTransition

```tsx
import { useSectionTransition } from "../lib/useScrollEffect";

function MyPage() {
  useSectionTransition(); // Автоматически отслеживает все [data-section]

  return (
    <div>
      <section data-section="section1">...</section>
      <section data-section="section2">...</section>
    </div>
  );
}
```

### Шаг 3: Добавьте иллюстрации

```tsx
<div className="feature-with-illustration">
  <div className="content">{/* Текстовый контент */}</div>
  <div className="feature-illustration">
    <InteractiveLandingIllustration variant="features" />
  </div>
</div>
```

## 🎨 Примеры кастомизации

### Создание иллюстрации с волнами

```tsx
import { generateWave } from "../lib/illustrationPatterns";

function WaveIllustration({ scrollProgress }: { scrollProgress: number }) {
  return (
    <svg viewBox="0 0 800 600">
      <path
        d={generateWave(50, 2, scrollProgress * Math.PI * 2, 800, 300)}
        stroke="url(#ocean)"
        strokeWidth="3"
        fill="none"
      />
    </svg>
  );
}
```

### Создание сетки точек

```tsx
import { generateDotGrid } from "../lib/illustrationPatterns";

function DotGridIllustration() {
  const dots = generateDotGrid(10, 10, 80, 0, 0);

  return (
    <svg viewBox="0 0 800 600">
      {dots.map((dot, i) => (
        <circle key={i} {...dot.props} fill="currentColor" />
      ))}
    </svg>
  );
}
```

## 📱 Адаптивность

Все компоненты автоматически адаптируются под разные размеры экрана:

- Desktop: полная высота и детализация
- Tablet: средняя высота (400-300px)
- Mobile: минимальная высота (250px)

Пользователи с включенным `prefers-reduced-motion` получат статичные версии без анимаций.

## 🔧 Настройка производительности

Для улучшения производительности используется:

- `will-change: transform, opacity` для оптимизации анимаций
- `passive: true` для слушателей скролла
- IntersectionObserver для отслеживания видимости
- Ленивая анимация только для видимых элементов

## 📚 Дополнительные утилиты

### Плавный скролл к элементу

```tsx
import { smoothScrollTo } from "../lib/useScrollEffect";

<button onClick={() => smoothScrollTo("section-id", 80)}>
  Перейти к секции
</button>;
```

### Easing функции

```tsx
import { easing } from "../lib/illustrationPatterns";

const value = easing.easeInOut(scrollProgress);
const elastic = easing.elasticOut(scrollProgress);
const bounce = easing.bounceOut(scrollProgress);
```

### Интерполяция значений

```tsx
import { lerp } from "../lib/illustrationPatterns";

const interpolatedValue = lerp(0, 100, scrollProgress); // 0 -> 100
```

## 🎯 Best Practices

1. **Используйте SVG вместо растровой графики** для четкости на всех экранах
2. **Ограничивайте количество анимированных элементов** (макс. 8-10 на иллюстрацию)
3. **Применяйте will-change осторожно** только для активно анимируемых элементов
4. **Тестируйте на мобильных устройствах** для проверки производительности
5. **Используйте готовые паттерны** из библиотеки для консистентности
6. **Добавляйте fallback** для пользователей с prefers-reduced-motion

## 🐛 Отладка

Если иллюстрации не отображаются:

1. Проверьте, что CSS импортирован в `main.tsx`
2. Убедитесь, что у секции есть атрибут `data-section`
3. Проверьте консоль на ошибки TypeScript
4. Убедитесь, что контейнер имеет определенную высоту

## 🎓 Обучающие ресурсы

- [MDN: SVG Tutorial](https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorial)
- [CSS Tricks: A Complete Guide to SVG Animations](https://css-tricks.com/lodge/svg/)
- [Intersection Observer API](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)

---

**Автор:** MDsystem Development Team  
**Версия:** 1.0.0  
**Дата:** Февраль 2026
