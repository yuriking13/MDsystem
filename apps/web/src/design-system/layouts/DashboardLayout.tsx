import { type ReactNode } from "react";
import { cn } from "../utils/cn";

export interface DashboardLayoutProps {
  /** Main dashboard content */
  children: ReactNode;
  /** Sidebar navigation */
  sidebar?: ReactNode;
  /** Top navigation bar */
  navbar?: ReactNode;
  /** Additional class name */
  className?: string;
}

/**
 * Dashboard layout with sidebar and navbar
 *
 * @example
 * ```tsx
 * <DashboardLayout
 *   navbar={<Navbar />}
 *   sidebar={<Navigation />}
 * >
 *   <DashboardContent />
 * </DashboardLayout>
 * ```
 */
export function DashboardLayout({
  children,
  sidebar,
  navbar,
  className,
}: DashboardLayoutProps) {
  return (
    <div className={cn("flex h-screen flex-col", className)}>
      {/* Navbar */}
      {navbar && (
        <header className="flex-shrink-0 border-b border-neutral-200 dark:border-neutral-800">
          {navbar}
        </header>
      )}

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {sidebar}

        {/* Main content */}
        <main className="flex-1 overflow-y-auto bg-neutral-50 dark:bg-neutral-950">
          <div className="container-custom section-padding">{children}</div>
        </main>
      </div>
    </div>
  );
}
