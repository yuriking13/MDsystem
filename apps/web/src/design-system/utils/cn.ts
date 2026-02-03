import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility function to merge Tailwind CSS classes with clsx
 * Resolves conflicts by keeping the last class
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
