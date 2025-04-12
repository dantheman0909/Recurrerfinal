import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a number as Indian Rupee currency
 * @param value - The value to format
 * @returns Formatted string with ₹ symbol
 */
export function formatCurrency(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return '₹0';
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  return `₹${numValue.toLocaleString('en-IN')}`;
}
