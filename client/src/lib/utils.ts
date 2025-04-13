import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format currency values (e.g. $10,000)
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}

// Format percentage values (e.g. 75%)
export function formatPercent(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value / 100);
}

// Format date to readable format (e.g. Jul 15, 2023)
export function formatDate(date: Date | string): string {
  if (!date) return '';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(dateObj);
}

// Calculate time ago string (e.g. "2 hours ago")
export function timeAgo(date: Date | string): string {
  if (!date) return '';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  const seconds = Math.floor((new Date().getTime() - dateObj.getTime()) / 1000);
  
  let interval = seconds / 31536000;
  if (interval > 1) {
    return Math.floor(interval) + ' years ago';
  }
  
  interval = seconds / 2592000;
  if (interval > 1) {
    return Math.floor(interval) + ' months ago';
  }
  
  interval = seconds / 86400;
  if (interval > 1) {
    return Math.floor(interval) + ' days ago';
  }
  
  interval = seconds / 3600;
  if (interval > 1) {
    return Math.floor(interval) + ' hours ago';
  }
  
  interval = seconds / 60;
  if (interval > 1) {
    return Math.floor(interval) + ' minutes ago';
  }
  
  return Math.floor(seconds) + ' seconds ago';
}

// Create gradient colors for charts
export function createChartGradient(ctx: CanvasRenderingContext2D, colors: string[]): CanvasGradient {
  const gradient = ctx.createLinearGradient(0, 0, 0, 400);
  gradient.addColorStop(0, colors[0]);
  gradient.addColorStop(1, colors[2] || colors[0]);
  return gradient;
}

// Convert status to display label
export function formatStatus(status: string): string {
  return status
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Truncate text with ellipsis
export function truncateText(text: string, maxLength: number = 30): string {
  if (!text) return '';
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

// Return appropriate color for status
export function getStatusColor(status: string): { bg: string, text: string } {
  switch (status) {
    case 'completed':
      return { bg: 'bg-green-100', text: 'text-green-800' };
    case 'in_progress':
      return { bg: 'bg-blue-100', text: 'text-blue-800' };
    case 'not_started':
      return { bg: 'bg-gray-100', text: 'text-gray-800' };
    case 'blocked':
      return { bg: 'bg-red-100', text: 'text-red-800' };
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-800' };
  }
}

// Generate chart colors based on our theme
export const chartColors = {
  teal: [
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))'
  ],
  categoryColors: [
    'hsl(var(--chart-1))',
    '#60A5FA',  // Blue
    '#F59E0B',  // Amber
    '#EC4899',  // Pink
    '#10B981',  // Green
    '#6366F1',  // Indigo
    '#EC4899',  // Rose
    '#8B5CF6',  // Purple
    '#6B7280'   // Gray
  ]
};
