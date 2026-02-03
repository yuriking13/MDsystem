import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  KeyboardEvent,
} from "react";
import { cn } from "../design-system/utils/cn";

// =============================================================================
// Skip Links
// =============================================================================

interface SkipLinkProps {
  href: string;
  children: React.ReactNode;
}

export function SkipLink({ href, children }: SkipLinkProps) {
  return (
    <a
      href={href}
      className={cn(
        "sr-only focus:not-sr-only",
        "focus:fixed focus:top-4 focus:left-4 focus:z-100",
        "focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white",
        "focus:rounded-lg focus:shadow-lg focus:outline-none",
        "focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-600",
      )}
    >
      {children}
    </a>
  );
}

export function SkipLinks() {
  return (
    <div className="skip-links">
      <SkipLink href="#main-content">Skip to main content</SkipLink>
      <SkipLink href="#main-navigation">Skip to navigation</SkipLink>
      <SkipLink href="#search">Skip to search</SkipLink>
    </div>
  );
}

// =============================================================================
// Focus Management
// =============================================================================

// Focus trap hook
export function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive) return;

    const container = containerRef.current;
    if (!container) return;

    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Store previously focused element
    const previouslyFocused = document.activeElement as HTMLElement;

    // Focus first element
    firstElement?.focus();

    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key !== "Tab") return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [isActive]);

  return containerRef;
}

// Focus management for lists
export function useFocusManagement<T>(
  items: T[],
  options?: {
    orientation?: "horizontal" | "vertical" | "both";
    loop?: boolean;
    onSelect?: (index: number) => void;
  },
) {
  const { orientation = "vertical", loop = true, onSelect } = options || {};
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);

  const setItemRef = useCallback(
    (index: number) => (el: HTMLElement | null) => {
      itemRefs.current[index] = el;
    },
    [],
  );

  const focusItem = useCallback((index: number) => {
    const item = itemRefs.current[index];
    if (item) {
      item.focus();
      setFocusedIndex(index);
    }
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const lastIndex = items.length - 1;

      const getNextIndex = (delta: number) => {
        let next = focusedIndex + delta;
        if (loop) {
          if (next < 0) next = lastIndex;
          if (next > lastIndex) next = 0;
        } else {
          next = Math.max(0, Math.min(lastIndex, next));
        }
        return next;
      };

      switch (e.key) {
        case "ArrowDown":
          if (orientation === "vertical" || orientation === "both") {
            e.preventDefault();
            focusItem(getNextIndex(1));
          }
          break;
        case "ArrowUp":
          if (orientation === "vertical" || orientation === "both") {
            e.preventDefault();
            focusItem(getNextIndex(-1));
          }
          break;
        case "ArrowRight":
          if (orientation === "horizontal" || orientation === "both") {
            e.preventDefault();
            focusItem(getNextIndex(1));
          }
          break;
        case "ArrowLeft":
          if (orientation === "horizontal" || orientation === "both") {
            e.preventDefault();
            focusItem(getNextIndex(-1));
          }
          break;
        case "Home":
          e.preventDefault();
          focusItem(0);
          break;
        case "End":
          e.preventDefault();
          focusItem(lastIndex);
          break;
        case "Enter":
        case " ":
          if (focusedIndex >= 0) {
            e.preventDefault();
            onSelect?.(focusedIndex);
          }
          break;
      }
    },
    [items.length, focusedIndex, orientation, loop, focusItem, onSelect],
  );

  return {
    focusedIndex,
    setFocusedIndex,
    setItemRef,
    focusItem,
    handleKeyDown,
  };
}

// =============================================================================
// Live Regions
// =============================================================================

type LiveRegionPoliteness = "polite" | "assertive" | "off";

interface LiveRegionContextValue {
  announce: (message: string, politeness?: LiveRegionPoliteness) => void;
}

const LiveRegionContext = createContext<LiveRegionContextValue | null>(null);

export function LiveRegionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [politeMessage, setPoliteMessage] = useState("");
  const [assertiveMessage, setAssertiveMessage] = useState("");

  const announce = useCallback(
    (message: string, politeness: LiveRegionPoliteness = "polite") => {
      if (politeness === "assertive") {
        setAssertiveMessage(message);
        // Clear after announcement
        setTimeout(() => setAssertiveMessage(""), 100);
      } else {
        setPoliteMessage(message);
        setTimeout(() => setPoliteMessage(""), 100);
      }
    },
    [],
  );

  return (
    <LiveRegionContext.Provider value={{ announce }}>
      {children}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {politeMessage}
      </div>
      <div className="sr-only" aria-live="assertive" aria-atomic="true">
        {assertiveMessage}
      </div>
    </LiveRegionContext.Provider>
  );
}

export function useLiveRegion() {
  const context = useContext(LiveRegionContext);
  if (!context) {
    throw new Error("useLiveRegion must be used within a LiveRegionProvider");
  }
  return context;
}

// =============================================================================
// Keyboard Shortcuts
// =============================================================================

interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;
  description: string;
  handler: () => void;
}

interface KeyboardShortcutsContextValue {
  shortcuts: KeyboardShortcut[];
  registerShortcut: (shortcut: KeyboardShortcut) => () => void;
}

const KeyboardShortcutsContext =
  createContext<KeyboardShortcutsContextValue | null>(null);

export function KeyboardShortcutsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [shortcuts, setShortcuts] = useState<KeyboardShortcut[]>([]);

  const registerShortcut = useCallback((shortcut: KeyboardShortcut) => {
    setShortcuts((prev) => [...prev, shortcut]);
    return () => {
      setShortcuts((prev) => prev.filter((s) => s !== shortcut));
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      // Ignore if typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement).isContentEditable
      ) {
        return;
      }

      for (const shortcut of shortcuts) {
        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = !!shortcut.ctrl === (e.ctrlKey || e.metaKey);
        const altMatch = !!shortcut.alt === e.altKey;
        const shiftMatch = !!shortcut.shift === e.shiftKey;

        if (keyMatch && ctrlMatch && altMatch && shiftMatch) {
          e.preventDefault();
          shortcut.handler();
          return;
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts]);

  return (
    <KeyboardShortcutsContext.Provider value={{ shortcuts, registerShortcut }}>
      {children}
    </KeyboardShortcutsContext.Provider>
  );
}

export function useKeyboardShortcuts() {
  const context = useContext(KeyboardShortcutsContext);
  if (!context) {
    throw new Error(
      "useKeyboardShortcuts must be used within a KeyboardShortcutsProvider",
    );
  }
  return context;
}

export function useKeyboardShortcut(shortcut: KeyboardShortcut) {
  const { registerShortcut } = useKeyboardShortcuts();

  useEffect(() => {
    return registerShortcut(shortcut);
  }, [registerShortcut, shortcut]);
}

// =============================================================================
// Reduced Motion
// =============================================================================

export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  return prefersReducedMotion;
}

// =============================================================================
// Screen Reader Only Text
// =============================================================================

export function VisuallyHidden({
  children,
  as: Component = "span",
}: {
  children: React.ReactNode;
  as?: React.ElementType;
}) {
  return <Component className="sr-only">{children}</Component>;
}

// =============================================================================
// Keyboard Help Modal
// =============================================================================

interface KeyboardHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardHelpModal({ isOpen, onClose }: KeyboardHelpModalProps) {
  const containerRef = useFocusTrap(isOpen);
  const { shortcuts } = useKeyboardShortcuts();

  if (!isOpen) return null;

  const formatShortcut = (shortcut: KeyboardShortcut) => {
    const parts = [];
    if (shortcut.ctrl) parts.push("Ctrl");
    if (shortcut.alt) parts.push("Alt");
    if (shortcut.shift) parts.push("Shift");
    parts.push(shortcut.key.toUpperCase());
    return parts.join(" + ");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="keyboard-help-title"
    >
      <div
        ref={containerRef}
        className="bg-white dark:bg-neutral-900 rounded-xl shadow-xl max-w-md w-full mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="keyboard-help-title"
          className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4"
        >
          Keyboard Shortcuts
        </h2>

        <ul className="space-y-2" role="list">
          {shortcuts.map((shortcut, index) => (
            <li
              key={index}
              className="flex items-center justify-between py-2 border-b border-neutral-100 dark:border-neutral-800 last:border-0"
            >
              <span className="text-sm text-neutral-700 dark:text-neutral-300">
                {shortcut.description}
              </span>
              <kbd className="px-2 py-1 bg-neutral-100 dark:bg-neutral-800 rounded text-xs font-mono text-neutral-600 dark:text-neutral-400">
                {formatShortcut(shortcut)}
              </kbd>
            </li>
          ))}
        </ul>

        <button
          onClick={onClose}
          className="mt-4 w-full py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// Accessible Icon Button
// =============================================================================

interface AccessibleIconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  label: string;
  showLabel?: boolean;
  variant?: "default" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

export function AccessibleIconButton({
  icon,
  label,
  showLabel = false,
  variant = "default",
  size = "md",
  className,
  ...props
}: AccessibleIconButtonProps) {
  const sizeStyles = {
    sm: "p-1.5 text-sm",
    md: "p-2 text-base",
    lg: "p-3 text-lg",
  };

  const variantStyles = {
    default:
      "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700",
    ghost:
      "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800",
    danger:
      "text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30",
  };

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-lg transition-colors",
        "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
        sizeStyles[size],
        variantStyles[variant],
        className,
      )}
      aria-label={label}
      title={label}
      {...props}
    >
      {icon}
      {showLabel && <span className="ml-2">{label}</span>}
      {!showLabel && <VisuallyHidden>{label}</VisuallyHidden>}
    </button>
  );
}
