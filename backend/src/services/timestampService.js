/**
 * Service for handling timestamp conversions between UTC and local timezone
 */

const TIMEZONE = 'Asia/Manila';

/**
 * Convert UTC timestamp to Philippine timezone and format as date label
 * @param {Date|string} timestamp - UTC timestamp
 * @returns {string} Formatted date label (e.g., "January 15, 2026")
 */
const toLocaleDateLabel = (timestamp) => {
  const d = new Date(timestamp);
  return d.toLocaleDateString('en-PH', { 
    timeZone: TIMEZONE,
    month: "long", 
    day: "numeric", 
    year: "numeric" 
  });
};

/**
 * Convert UTC timestamp to Philippine timezone and format as time string
 * @param {Date|string} timestamp - UTC timestamp
 * @returns {string} Formatted time (e.g., "02:30 PM")
 */
const toLocaleTimeString = (timestamp) => {
  const d = new Date(timestamp);
  return d.toLocaleTimeString('en-PH', { 
    timeZone: TIMEZONE,
    hour: "2-digit", 
    minute: "2-digit" 
  });
};

/**
 * Convert UTC timestamp to Philippine timezone and format as sortable datetime string
 * @param {Date|string} timestamp - UTC timestamp
 * @returns {string} Formatted datetime (e.g., "2026-01-15 14:30:45")
 */
const toLocaleDateTimeString = (timestamp) => {
  const d = new Date(timestamp);
  const phTime = d.toLocaleString('en-US', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  // Parse the formatted time to create a consistent key (YYYY-MM-DD HH:mm:ss)
  const [datePart, timePart] = phTime.split(', ');
  const [month, day, year] = datePart.split('/');
  return `${year}-${month}-${day} ${timePart}`;
};

/**
 * Convert UTC timestamp to Philippine timezone Date object
 * @param {Date|string} timestamp - UTC timestamp
 * @returns {Date} Date object adjusted to Philippine timezone
 */
const toLocaleDate = (timestamp) => {
  return new Date(timestamp);
};

module.exports = {
  toLocaleDateLabel,
  toLocaleTimeString,
  toLocaleDateTimeString,
  toLocaleDate,
  TIMEZONE
};
