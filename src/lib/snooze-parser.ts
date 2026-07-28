export function parseSnoozePhrase(phrase: string): Date | null {
  const clean = phrase.toLowerCase().trim();
  const now = new Date();

  // Handle minutes: "in 30 minutes", "30m", "30 mins"
  if (clean.includes('minute') || clean.endsWith('m') || clean.includes('min')) {
    const num = parseInt(clean.replace(/[^0-9]/g, ''), 10);
    if (!isNaN(num)) return new Date(now.getTime() + num * 60 * 1000);
  }

  // Handle hours: "in 1 hour", "1h", "2 hours"
  if (clean.includes('hour') || clean.endsWith('h') || clean.includes('hr')) {
    const num = parseInt(clean.replace(/[^0-9]/g, ''), 10);
    if (!isNaN(num)) return new Date(now.getTime() + num * 60 * 60 * 1000);
  }

  // Handle days: "in 1 day", "1d", "2 days"
  if (clean.includes('day') || clean.endsWith('d')) {
    const num = parseInt(clean.replace(/[^0-9]/g, ''), 10);
    if (!isNaN(num)) return new Date(now.getTime() + num * 24 * 60 * 60 * 1000);
  }

  // Handle weeks: "in 1 week", "1w", "2 weeks"
  if (clean.includes('week') || clean.endsWith('w')) {
    const num = parseInt(clean.replace(/[^0-9]/g, ''), 10);
    if (!isNaN(num)) return new Date(now.getTime() + num * 7 * 24 * 60 * 60 * 1000);
  }

  // "tomorrow"
  if (clean === 'tomorrow') {
    const tomorrow = new Date();
    tomorrow.setDate(now.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0); // 9:00 AM
    return tomorrow;
  }

  // "next week"
  if (clean === 'next week') {
    const nextWeek = new Date();
    nextWeek.setDate(now.getDate() + 7);
    nextWeek.setHours(9, 0, 0, 0); // 9:00 AM
    return nextWeek;
  }

  // "tonight"
  if (clean === 'tonight') {
    const tonight = new Date();
    tonight.setHours(20, 0, 0, 0); // 8:00 PM
    return tonight;
  }

  // "after lunch"
  if (clean === 'after lunch') {
    const afterLunch = new Date();
    afterLunch.setHours(13, 0, 0, 0); // 1:00 PM
    return afterLunch;
  }

  // Generic ISO or standard date parsing fallback
  const parsed = Date.parse(phrase);
  if (!isNaN(parsed)) {
    return new Date(parsed);
  }

  return null;
}
