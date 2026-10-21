import { supabase } from '../../supabase/client';
import { ok, fail, type WriteResult } from '../../lib/result';
import {
  DesignerProfile
} from '../../../types';
import { SEED_DESIGNER_PROFILES } from './seed';
import { readFromStorage, writeToStorage, STORAGE_KEYS } from './storage';



// ----------------------------------------------------------------------------
// 5. DESIGNER PROFILES (designer_profiles)
// ----------------------------------------------------------------------------
export async function getDesignerProfiles(): Promise<DesignerProfile[]> {
  try {
    // Cột AN TOÀN — không dùng select('*') để tương thích migration T0A-3 (grant theo cột).
    // KHÔNG thêm bank_name/bank_account/tax_id; payout info sẽ đọc qua RPC sau T0A-4.
    const { data, error } = await supabase
      .from('designer_profiles')
      .select(
        'id, user_id, display_name, bio, portfolio_url, avatar_url, royalty_percent, verified_status, rating, total_sales, created_at, updated_at'
      )
      .order('created_at', { ascending: false });
    if (!error && data && data.length > 0) {
      const mapped: DesignerProfile[] = data.map((d: any) => ({
        id: d.id,
        userId: d.user_id,
        displayName: d.display_name,
        bio: d.bio,
        avatarUrl: d.avatar_url,
        coverUrl: d.cover_url,
        socialLinks: d.social_links || {},
        defaultRoyaltyPercent: Number(d.default_royalty_percent || 10),
        licenseMode: d.license_mode || 'PrintOnly',
        badgeTier: d.badge_tier || 'Standard',
        payoutBankInfo: d.payout_bank_info,
        totalSalesCount: Number(d.total_sales_count || 0),
        totalRoyaltiesEarned: Number(d.total_royalties_earned || 0),
        createdAt: d.created_at,
        updatedAt: d.updated_at
      }));
      writeToStorage(STORAGE_KEYS.DESIGNER_PROFILES, mapped);
      return mapped;
    }
  } catch (e) {
    console.warn('[WorkshopService] Supabase getDesignerProfiles fallback to local:', e);
  }
  return readFromStorage<DesignerProfile[]>(STORAGE_KEYS.DESIGNER_PROFILES, SEED_DESIGNER_PROFILES);
}

export async function getDesignerProfileById(id: string): Promise<DesignerProfile | null> {
  const list = await getDesignerProfiles();
  return list.find(d => d.id === id) || null;
}

export async function getDesignerProfileByUserId(userId: string): Promise<DesignerProfile | null> {
  const list = await getDesignerProfiles();
  return list.find(d => d.userId === userId) || null;
}

export async function saveDesignerProfile(
  profile: Partial<DesignerProfile> & { userId: string; displayName: string }
): Promise<WriteResult<DesignerProfile>> {
  const now = new Date().toISOString();
  const id = profile.id || `des_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const fullProfile: DesignerProfile = {
    id,
    userId: profile.userId,
    displayName: profile.displayName,
    bio: profile.bio,
    avatarUrl: profile.avatarUrl,
    coverUrl: profile.coverUrl,
    socialLinks: profile.socialLinks || {},
    defaultRoyaltyPercent: profile.defaultRoyaltyPercent ?? 10,
    licenseMode: profile.licenseMode || 'PrintOnly',
    badgeTier: profile.badgeTier || 'Standard',
    payoutBankInfo: profile.payoutBankInfo,
    totalSalesCount: profile.totalSalesCount ?? 0,
    totalRoyaltiesEarned: profile.totalRoyaltiesEarned ?? 0,
    createdAt: profile.createdAt || now,
    updatedAt: now
  };

  const local = readFromStorage<DesignerProfile[]>(STORAGE_KEYS.DESIGNER_PROFILES, SEED_DESIGNER_PROFILES);
  writeToStorage(STORAGE_KEYS.DESIGNER_PROFILES, [fullProfile, ...local.filter(d => d.id !== id)]);

  try {
    const { error } = await supabase.from('designer_profiles').upsert({
      id: fullProfile.id,
      user_id: fullProfile.userId,
      display_name: fullProfile.displayName,
      bio: fullProfile.bio,
      avatar_url: fullProfile.avatarUrl,
      cover_url: fullProfile.coverUrl,
      social_links: fullProfile.socialLinks,
      default_royalty_percent: fullProfile.defaultRoyaltyPercent,
      license_mode: fullProfile.licenseMode,
      badge_tier: fullProfile.badgeTier,
      payout_bank_info: fullProfile.payoutBankInfo,
      total_sales_count: fullProfile.totalSalesCount,
      total_royalties_earned: fullProfile.totalRoyaltiesEarned,
      updated_at: fullProfile.updatedAt
    });
    if (error) throw error;
    return ok(fullProfile);
  } catch (e: any) {
    return fail(e, 'Không lưu được hồ sơ designer.');
  }
}

export async function deleteDesignerProfile(id: string): Promise<WriteResult> {
  const local = readFromStorage<DesignerProfile[]>(STORAGE_KEYS.DESIGNER_PROFILES, SEED_DESIGNER_PROFILES);
  writeToStorage(STORAGE_KEYS.DESIGNER_PROFILES, local.filter(d => d.id !== id));
  try {
    const { error } = await supabase.from('designer_profiles').delete().eq('id', id);
    if (error) throw error;
    return ok();
  } catch (e: any) {
    return fail(e, 'Không xoá được hồ sơ designer.');
  }
}