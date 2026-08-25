const dateOnlyFormat = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'UTC',
});

const timeOnlyFormat = new Intl.DateTimeFormat('ru-RU', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  timeZone: 'UTC',
});

/**
 * README описывает формат дат как [Year, Day, Hour, Minute, Second, NanoSecond],
 * где Day — день года (1-366). Наносекунды игнорируем.
 */
export function dateTimeToTimestamp(value) {
  if (value == null) return NaN;

  if (Array.isArray(value) && value.length >= 5) {
    const [year, dayOfYear, hour = 0, minute = 0, second = 0] = value;
    if (dayOfYear >= 1 && dayOfYear <= 366) {
      const date = new Date(Date.UTC(year, 0, 1));
      date.setUTCDate(dayOfYear);
      date.setUTCHours(hour, minute, second, 0);
      return date.getTime();
    }
  }

  return new Date(value).getTime();
}

export function formatDateParts(value) {
  const timestamp = dateTimeToTimestamp(value);
  if (Number.isNaN(timestamp)) return null;
  const date = new Date(timestamp);
  return {
    date: dateOnlyFormat.format(date),
    time: timeOnlyFormat.format(date),
  };
}

export function normalizeToken(value) {
  if (value == null) return '';
  if (Array.isArray(value)) {
    try {
      return new TextDecoder('utf-8', { fatal: false }).decode(Uint8Array.from(value));
    } catch {
      return value.join('');
    }
  }
  return String(value);
}

export function maskToken(token) {
  const text = String(token ?? '');
  if (!text) return '';
  if (text.length <= 8) return '•'.repeat(text.length);
  return `${text.slice(0, 4)}${'•'.repeat(6)}${text.slice(-4)}`;
}
