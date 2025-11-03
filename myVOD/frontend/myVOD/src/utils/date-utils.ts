/**
 * Utility functions for date formatting and manipulation
 */

/**
 * Formats a date string to Polish format: "[dzień] [miesiąc słownie] [rok]"
 * Example: "15 października 2023"
 */
export function formatLastCheckedDate(dateString: string): string {
  if (!dateString) {
    return 'nieznana data';
  }

  try {
    const date = new Date(dateString);

    // Validate date
    if (isNaN(date.getTime())) {
      return 'nieznana data';
    }

    const day = date.getDate();
    const year = date.getFullYear();

    // Polish month names
    const monthNames = [
      'stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca',
      'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'
    ];

    const monthName = monthNames[date.getMonth()];

    return `${day} ${monthName} ${year}`;
  } catch (error) {
    console.warn('Error formatting date:', error);
    return 'nieznana data';
  }
}

/**
 * Checks if a date string is valid
 */
export function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

/**
 * Formats a date for relative time display (e.g., "2 hours ago")
 * Note: This is a simple implementation. For production, consider using a library like date-fns
 */
export function formatRelativeTime(dateString: string): string {
  try {
    if (!dateString) {
      return 'nieznany czas';
    }

    const date = new Date(dateString);

    // Check if date is invalid
    if (isNaN(date.getTime())) {
      return 'nieznany czas';
    }

    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) return 'przed chwilą';
    if (diffInMinutes < 60) return `${diffInMinutes} min temu`;
    if (diffInHours < 24) return `${diffInHours} godz. temu`;
    if (diffInDays < 7) return `${diffInDays} dni temu`;

    // For older dates, use the formatted date
    return formatLastCheckedDate(dateString);
  } catch (error) {
    console.warn('Error formatting relative time:', error);
    return 'nieznany czas';
  }
}
