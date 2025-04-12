/**
 * Generate dates for the current week (Monday-Sunday)
 * Returns dates in "DD/MM" format
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