import { type ReactNode } from "react";
import { cn } from "../utils/cn";

export interface EditorLayoutProps {
  /** Main editor content */
  children: ReactNode;
  /** Left sidebar */
  leftSidebar?: ReactNode;
  /** Right sidebar */
  rightSidebar?: ReactNode;
  /** Header */
  header?: ReactNode;
  /** Footer/Status bar */
  footer?: ReactNode;
  /** Additional class name */
  className?: string;
}

/**
 * Three-panel editor layout with optional sidebars
 * Used for document editor with outline and bibliography
 *
 * @example
 * ```tsx
 * <EditorLayout
 *   header={<EditorHeader />}
 *   leftSidebar={<DocumentOutline />}
 *   rightSidebar={<Bibliography />}
 *   footer={<StatusBar />}
 * >
 *   <TiptapEditor />
 * </EditorLayout>
 * ```
 */
export function EditorLayout({
  children,
  leftSidebar,
  rightSidebar,
  header,
  footer,
  className,
}: EditorLayoutProps) {
  return (
    <div className={cn("flex h-screen flex-col", className)}>
      {/* Header */}
      {header && (
        <header className="shrink-0 border-b border-neutral-200 dark:border-neutral-800">
          {header}
        </header>
      )}

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar */}
        {leftSidebar}

        {/* Center content */}
        <main className="flex-1 overflow-y-auto bg-neutral-50 dark:bg-neutral-950">
          {children}
        </main>

        {/* Right sidebar */}
        {rightSidebar}
      </div>

      {/* Footer/Status bar */}
      {footer && (
        <footer className="shrink-0 border-t border-neutral-200 dark:border-neutral-800">
          {footer}
        </footer>
      )}
    </div>
  );
}
