import React, {
  Suspense,
  ComponentType,
  lazy,
  useState,
  useEffect,
} from "react";
import { cn } from "../design-system/utils/cn";

// Generic loading skeleton component
interface SkeletonProps {
  className?: string;
  variant?: "rectangular" | "circular" | "text";
  width?: string | number;
  height?: string | number;
  animation?: "pulse" | "wave" | "none";
}

export function Skeleton({
  className,
  variant = "rectangular",
  width,
  height,
  animation = "pulse",
}: SkeletonProps) {
  const baseStyles = "bg-neutral-200 dark:bg-neutral-700";

  const variantStyles = {
    rectangular: "rounded-lg",
    circular: "rounded-full",
    text: "rounded h-4",
  };

  const animationStyles = {
    pulse: "animate-pulse",
    wave: "skeleton-wave",
    none: "",
  };

  return (
    <div
      className={cn(
        baseStyles,
        variantStyles[variant],
        animationStyles[animation],
        className,
      )}
      style={{
        width: typeof width === "number" ? `${width}px` : width,
        height: typeof height === "number" ? `${height}px` : height,
      }}
    />
  );
}

// Article card skeleton
export function ArticleCardSkeleton({
  compact = false,
}: {
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700/50 rounded-xl overflow-hidden",
        compact ? "p-3" : "p-4",
      )}
    >
      <div className="flex items-start gap-3">
        <Skeleton
          variant="rectangular"
          width={16}
          height={16}
          className="mt-1"
        />
        <div className="flex-1 space-y-3">
          {/* Badges */}
          <div className="flex items-center gap-2">
            <Skeleton
              variant="rectangular"
              width={80}
              height={20}
              className="rounded-full"
            />
            <Skeleton
              variant="rectangular"
              width={60}
              height={20}
              className="rounded-full"
            />
            <Skeleton
              variant="rectangular"
              width={40}
              height={20}
              className="rounded-full ml-auto"
            />
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Skeleton variant="text" width="90%" />
            <Skeleton variant="text" width="70%" />
          </div>

          {/* Authors & Journal */}
          <div className="flex items-center gap-2">
            <Skeleton variant="text" width="40%" />
            <Skeleton variant="text" width="30%" />
          </div>

          {/* IDs */}
          <div className="flex items-center gap-3">
            <Skeleton variant="text" width={100} />
            <Skeleton variant="text" width={150} />
          </div>

          {/* Abstract */}
          {!compact && (
            <div className="mt-3 pl-7 space-y-2">
              <Skeleton variant="text" width="100%" />
              <Skeleton variant="text" width="95%" />
              <Skeleton variant="text" width="40%" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Multiple article skeletons
export function ArticleListSkeleton({
  count = 5,
  compact = false,
}: {
  count?: number;
  compact?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 p-4">
      {Array.from({ length: count }).map((_, i) => (
        <ArticleCardSkeleton key={i} compact={compact} />
      ))}
    </div>
  );
}

// Graph skeleton
export function GraphSkeleton() {
  return (
    <div className="flex-1 flex items-center justify-center bg-neutral-900">
      <div className="text-center">
        <div className="relative w-24 h-24 mx-auto mb-4">
          <Skeleton variant="circular" width={96} height={96} />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
        <Skeleton variant="text" width={120} className="mx-auto" />
      </div>
    </div>
  );
}

// Chart skeleton
export function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <div
      className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4"
      style={{ height }}
    >
      <div className="flex items-end gap-2 h-full">
        {[65, 45, 80, 55, 70, 40, 90, 60, 75, 50].map((h, i) => (
          <Skeleton
            key={i}
            variant="rectangular"
            className="flex-1"
            height={`${h}%`}
            animation="pulse"
          />
        ))}
      </div>
    </div>
  );
}

// Panel skeleton
export function PanelSkeleton() {
  return (
    <div className="w-64 bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-700/50 p-4 space-y-4">
      <Skeleton variant="text" width="60%" height={24} />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton variant="text" width="80%" />
            <Skeleton variant="rectangular" height={32} />
          </div>
        ))}
      </div>
    </div>
  );
}

// Error boundary fallback
interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary?: () => void;
}

export function ErrorFallback({
  error,
  resetErrorBoundary,
}: ErrorFallbackProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="w-16 h-16 mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
        <svg
          className="w-8 h-8 text-red-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
        Something went wrong
      </h3>
      <p className="text-sm text-neutral-500 mb-4 max-w-md">
        {error.message || "An unexpected error occurred. Please try again."}
      </p>
      {resetErrorBoundary && (
        <button
          onClick={resetErrorBoundary}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Try again
        </button>
      )}
    </div>
  );
}

// Simple error boundary class
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode | ((props: ErrorFallbackProps) => React.ReactNode);
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.props.onError?.(error, errorInfo);
    console.error("Error boundary caught an error:", error, errorInfo);
  }

  resetErrorBoundary = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      const { fallback } = this.props;

      if (typeof fallback === "function") {
        return fallback({
          error: this.state.error,
          resetErrorBoundary: this.resetErrorBoundary,
        });
      }

      if (fallback) {
        return fallback;
      }

      return (
        <ErrorFallback
          error={this.state.error}
          resetErrorBoundary={this.resetErrorBoundary}
        />
      );
    }

    return this.props.children;
  }
}

// Suspense wrapper with default loading
interface SuspenseWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function SuspenseWrapper({ children, fallback }: SuspenseWrapperProps) {
  return (
    <Suspense
      fallback={
        fallback || (
          <div className="flex items-center justify-center p-8">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )
      }
    >
      {children}
    </Suspense>
  );
}

// Lazy load with named export support
export function lazyWithPreload<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  preload = false,
): React.LazyExoticComponent<T> & { preload: () => Promise<{ default: T }> } {
  const Component = lazy(factory) as React.LazyExoticComponent<T> & {
    preload: () => Promise<{ default: T }>;
  };

  Component.preload = factory;

  if (preload) {
    factory();
  }

  return Component;
}

// Intersection observer hook for lazy loading
export function useLazyLoad(
  ref: React.RefObject<HTMLElement>,
  options?: IntersectionObserverInit,
) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasIntersected, setHasIntersected] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
        if (entry.isIntersecting && !hasIntersected) {
          setHasIntersected(true);
        }
      },
      {
        rootMargin: "100px",
        threshold: 0,
        ...options,
      },
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [ref, options, hasIntersected]);

  return { isIntersecting, hasIntersected };
}

// Lazy load wrapper component
interface LazyLoadProps {
  children: React.ReactNode;
  placeholder?: React.ReactNode;
  rootMargin?: string;
  threshold?: number;
}

export function LazyLoad({
  children,
  placeholder,
  rootMargin = "100px",
  threshold = 0,
}: LazyLoadProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const { hasIntersected } = useLazyLoad(ref, { rootMargin, threshold });

  return (
    <div ref={ref}>
      {hasIntersected ? children : placeholder || <Skeleton height={200} />}
    </div>
  );
}
