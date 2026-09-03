const dateFmt = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
});

export function formatDate(value: Date): string {
  return dateFmt.format(value);
}

export function formatRange(start: Date, end?: Date): string {
  if (!end) return formatDate(start);
  return `${formatDate(start)} — ${formatDate(end)}`;
}
