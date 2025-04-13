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
export function formatINR(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return '₹0.00';
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) {
    return '₹0.00';
  }
  
  // Format with Indian Rupee symbol and 2 decimal places using Intl.NumberFormat
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(numValue);
}

// Keep formatCurrency as an alias for backward compatibility
export const formatCurrency = formatINR;
