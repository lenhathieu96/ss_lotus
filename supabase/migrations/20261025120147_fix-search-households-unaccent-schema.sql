begin;

create or replace function public.search_households_v2(p_pagoda_id uuid, p_query text, p_limit integer default 50)
returns table(id uuid, business_number integer, legacy_number integer, addresses text[], family_count integer, member_count integer, head_member jsonb)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.has_pagoda_access(p_pagoda_id) then perform public.raise_household_error('AUTH_REQUIRED'); end if;
  if nullif(btrim(p_query), '') is null then return; end if;
  return query
  select h.id, h.business_number, h.legacy_number,
    array_agg(distinct f.address order by f.address), count(distinct f.id)::integer, count(m.id)::integer,
    (select jsonb_build_object('id', hm.id, 'fullName', hm.full_name, 'dharmaName', hm.dharma_name)
      from public.families hf join public.members hm on hm.pagoda_id = hf.pagoda_id and hm.family_id = hf.id
      where hf.pagoda_id = p_pagoda_id and hf.household_id = h.id and hf.merged_into_family_id is null and hm.archived_at is null
      order by hf.position, hf.id, hm.position, hm.id limit 1)
  from public.households h join public.families f on f.pagoda_id = h.pagoda_id and f.household_id = h.id and f.merged_into_family_id is null
    left join public.members m on m.pagoda_id = f.pagoda_id and m.family_id = f.id and m.archived_at is null
  where h.pagoda_id = p_pagoda_id and (
    h.business_number::text = btrim(p_query) or h.legacy_number::text = btrim(p_query) or f.business_number::text = btrim(p_query)
    or public.unaccent(lower(f.address)) like '%' || public.unaccent(lower(btrim(p_query))) || '%'
    or exists (select 1 from public.members sm where sm.pagoda_id = p_pagoda_id and sm.family_id = f.id and sm.archived_at is null and (public.unaccent(lower(sm.full_name)) like '%' || public.unaccent(lower(btrim(p_query))) || '%' or public.unaccent(lower(coalesce(sm.dharma_name, ''))) like '%' || public.unaccent(lower(btrim(p_query))) || '%'))
  ) group by h.id, h.business_number, h.legacy_number order by h.business_number limit least(greatest(coalesce(p_limit, 50), 1), 50);
end;
$$;

revoke all on function public.search_households_v2(uuid, text, integer) from public, anon;
grant execute on function public.search_households_v2(uuid, text, integer) to authenticated;
commit;
