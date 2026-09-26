-- Historical compatibility marker.
--
-- The preceding initial schema migration already creates the normalized public
-- tables and security primitives used by this application. The former contents
-- of this migration attempted to re-create those same objects, which made a
-- clean `supabase db reset` fail. Existing deployments have already recorded
-- this version; a new, explicit migration owns any future schema evolution.
select 1;
