import { supabase } from '../../supabase/client';
import { ok, fail, type WriteResult } from '../../lib/result';
import {
  CustomerProfile
} from '../../../types';
import { SEED_CUSTOMER_PROFILES } from './seed';
import { readFromStorage, writeToStorage, STORAGE_KEYS } from './storage';



// ----------------------------------------------------------------------------
// 6. CUSTOMER PROFILES (customer_profiles)
// ----------------------------------------------------------------------------
export async function getCustomerProfiles(): Promise<CustomerProfile[]> {
  try {
    const { data, error } = await supabase.from('customer_profiles').select('*').order('created_at', { ascending: false });
    if (!error && data && data.length > 0) {
      const mapped: CustomerProfile[] = data.map((d: any) => ({
        id: d.id,
        userId: d.user_id,
        companyName: d.company_name,
        taxId: d.tax_id,
        billingEmail: d.billing_email,
        preferredPaymentMethod: d.preferred_payment_method || 'vietqr',
        defaultShippingAddress: d.default_shipping_address || {},
        ndaSigned: Boolean(d.nda_signed),
        ndaSignedAt: d.nda_signed_at,
        createdAt: d.created_at,
        updatedAt: d.updated_at
      }));
      writeToStorage(STORAGE_KEYS.CUSTOMER_PROFILES, mapped);
      return mapped;
    }
  } catch (e) {
    console.warn('[WorkshopService] Supabase getCustomerProfiles fallback to local:', e);
  }
  return readFromStorage<CustomerProfile[]>(STORAGE_KEYS.CUSTOMER_PROFILES, SEED_CUSTOMER_PROFILES);
}

export async function getCustomerProfileById(id: string): Promise<CustomerProfile | null> {
  const list = await getCustomerProfiles();
  return list.find(c => c.id === id) || null;
}

export async function getCustomerProfileByUserId(userId: string): Promise<CustomerProfile | null> {
  const list = await getCustomerProfiles();
  return list.find(c => c.userId === userId) || null;
}

export async function saveCustomerProfile(
  profile: Partial<CustomerProfile> & { userId: string }
): Promise<WriteResult<CustomerProfile>> {
  const now = new Date().toISOString();
  const id = profile.id || `cust_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const fullProfile: CustomerProfile = {
    id,
    userId: profile.userId,
    companyName: profile.companyName,
    taxId: profile.taxId,
    billingEmail: profile.billingEmail,
    preferredPaymentMethod: profile.preferredPaymentMethod || 'vietqr',
    defaultShippingAddress: profile.defaultShippingAddress || {},
    ndaSigned: Boolean(profile.ndaSigned),
    ndaSignedAt: profile.ndaSigned ? (profile.ndaSignedAt || now) : undefined,
    createdAt: profile.createdAt || now,
    updatedAt: now
  };

  const local = readFromStorage<CustomerProfile[]>(STORAGE_KEYS.CUSTOMER_PROFILES, SEED_CUSTOMER_PROFILES);
  writeToStorage(STORAGE_KEYS.CUSTOMER_PROFILES, [fullProfile, ...local.filter(c => c.id !== id)]);

  try {
    const { error } = await supabase.from('customer_profiles').upsert({
      id: fullProfile.id,
      user_id: fullProfile.userId,
      company_name: fullProfile.companyName,
      tax_id: fullProfile.taxId,
      billing_email: fullProfile.billingEmail,
      preferred_payment_method: fullProfile.preferredPaymentMethod,
      default_shipping_address: fullProfile.defaultShippingAddress,
      nda_signed: fullProfile.ndaSigned,
      nda_signed_at: fullProfile.ndaSignedAt,
      updated_at: fullProfile.updatedAt
    });
    if (error) throw error;
    return ok(fullProfile);
  } catch (e: any) {
    return fail(e, 'Không lưu được hồ sơ khách hàng.');
  }
}

export async function deleteCustomerProfile(id: string): Promise<WriteResult> {
  const local = readFromStorage<CustomerProfile[]>(STORAGE_KEYS.CUSTOMER_PROFILES, SEED_CUSTOMER_PROFILES);
  writeToStorage(STORAGE_KEYS.CUSTOMER_PROFILES, local.filter(c => c.id !== id));
  try {
    const { error } = await supabase.from('customer_profiles').delete().eq('id', id);
    if (error) throw error;
    return ok();
  } catch (e: any) {
    return fail(e, 'Không xoá được hồ sơ khách hàng.');
  }
}