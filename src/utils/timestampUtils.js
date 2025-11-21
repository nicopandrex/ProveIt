/**
 * Format post timestamps with smart contextual display
 * - Today: "11:25PM"
 * - This week: "Monday", "Tuesday" 
 * - Older: "Dec 25", "Nov 30, 2022"
 */
export const formatPostTimestamp = (timestamp) => {
  if (!timestamp) return 'Unknown time';
  
  const now = new Date();
  const postDate = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  
  // Check if it's today
  const isToday = postDate.toDateString() === now.toDateString();
  
  if (isToday) {
    // Show time like "11:25PM"
    return postDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }
  
  // Check if it's within the same week
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const isThisWeek = postDate > weekAgo;
  
  if (isThisWeek) {
    // Show day of week like "Monday", "Tuesday"
    return postDate.toLocaleDateString('en-US', { weekday: 'long' });
  }
  
  // Show date like "Dec 25" or "Dec 25, 2022" (year only if different year)
  const currentYear = now.getFullYear();
  const postYear = postDate.getFullYear();
  
  if (postYear === currentYear) {
    return postDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  } else {
    return postDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }
};



