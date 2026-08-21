import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function getErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  if (error && typeof error === "object" && "data" in error) {
    const data = (error as { data?: unknown }).data;
    if (data && typeof data === "object") {
      const errs = (data as any).errors;
      if (Array.isArray(errs) && errs.length > 0 && errs[0]?.msg) {
        return errs[0].msg;
      }
      if (typeof (data as any).message === "string") {
        return (data as any).message;
      }
    }
  }
  return fallback;
}
