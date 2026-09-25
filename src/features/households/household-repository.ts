import { supabase } from '../../lib/supabase';
import { Family, Household, Member } from './household-domain';

function requireSupabase() {
  if (!supabase) throw new Error('Thiếu cấu hình Supabase.');
  return supabase;
}

type RpcMember = { id: string; fullName: string; dharmaName?: string | null; yearOfBirth?: number | null };
type RpcFamily = { id: string; businessNumber: number; address: string; members: RpcMember[] };
type RpcHousehold = { id: string; businessNumber: number; legacyNumber?: number | null; families: RpcFamily[] };

function mapMember(member: RpcMember): Member {
  return { id: member.id, fullName: member.fullName, ...(member.dharmaName ? { dharmaName: member.dharmaName } : {}), ...(member.yearOfBirth ? { yearOfBirth: member.yearOfBirth } : {}) };
}

function mapHousehold(row: RpcHousehold): Household {
  return {
    id: row.id,
    businessNumber: row.businessNumber,
    ...(row.legacyNumber ? { oldNumber: row.legacyNumber } : {}),
    families: row.families.map((family) => ({ id: family.id, businessNumber: family.businessNumber, address: family.address, members: family.members.map(mapMember) })),
  };
}

export async function createHousehold(household: Household): Promise<Household> {
  const client = requireSupabase();
  const { data, error } = await client.rpc('create_household', {
    p_legacy_number: household.oldNumber ?? null,
    p_families: household.families.map((family) => ({
      address: family.address,
      members: family.members.map((member) => ({ fullName: member.fullName, dharmaName: member.dharmaName ?? null, yearOfBirth: member.yearOfBirth ?? null })),
    })),
  });
  if (error) throw new Error(error.message.includes('duplicate') ? 'Mã hộ đã tồn tại.' : error.message);
  return mapHousehold(data as RpcHousehold);
}
