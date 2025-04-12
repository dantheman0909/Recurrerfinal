import { MetricTimeframe } from '@shared/types';

/**
 * Helper function to generate dates for the current week (Monday-Sunday)
 */
export function generateWeekDates(): string[] {
  const today = new Date();
  const currentDay = today.getDay(); // 0 is Sunday, 1 is Monday, etc.
  const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay; // Calculate days to subtract to get to Monday
  
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);
  
  // Generate array of dates for the current week
  const weekDates = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    weekDates.push(date.getDate() + '/' + (date.getMonth() + 1));
  }
  
  return weekDates;
}

/**
 * Generates time series data based on the selected timeframe
 */
export function generateTimeseriesData(timeframe: MetricTimeframe) {
  switch (timeframe) {
    case 'weekly':
      return {
        months: generateWeekDates(),
        values: [35, 42, 38, 45, 40, 25, 30]
      };
    case 'monthly':
      return {
        months: ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'],
        values: [40, 28, 48, 56, 36, 52]
      };
    case 'quarterly':
      return {
        months: ['Q1', 'Q2', 'Q3', 'Q4'],
        values: [120, 145, 160, 175]
      };
    case 'yearly':
      return {
        months: ['2020', '2021', '2022', '2023', '2024'],
        values: [380, 420, 510, 580, 620]
      };
    default:
      return {
        months: ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'],
        values: [40, 28, 48, 56, 36, 52]
      };
  }
}