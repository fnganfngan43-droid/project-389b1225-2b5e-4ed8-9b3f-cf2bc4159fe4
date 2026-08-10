import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function sortByNumberDesc<T>(items: T[], getNumber: (item: T) => string): T[] {
  return [...items].sort((a, b) => {
    const na = parseInt(getNumber(a), 10) || 0;
    const nb = parseInt(getNumber(b), 10) || 0;
    return nb - na;
  });
}

