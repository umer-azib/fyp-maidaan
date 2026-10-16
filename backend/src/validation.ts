import { z } from 'zod';
import { capacityForFormat, formats } from '../../shared/formats';
import { sports } from '../../shared/tokens';

const skill = z.enum(['All levels', 'Beginner', 'Intermediate', 'Advanced']);
const slug = z.string().regex(/^[a-z0-9-]{1,80}$/);
export const idSchema = z.uuid();
export const pageSchema = z.object({ page: z.coerce.number().int().min(1).max(10000).default(1), pageSize: z.coerce.number().int().min(1).max(50).default(20) });
export const filterSchema = pageSchema.extend({
  cityId: slug.default('lahore'), areaId: slug.optional(), latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(), radiusKm: z.coerce.number().min(1).max(100).default(20),
}).refine(v => (v.latitude === undefined) === (v.longitude === undefined), 'Provide both coordinates.');
export const gameSchema = z.object({
  sport: z.enum(sports), title: z.string().trim().min(1).max(120), description: z.string().trim().min(1).max(2000),
  cityId: slug, areaId: slug.nullable(), venueId: z.uuid().nullish(), venue: z.string().trim().min(1).max(160), location: z.string().trim().min(1).max(200),
  latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180),
  startsAt: z.iso.datetime({ offset: true }).refine(v => Date.parse(v) > Date.now(), 'Choose a future start time.'),
  duration: z.number().int().min(15).max(720), maxPlayers: z.number().int().min(2).max(100), skill,
  joinMode: z.enum(['instant', 'request']), format: z.string().max(20), bookingSource: z.literal('external'), visibility:z.enum(['public','private']).optional(),
}).strict().superRefine((g,ctx) => {
  if (!formats[g.sport].includes(g.format) || (capacityForFormat(g.format) !== undefined && capacityForFormat(g.format) !== g.maxPlayers))
    ctx.addIssue({ code: 'custom', message: 'Choose a format and matching player capacity.', path: ['format'] });
});
export const actionSchema = z.discriminatedUnion('type', [
  z.object({type:z.enum(['join','leave','cancel','waitlist','leave_waitlist','complete'])}).strict(),
  z.object({type:z.enum(['approve','reject']),playerId:z.uuid()}).strict(),
  z.object({type:z.literal('edit'),input:gameSchema}).strict(),
]);
export const profileSchema = z.object({
  name:z.string().trim().min(1).max(80), username:z.string().regex(/^[a-z0-9_]{3,30}$/).nullable(),bio:z.string().max(1000),
  cityId:slug,areaId:slug.nullable(),avatarPath:z.string().max(240).nullable(),
  sports:z.array(z.object({sport:z.enum(sports),skill,positions:z.array(z.string().max(40)).max(12),formats:z.array(z.string().max(20)).max(12)}).strict()).max(4),
}).strict().refine(p => new Set(p.sports.map(s=>s.sport)).size===p.sports.length, 'Choose each sport once.');
