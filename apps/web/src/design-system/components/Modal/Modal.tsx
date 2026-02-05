import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { Fragment, type ReactNode } from "react";
import { cn } from "../../utils/cn";

export interface ModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Callback when modal should close */
  onClose: () => void;
  /** Modal title */
  title?: string;
  /** Modal content */
  children: ReactNode;
  /** Modal size */
  size?: "sm" | "md" | "lg" | "xl" | "full";
  /** Show close button */
  showCloseButton?: boolean;
  /** Additional class name */
  className?: string;
  /** Prevent closing on overlay click */
  preventClose?: boolean;
}

const sizeClasses = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  full: "max-w-7xl",
};

/**
 * Modal dialog component
 *
 * @example
 * ```tsx
 * <Modal open={isOpen} onClose={() => setIsOpen(false)} title="My Modal">
 *   <p>Modal content</p>
 * </Modal>
 * ```
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  size = "md",
  showCloseButton = true,
  className,
  preventClose = false,
}: ModalProps) {
  const handleClose = () => {
    if (!preventClose) {
      onClose();
    }
  };

  return (
    <Transition show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        {/* Backdrop */}
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-150"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        </TransitionChild>

        {/* Modal Content */}
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-6 lg:p-8">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-150"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-100"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <DialogPanel
                className={cn(
                  "w-full transform overflow-hidden rounded-lg bg-white dark:bg-neutral-900",
                  "border border-neutral-200 dark:border-neutral-800",
                  "text-left align-middle shadow-xl transition-all",
                  sizeClasses[size],
                  className,
                )}
              >
                {/* Header */}
                {(title || showCloseButton) && (
                  <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 px-6 py-4">
                    {title && (
                      <DialogTitle
                        as="h3"
                        className="text-lg font-semibold text-neutral-900 dark:text-neutral-100"
                      >
                        {title}
                      </DialogTitle>
                    )}
                    {showCloseButton && (
                      <button
                        type="button"
                        className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-500 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
                        onClick={onClose}
                      >
                        <span className="sr-only">Close</span>
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                )}

                {/* Body */}
                <div className="px-6 py-4">{children}</div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

// Modal sub-components
export interface ModalFooterProps {
  children: ReactNode;
  className?: string;
}

export function ModalFooter({ children, className }: ModalFooterProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-end gap-3 border-t border-neutral-200 dark:border-neutral-800 px-6 py-4",
        className,
      )}
    >
      {children}
    </div>
  );
}
