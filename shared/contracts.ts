import type { Game, GameInput } from './games';
import type { Sport } from './tokens';

export type City = { id: string; name: string; country: 'PK'; timezone: string };
export type Area = { id: string; cityId: string; name: string };
export type LocationFilter = { cityId: string; areaId?: string; latitude?: number; longitude?: number; radiusKm?: number };
export type SportProfile = { sport: Sport; skill: Game['skill']; positions: string[]; formats: string[] };
export type Profile = {
  id: string; name: string; username: string | null; bio: string; cityId: string; areaId: string | null;
  avatarPath: string | null; avatarUrl?: string | null; sports: SportProfile[]; emailVerified?:boolean; dateOfBirth?:string|null; preferredAreas?:string[]; availability?:{dayOfWeek:number;startsAt:string;endsAt:string}[];
};
export type ProfileInput = Omit<Profile, 'id' | 'avatarUrl'>;
export type CourtHours = { dayOfWeek: number; opensAt: string; closesAt: string; slotMinutes: number; pricePkr: number | null };
export type Court = { id: string; name: string; sport: Sport; active: boolean; formats?:string[]; photos?:string[]; hours: CourtHours[] };
export type Venue = {
  id: string; name: string; description: string; address: string; cityId: string; areaId: string | null;
  latitude: number; longitude: number; phone: string | null; facilities: string[]; photos: string[];
  source: 'onboarded' | 'places' | 'directory'; directory?:{sourceId:string;area:string;sports:Sport[];sources:string[];verifiedAt:string;website:string|null;coordinateBasis:string;demoManaged?:boolean;demoUsername?:string;demoOverrides?:Record<string,unknown>}; verified: boolean; developmentFixture?:boolean; sports: Sport[]; distanceKm?: number;
};
export type VenueDetail = Venue & { courts: Court[]; bookingEnabled: boolean };
export type Availability = { courtId: string; date: string; timezone: string; hours: CourtHours[]; slots?: Slot[]; bookingEnabled: boolean; message: string };
export type Access = { player: true; venueManager: boolean; admin: boolean };
export type Page<T> = { data: T[]; page: number; pageSize: number; total: number };
export type ApiErrorBody = { error: { code: string; message: string; requestId: string } };
export type LiveGameInput = GameInput & { cityId: string; areaId: string | null; format: string; bookingSource: 'external'; venueId?: string | null };

export function profileCompleteness(profile: Profile): number {
  const fields = [profile.name.trim(), profile.username, profile.bio.trim(), profile.cityId, profile.areaId, profile.avatarPath, profile.sports.length];
  return Math.round(fields.filter(Boolean).length / fields.length * 100);
}

export type Slot={startsAt:string;endsAt:string;pricePkr:number;available:boolean;status?:'available'|'booked'|'blocked'|'unavailable'};
export type Booking={id:string;courtId:string;playerId:string;startsAt:string;endsAt:string;status:'pending'|'confirmed'|'completed'|'cancelled'|'expired';paymentMethod:string;pricePkr:number;venueId:string;venueName:string;courtName:string;sport:Sport;playerName:string;offline:boolean;paymentStatus:string;paidPkr:number};
export type ManagedVenue=VenueDetail&{approvalStatus:'pending'|'approved'|'rejected'|'suspended';confirmationMode:'instant'|'manual';rules:string;cancellationPolicy:string;media?:{id:string;path:string;url:string;kind:'photo'|'document';courtId:string|null}[];documents?:{path:string;url:string}[]};

export type Announcement={id:string;title:string;body:string;imageUrl:string|null;ctaLabel:string|null;ctaLink:string|null;display:'banner'|'popup'|'bottom-sheet';platform:'all'|'web'|'mobile';audience:'player'|'owner'|'all';cityId:string|null;page:'discover'|'games'|'bookings'|'profile'|'all';active:boolean;startsAt:string;endsAt:string|null;priority:number;frequency:'always'|'session'|'once';dismissible:boolean};
