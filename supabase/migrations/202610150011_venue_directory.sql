begin;
-- Public research is distinct from owner verification and never creates inventory.
alter table public.venues drop constraint venues_source_check;
alter table public.venues add constraint venues_source_check check(source in ('onboarded','places','directory'));
alter table public.venues add column directory_metadata jsonb;
alter table public.venues add constraint venues_directory_metadata_check check(directory_metadata is null or (source='directory' and jsonb_typeof(directory_metadata)='object'));
create unique index venues_directory_source_unique on public.venues((directory_metadata->>'sourceId')) where source='directory' and directory_metadata is not null;
comment on column public.venues.directory_metadata is 'Public directory provenance, verified coordinates, published sports and verification date; never managed availability or ownership verification.';
commit;
