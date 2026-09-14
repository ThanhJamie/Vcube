import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@backend/supabase/client';
import { AppUserProfile, UserRole } from '@/types';

export type AuthUser = SupabaseUser & {
  uid: string; // Alias for id to ensure backward compatibility
};

/**
 * Kết quả đăng ký tài khoản.
 * `hasSession === false` nghĩa là dự án đang BẬT xác nhận email: Supabase đã nhận yêu cầu
 * nhưng KHÔNG trả phiên, nên người dùng CHƯA đăng nhập. UI phải nói đúng điều đó thay vì
 * báo "đăng ký thành công với quyền X".
 */
export interface SignUpResult {
  hasSession: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  profile: AppUserProfile | null;
  role: UserRole;
  isLoggedIn: boolean;
  loading: boolean;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, name: string) => Promise<SignUpResult>;
  signInWithGoogle: () => Promise<void>;
  switchDemoRole: (role: UserRole) => Promise<void>;
  updateUserProfile: (updates: Partial<AppUserProfile>) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function wrapAuthUser(sbUser: SupabaseUser): AuthUser {
  return Object.assign(sbUser, { uid: sbUser.id });
}

function createProfileFromSupabaseUser(sbUser: SupabaseUser, defaultRole?: UserRole): AppUserProfile {
  const meta = sbUser.user_metadata || {};
  const email = sbUser.email || '';
  // KHÔNG suy vai trò từ email, KHÔNG tin user_metadata: cả hai đều do client kiểm soát.
  // Vai trò thật nằm ở public.user_profiles.role (được RLS bảo vệ) và được đối chiếu
  // ngay khi có session — xem resolveDbRole()/applyDbRole() bên dưới.
  const matchedRole: UserRole = defaultRole || 'customer';

  return {
    uid: sbUser.id,
    email: email,
    displayName: (meta.display_name as string) || (meta.full_name as string) || email.split('@')[0] || 'VCUBE Member',
    role: matchedRole,
    avatarUrl: (meta.avatar_url as string) || undefined,
    phone: (meta.phone as string) || undefined,
    company: (meta.company as string) || 'VCUBE R&D Network',
    engineerRank: (meta.engineer_rank as string) || (matchedRole === 'admin' ? 'Chief Production Engineer' : matchedRole === 'designer' ? 'Senior CAD Modeler' : 'Verified Pro Engineer'),
    designerBio: (meta.designer_bio as string) || undefined,
    specialties: (meta.specialties as string[]) || undefined,
    bankAccount: meta.bank_account || undefined,
    createdAt: sbUser.created_at || new Date().toISOString(),
    lastLoginAt: sbUser.last_sign_in_at || new Date().toISOString(),
  };
}

// Chỉ dùng cho tiện ích demo; quyền thật do DB quyết định.
const IS_DEV = process.env.NODE_ENV !== 'production';

/**
 * Bộ đổi GÓC NHÌN vai trò có khả dụng không (chỉ ở môi trường phát triển).
 * UI dùng cờ này để không mời gọi một chức năng sẽ không chạy ở bản phát hành.
 */
export const DEMO_ROLE_SWITCHER_ENABLED = IS_DEV;

/**
 * Đọc vai trò thật của người dùng từ public.user_profiles.
 * Bảng này có RLS: người dùng chỉ đọc được dòng của chính mình, admin đọc được tất cả.
 * Trả null nếu không đọc được (chưa có dòng profile / lỗi mạng) — khi đó giữ nguyên
 * vai trò mặc định 'customer' (fail-closed, không tự nâng quyền).
 */
async function resolveDbRole(userId: string): Promise<UserRole | null> {
  if (!isSupabaseConfigured || !userId) return null;
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle();
    if (error || !data?.role) return null;
    return data.role as UserRole;
  } catch {
    return null;
  }
}

/**
 * Đối chiếu vai trò trong profile với DB và cập nhật nếu khác.
 *
 * KHÔNG ghi localStorage: trạng thái đăng nhập và vai trò chỉ được suy ra từ phiên
 * Supabase Auth (getSession + onAuthStateChange) cộng với user_profiles.role.
 * Trước đây hàm này còn ghi 'vcube_active_local_user'/'vcube_guest_role' — chính
 * những khoá đó đã bị dùng để dựng "bóng" đăng nhập (AT-04).
 */
async function applyDbRole(
  base: AppUserProfile,
  setProfile: (updater: (prev: AppUserProfile | null) => AppUserProfile | null) => void
): Promise<void> {
  const dbRole = await resolveDbRole(base.uid);
  if (!dbRole || dbRole === base.role) return;
  setProfile((prev) => ({ ...(prev ?? base), role: dbRole }));
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<AppUserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // NGUỒN SỰ THẬT DUY NHẤT cho trạng thái đăng nhập = phiên Supabase Auth.
    //
    // AT-04 (docs/design/data-honesty.md): trước đây khối này còn khôi phục
    // 'vcube_active_local_user' từ localStorage và coi đó là "đã đăng nhập" — nên UI
    // hiển thị phiên hợp lệ (kể cả vai trò admin) trong khi KHÔNG có phiên Supabase nào.
    // Đường khôi phục đó đã bị xoá hoàn toàn.
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    /**
     * Áp dụng một phiên Supabase (hoặc xoá sạch trạng thái khi không có phiên).
     * `await applyDbRole(...)` trước khi mở khoá UI (`loading = false`) để RoleGuard
     * không đọc phải vai trò mặc định 'customer' trong lúc chờ DB trả `user_profiles.role`.
     */
    const applySession = async (nextSession: Session | null) => {
      if (cancelled) return;
      if (!nextSession?.user) {
        setSession(null);
        setUser(null);
        setProfile(null);
        return;
      }
      setSession(nextSession);
      setUser(wrapAuthUser(nextSession.user));
      const userProf = createProfileFromSupabaseUser(nextSession.user);
      setProfile(userProf);
      await applyDbRole(userProf, setProfile);
    };

    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        await applySession(data.session ?? null);
      })
      .catch((err) => {
        console.warn('Supabase getSession error:', err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void applySession(nextSession);
    });

    return () => {
      cancelled = true;
      authListener.subscription.unsubscribe();
    };
  }, []);

  /**
   * Đăng nhập email/mật khẩu qua Supabase Auth.
   *
   * AT-02: trước đây khi `signInWithPassword` trả lỗi, hàm này ÂM THẦM rơi về danh sách
   * tài khoản hardcode (DEMO_ACCOUNTS) và chấp nhận hai mật khẩu hardcode của danh sách đó,
   * rồi tự dựng profile (uid bịa theo vai trò) và ghi localStorage ⇒ bất kỳ ai cũng mở được
   * giao diện admin mà KHÔNG cần tài khoản Supabase và KHÔNG có phiên nào.
   *
   * Hiện tại: lỗi được NÉM RA cho UI hiển thị; không tạo profile, không ghi localStorage,
   * không cấp vai trò. Thông báo không tiết lộ email có tồn tại hay không.
   */
  const signInWithEmail = async (email: string, pass: string) => {
    setLoading(true);
    try {
      if (!isSupabaseConfigured) {
        throw new Error('Hệ thống xác thực chưa được cấu hình. Vui lòng liên hệ quản trị viên.');
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: pass,
      });

      if (error || !data.session || !data.user) {
        // Thông báo KHÔNG tiết lộ email có tồn tại hay không. Các trường hợp không phải
        // "sai thông tin đăng nhập" (đụng hạn mức, mất mạng, email chưa xác nhận) được nói đúng
        // bản chất thay vì gán nhầm thành "sai mật khẩu".
        const authError = error as { message?: string; status?: number } | null;
        const status = authError?.status;
        const message = authError?.message || '';
        if (status === 429 || /rate limit|too many requests/i.test(message)) {
          throw new Error('Quá nhiều lần thử đăng nhập. Vui lòng thử lại sau vài phút.');
        }
        if (/email not confirmed/i.test(message)) {
          throw new Error('Tài khoản chưa xác nhận email. Vui lòng kiểm tra hộp thư và xác nhận trước khi đăng nhập.');
        }
        if (typeof status === 'number' && (status === 0 || status >= 500)) {
          throw new Error('Không kết nối được tới máy chủ xác thực. Vui lòng kiểm tra mạng và thử lại.');
        }
        throw new Error('Email hoặc mật khẩu không đúng.');
      }

      // Phiên thật đã được thiết lập ⇒ mới được dựng profile, và vai trò lấy từ DB.
      setSession(data.session);
      setUser(wrapAuthUser(data.user));
      const userProf = createProfileFromSupabaseUser(data.user);
      setProfile(userProf);
      await applyDbRole(userProf, setProfile);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Đăng ký tài khoản mới — LUÔN là vai trò `customer`.
   *
   * P2 (docs/design/data-honesty.md §Auth & trust): trước đây người đăng ký tự chọn
   * `designer`/`lab` và UI hứa "Đăng ký thành công với quyền DESIGNER!". Lời hứa đó sai:
   * quyền do `public.user_profiles.role` quyết định, và trigger
   * `fn_create_profile_for_new_user()` luôn ghi 'customer' — user_metadata KHÔNG cấp quyền.
   * Bộ chọn vai trò đặc quyền đã bị bỏ khỏi luồng đăng ký.
   *
   * Trả về `{ hasSession }`: khi dự án bật xác nhận email, `signUp` KHÔNG trả phiên ⇒
   * người dùng chưa đăng nhập, và UI phải nói đúng như vậy.
   */
  const signUpWithEmail = async (email: string, pass: string, name: string): Promise<SignUpResult> => {
    setLoading(true);
    try {
      if (!isSupabaseConfigured) {
        throw new Error('Hệ thống xác thực chưa được cấu hình. Vui lòng liên hệ quản trị viên.');
      }

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: pass,
        options: {
          data: {
            display_name: name,
            // Chỉ để hiển thị; quyền thật do public.user_profiles.role (SQL) quyết định.
            role: 'customer',
          },
        },
      });

      if (error) {
        throw new Error(error.message || 'Không thể đăng ký tài khoản. Vui lòng thử lại.');
      }

      // Chỉ coi là đã đăng nhập khi Supabase trả về PHIÊN thật. Nếu dự án bật xác nhận
      // email thì `data.session` là null ⇒ không dựng trạng thái "đã đăng nhập" giả.
      if (data.session && data.user) {
        setSession(data.session);
        setUser(wrapAuthUser(data.user));
        const userProf = createProfileFromSupabaseUser(data.user, 'customer');
        setProfile(userProf);
        await applyDbRole(userProf, setProfile);
        return { hasSession: true };
      }
      return { hasSession: false };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Đăng nhập Google qua Supabase OAuth.
   *
   * AT-03 / data-honesty #3: trước đây khi `signInWithOAuth` lỗi, hàm này ÂM THẦM
   * tạo và đăng nhập một danh tính bịa (`engineer.google@vcube.vn`, "Kỹ Sư Google
   * (Verified)", công ty "Google Tech Partner") rồi ghi vào localStorage. Người
   * dùng tưởng đã đăng nhập bằng Google trong khi thực tế không có phiên Supabase
   * nào — sai cả về bảo mật lẫn trung thực dữ liệu.
   *
   * Hiện tại: lỗi được NÉM RA cho UI hiển thị. Không tạo user, không ghi
   * localStorage, không im lặng.
   *
   * ── CÁCH BẬT LẠI GOOGLE ──────────────────────────────────────────────────
   * Project hiện có `google: false`. Để nút Google hoạt động:
   *   1. Supabase Dashboard → Authentication → Providers → Google → Enable.
   *   2. Điền Client ID / Client Secret lấy từ Google Cloud Console
   *      (OAuth 2.0 Client ID, loại Web application).
   *   3. Thêm Authorized redirect URI:
   *      https://<project-ref>.supabase.co/auth/v1/callback
   *   4. Thêm domain của app (và http://localhost:3000 khi dev) vào
   *      Authentication → URL Configuration → Redirect URLs.
   * Không cần đổi code: call site `signInWithOAuth` bên dưới đã đúng.
   * Khi provider còn tắt, Supabase trả lỗi dạng
   * "provider is not enabled" → UI hiển thị thông báo thân thiện bên dưới.
   * ─────────────────────────────────────────────────────────────────────────
   */
  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      if (!isSupabaseConfigured) {
        throw new Error('Chưa cấu hình Supabase nên không thể đăng nhập bằng Google.');
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) {
        console.warn('Supabase OAuth error:', error.message);
        const providerDisabled = /not enabled|provider is not enabled|unsupported provider/i.test(error.message || '');
        throw new Error(
          providerDisabled
            ? 'Đăng nhập Google chưa được bật cho dự án này. Vui lòng dùng email/mật khẩu, hoặc liên hệ quản trị viên để bật Google provider trong Supabase.'
            : `Không thể đăng nhập bằng Google: ${error.message}`
        );
      }
      // Thành công ⇒ Supabase chuyển hướng sang Google; phiên sẽ được thiết lập
      // qua onAuthStateChange. Không set profile thủ công ở đây.
    } catch (err: any) {
      console.warn('Google sign-in error:', err?.message || err);
      throw err instanceof Error ? err : new Error('Không thể đăng nhập bằng Google.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Công cụ DEV "đổi góc nhìn vai trò" — KHÔNG phải đăng nhập.
   *
   * AT-01 (docs/design/data-honesty.md, mức Critical): trước đây hàm này cấp vai trò
   * (kể cả `admin`) cho BẤT KỲ ai — kể cả người chưa đăng nhập — bằng uid bịa
   * `demo-<role>-id`, tên/email bịa và `kycStatus: 'verified'`, rồi ghi localStorage.
   *
   * Nay fail-closed:
   *   - bắt buộc có PHIÊN Supabase thật (user + session);
   *   - chỉ chạy ở môi trường phát triển; bản release không có bộ chuyển vai trò;
   *   - không bịa email/tên/KYC, không ghi localStorage;
   *   - đây chỉ là "góc nhìn" giao diện: quyền dữ liệu vẫn do user_profiles.role + RLS.
   */
  const switchDemoRole = async (targetRole: UserRole) => {
    const activeUser = user;
    if (!activeUser || !session) {
      throw new Error('Cần đăng nhập bằng tài khoản thật trước khi đổi góc nhìn vai trò.');
    }
    if (!IS_DEV) {
      throw new Error('Bản phát hành không hỗ trợ đổi góc nhìn vai trò: vai trò được đọc từ hồ sơ trên máy chủ.');
    }

    // Ghi metadata chỉ còn là tiện ích DEV. Từ migration 20261010, quyền thật do
    // public.user_profiles.role quyết định; user_metadata KHÔNG cấp quyền DB.
    if (isSupabaseConfigured) {
      try {
        await supabase.auth.updateUser({ data: { role: targetRole } });
      } catch (err) {
        console.warn('Supabase role update:', err);
      }
    }

    setProfile((prev) => {
      const base = prev ?? createProfileFromSupabaseUser(activeUser);
      return {
        ...base,
        uid: activeUser.id,
        email: activeUser.email || base.email,
        role: targetRole,
      };
    });
  };

  const updateUserProfile = async (updates: Partial<AppUserProfile>) => {
    if (!profile) return;
    const updated = { ...profile, ...updates };
    setProfile(updated);

    if (user && isSupabaseConfigured) {
      try {
        await supabase.auth.updateUser({
          data: {
            display_name: updates.displayName || profile.displayName,
            ...(IS_DEV ? { role: updates.role || profile.role } : {}),
            avatar_url: updates.avatarUrl || profile.avatarUrl,
            phone: updates.phone || profile.phone,
            company: updates.company || profile.company,
            engineer_rank: updates.engineerRank || profile.engineerRank,
            designer_bio: updates.designerBio || profile.designerBio,
            specialties: updates.specialties || profile.specialties,
            bank_account: updates.bankAccount || profile.bankAccount,
          },
        });
      } catch (err) {
        console.warn('Supabase updateUser error:', err);
      }
    }
  };

  const logout = async () => {
    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn('Supabase signout error:', e);
      }
    }
    setSession(null);
    setUser(null);
    setProfile(null);
    // Dọn khoá localStorage của bản cũ. Từ nay chúng KHÔNG được đọc hay ghi ở đâu nữa
    // (chỉ còn dòng dọn dẹp này để máy nào đã lỡ lưu thì được xoá).
    try {
      localStorage.removeItem('vcube_active_local_user');
      localStorage.removeItem('vcube_guest_role');
    } catch {
      /* ignore storage errors */
    }
  };

  const sendPasswordReset = async (resetEmail: string) => {
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
          redirectTo: window.location.origin,
        });
        if (error) {
          throw new Error(error.message);
        }
      } catch (err: any) {
        console.warn('Supabase password reset note:', err);
        throw err;
      }
    }
  };

  const currentRole: UserRole = profile?.role || 'customer';
  // Nguồn sự thật duy nhất: phiên Supabase Auth. Không còn suy ra từ localStorage
  // (AT-04) và không còn nhận `profile` mồ côi làm bằng chứng đã đăng nhập.
  const isLoggedIn: boolean = Boolean(user && session);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role: currentRole,
        isLoggedIn,
        loading,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        switchDemoRole,
        updateUserProfile,
        sendPasswordReset,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
