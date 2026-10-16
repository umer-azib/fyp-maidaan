import type { Sport } from './tokens';
export const formats: Record<Sport, string[]> = { Padel: ['1v1', '2v2'], Badminton: ['1v1', '2v2'], Football: ['5v5', '7v7', '11v11'], Cricket: ['Custom'] };
export function capacityForFormat(format: string): number | undefined {
  const match = /^(\d+)v\1$/.exec(format);
  return match ? Number(match[1]) * 2 : undefined;
}
export function newGameInput() {
  const start = new Date(Date.now() + 86400000);
  start.setMinutes(0, 0, 0);
  return { sport: 'Football' as const, title: '', description: '', location: '', latitude: 31.5204, longitude: 74.3587,
    venue: '', startsAt: start.toISOString(), duration: 90, maxPlayers: 10, skill: 'All levels' as const,
    joinMode: 'instant' as const, format: '5v5', bookingSource: 'external' as const };
}
