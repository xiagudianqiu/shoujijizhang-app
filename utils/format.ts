// Formats cents to localized currency string (CNY)
export const formatCurrency = (cents: number): string => {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(cents / 100);
};

// Formats cents to a simple decimal string for input displays (e.g. 12.50)
export const centsToDecimal = (cents: number): string => {
  return (cents / 100).toFixed(2);
};

export const formatDate = (timestamp: number): string => {
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false
  }).format(new Date(timestamp));
};

export const formatDateHeader = (dateStr: string): string => {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) {
    return '今天';
  }
  if (d.toDateString() === yesterday.toDateString()) {
    return '昨天';
  }

  return new Intl.DateTimeFormat('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'short'
  }).format(d);
};