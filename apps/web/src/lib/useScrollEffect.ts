import { useEffect, useState, useRef, RefObject } from "react";

interface ScrollEffectOptions {
  /**
   * Threshold для IntersectionObserver (0-1).
   * По умолчанию [0, 0.25, 0.5, 0.75, 1]
   */
  threshold?: number | number[];
  /**
   * Включить отслеживание прогресса скролла (0-1)
   */
  trackProgress?: boolean;
  /**
   * Включить отслеживание позиции мыши
   */
  trackMouse?: boolean;
  /**
   * root margin для IntersectionObserver
   */
  rootMargin?: string;
}

interface ScrollEffectResult {
  /** Элемент виден в viewport */
  isVisible: boolean;
  /** Прогресс скролла элемента через viewport (0-1) */
  scrollProgress: number;
  /** Позиция мыши относительно элемента (0-1) */
  mousePosition: { x: number; y: number };
  /** Ref для привязки к элементу */
  ref: RefObject<HTMLElement>;
}

/**
 * Хук для отслеживания скролла и создания эффектов параллакса
 *
 * @example
 * ```tsx
 * const { isVisible, scrollProgress, mousePosition, ref } = useScrollEffect({
 *   trackProgress: true,
 *   trackMouse: true,
 * });
 *
 * return (
 *   <div ref={ref as React.RefObject<HTMLElement>}>
 *     <div className="animated-content">
 *       Content
 *     </div>
 *   </div>
 * );
 * ```
 */
export function useScrollEffect(
  options: ScrollEffectOptions = {},
): ScrollEffectResult {
  const {
    threshold = [0, 0.25, 0.5, 0.75, 1],
    trackProgress = true,
    trackMouse = false,
    rootMargin = "0px",
  } = options;

  const ref = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Отслеживание видимости
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsVisible(entry.isIntersecting);
        });
      },
      {
        threshold,
        rootMargin,
      },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin]);

  // Отслеживание прогресса скролла
  useEffect(() => {
    if (!trackProgress) return;

    const element = ref.current;
    if (!element) return;

    const handleScroll = () => {
      const rect = element.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const elementHeight = rect.height;

      // Вычисляем прогресс от 0 до 1
      let progress = 0;
      if (rect.top < viewportHeight && rect.bottom > 0) {
        // Элемент виден, вычисляем его положение
        progress =
          1 - (rect.top + elementHeight / 2) / (viewportHeight + elementHeight);
        progress = Math.max(0, Math.min(1, progress));
      }

      setScrollProgress(progress);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });
    handleScroll(); // Initial call

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [trackProgress]);

  // Отслеживание позиции мыши
  useEffect(() => {
    if (!trackMouse) return;

    const element = ref.current;
    if (!element) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = element.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      setMousePosition({
        x: Math.max(0, Math.min(1, x)),
        y: Math.max(0, Math.min(1, y)),
      });
    };

    element.addEventListener("mousemove", handleMouseMove);

    return () => {
      element.removeEventListener("mousemove", handleMouseMove);
    };
  }, [trackMouse]);

  return {
    isVisible,
    scrollProgress,
    mousePosition,
    ref,
  };
}

/**
 * Хук для плавных переходов между секциями с эффектом погружения
 */
export function useSectionTransition() {
  const [activeSection, setActiveSection] = useState<string>("");

  useEffect(() => {
    const sections = document.querySelectorAll("[data-section]");
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const sectionId = entry.target.getAttribute("data-section");
            if (sectionId) {
              setActiveSection(sectionId);
              // Добавляем класс для анимации
              entry.target.classList.add("section-active");
            }
          } else {
            entry.target.classList.remove("section-active");
          }
        });
      },
      {
        threshold: 0.3,
        rootMargin: "-10% 0px -10% 0px",
      },
    );

    sections.forEach((section) => observer.observe(section));

    return () => {
      observer.disconnect();
    };
  }, []);

  return { activeSection };
}

/**
 * Хук для параллакс эффекта на основе скролла
 */
export function useParallax(speed: number = 0.5) {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setOffset(window.pageYOffset * speed);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [speed]);

  return offset;
}

/**
 * Утилита для плавного скролла к элементу
 */
export function smoothScrollTo(elementId: string, offset: number = 0) {
  const element = document.getElementById(elementId);
  if (!element) {
    // Если нет ID, попробуем найти по data-section
    const sectionElement = document.querySelector(
      `[data-section="${elementId}"]`,
    );
    if (sectionElement) {
      const top =
        sectionElement.getBoundingClientRect().top +
        window.pageYOffset -
        offset;
      window.scrollTo({
        top,
        behavior: "smooth",
      });
    }
    return;
  }

  const top = element.getBoundingClientRect().top + window.pageYOffset - offset;
  window.scrollTo({
    top,
    behavior: "smooth",
  });
}
