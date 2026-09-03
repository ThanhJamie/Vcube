import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/src/backend/supabase/client';
import { AppUserProfile, UserRole } from '@/src/types';

export type AuthUser = SupabaseUser & {
  uid: string; // Alias for id to ensure backward compatibility
};

interface AuthContextType {
  user: AuthUser | null;
  profile: AppUserProfile | null;
  role: UserRole;
  isLoggedIn: boolean;
  loading: boolean;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, name: string, defaultRole?: UserRole) => Promise<void>;
  signInWithGoogle: (defaultRole?: UserRole) => Promise<void>;
  switchDemoRole: (role: UserRole) => Promise<void>;
  updateUserProfile: (updates: Partial<AppUserProfile>) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Preset demo accounts configured in Supabase
export const DEMO_ACCOUNTS = [
  {
    role: 'customer' as UserRole,
    title: 'Khách Hàng (Customer)',
    email: 'khachhang@vcube.vn',
    name: 'Nguyễn Văn Minh',
    badge: 'Standard Tier',
    desc: 'Đặt in linh kiện, mua file STL, theo dõi tiến độ sản xuất',
  },
  {
    role: 'designer' as UserRole,
    title: 'Tác Giả 3D (Creator)',
    email: 'creator.lethang@vcube.vn',
    name: 'Lê Thắng CAD/CAM',
    badge: 'Verified Creator',
    desc: 'Quản lý kho file số, nhận hoa hồng in 3D, chat yêu cầu CAD',
  },
  {
    role: 'admin' as UserRole,
    title: 'Quản Trị Viên (Admin)',
    email: 'admin.forge@vcube.vn',
    name: 'Kỹ Sư Trưởng Tuấn',
    badge: 'ForgeControl Master',
    desc: 'Duyệt mẫu, quản lý nông trại in, tài chính, phân quyền thành viên',
  },
];

function wrapAuthUser(sbUser: SupabaseUser): AuthUser {
  return Object.assign(sbUser, { uid: sbUser.id });
}

function createProfileFromSupabaseUser(sbUser: SupabaseUser, defaultRole?: UserRole): AppUserProfile {
  const meta = sbUser.user_metadata || {};
  let matchedRole: UserRole = (meta.role as UserRole) || defaultRole || 'customer';
  const email = sbUser.email || '';
  if (!meta.role && !defaultRole) {
    if (email.toLowerCase().includes('admin')) matchedRole = 'admin';
    else if (email.toLowerCase().includes('creator') || email.toLowerCase().includes('designer')) matchedRole = 'designer';
  }

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

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<AppUserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // 1. Recover active user session from local cache immediately
    const activeLocalUserJson = localStorage.getItem('vcube_active_local_user');
    if (activeLocalUserJson) {
      try {
        const localUser = JSON.parse(activeLocalUserJson) as AppUserProfile;
        setProfile(localUser);
      } catch (e) {
        console.warn('Error reading local user session:', e);
      }
    }

    // 2. Synchronize with Supabase Auth session
    if (isSupabaseConfigured) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          const wrapped = wrapAuthUser(session.user);
          setUser(wrapped);
          const userProf = createProfileFromSupabaseUser(session.user);
          setProfile(userProf);
          localStorage.setItem('vcube_active_local_user', JSON.stringify(userProf));
          localStorage.setItem('vcube_guest_role', userProf.role);
        } else {
          // If no active session, restore local user if previously saved
          const activeLocal = localStorage.getItem('vcube_active_local_user');
          if (activeLocal) {
            try {
              const localUser = JSON.parse(activeLocal) as AppUserProfile;
              setProfile(localUser);
            } catch (e) {
              console.warn('Error reading local user session:', e);
              setProfile(null);
            }
          } else {
            setProfile(null);
          }
        }
        setLoading(false);
      }).catch(err => {
        console.warn('Supabase getSession error:', err);
        setLoading(false);
      });

      const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          const wrapped = wrapAuthUser(session.user);
          setUser(wrapped);
          const userProf = createProfileFromSupabaseUser(session.user);
          setProfile(userProf);
          localStorage.setItem('vcube_active_local_user', JSON.stringify(userProf));
          localStorage.setItem('vcube_guest_role', userProf.role);
        } else {
          setUser(null);
        }
      });

      return () => {
        authListener.subscription.unsubscribe();
      };
    } else {
      setLoading(false);
    }
  }, []);

  const signInWithEmail = async (email: string, pass: string) => {
    setLoading(true);
    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: pass,
        });

        if (error) {
          // Check demo accounts as fallback
          const demoMatch = DEMO_ACCOUNTS.find(a => a.email.toLowerCase() === email.trim().toLowerCase());
          if (demoMatch && (pass === '123456' || pass === 'Password123!@')) {
            const demoProf: AppUserProfile = {
              uid: `demo-${demoMatch.role}`,
              email: demoMatch.email,
              displayName: demoMatch.name,
              role: demoMatch.role,
              company: 'VCUBE R&D Lab',
              createdAt: new Date().toISOString(),
            };
            setProfile(demoProf);
            localStorage.setItem('vcube_active_local_user', JSON.stringify(demoProf));
            localStorage.setItem('vcube_guest_role', demoMatch.role);
            setLoading(false);
            return;
          }
          throw new Error(error.message || 'Đăng nhập không thành công. Vui lòng kiểm tra lại email hoặc mật khẩu.');
        }

        if (data.user) {
          const wrapped = wrapAuthUser(data.user);
          setUser(wrapped);
          const userProf = createProfileFromSupabaseUser(data.user);
          setProfile(userProf);
          localStorage.setItem('vcube_active_local_user', JSON.stringify(userProf));
          localStorage.setItem('vcube_guest_role', userProf.role);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const signUpWithEmail = async (email: string, pass: string, name: string, defaultRole: UserRole = 'customer') => {
    setLoading(true);
    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: pass,
          options: {
            data: {
              display_name: name,
              role: defaultRole,
            },
          },
        });

        if (error) {
          throw new Error(error.message || 'Không thể đăng ký tài khoản. Vui lòng thử lại.');
        }

        if (data.user) {
          const wrapped = wrapAuthUser(data.user);
          setUser(wrapped);
          const userProf = createProfileFromSupabaseUser(data.user, defaultRole);
          setProfile(userProf);
          localStorage.setItem('vcube_active_local_user', JSON.stringify(userProf));
          localStorage.setItem('vcube_guest_role', defaultRole);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async (defaultRole: UserRole = 'customer') => {
    setLoading(true);
    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.origin,
          },
        });

        if (error) {
          console.warn('Supabase OAuth notice:', error.message);
          // Fallback in case of sandboxed iframe limitations
          const googleProf: AppUserProfile = {
            uid: `google-user-${Date.now()}`,
            email: 'engineer.google@vcube.vn',
            displayName: 'Kỹ Sư Google (Verified)',
            role: defaultRole,
            company: 'Google Tech Partner',
            createdAt: new Date().toISOString(),
          };
          setProfile(googleProf);
          localStorage.setItem('vcube_active_local_user', JSON.stringify(googleProf));
          localStorage.setItem('vcube_guest_role', defaultRole);
        }
      }
    } catch (err) {
      console.warn('Google sign-in error:', err);
    } finally {
      setLoading(false);
    }
  };

  const switchDemoRole = async (targetRole: UserRole) => {
    localStorage.setItem('vcube_guest_role', targetRole);
    if (user && isSupabaseConfigured) {
      try {
        await supabase.auth.updateUser({
          data: { role: targetRole },
        });
      } catch (err) {
        console.warn('Supabase role update:', err);
      }
    }

    setProfile((prev) => {
      const baseName = targetRole === 'admin' ? 'Kỹ Sư Trưởng Tuấn' : targetRole === 'designer' ? 'Lê Thắng CAD/CAM' : 'Nguyễn Văn Minh';
      const baseEmail = targetRole === 'admin' ? 'admin.forge@vcube.vn' : targetRole === 'designer' ? 'creator.lethang@vcube.vn' : 'khachhang@vcube.vn';

      const newProf: AppUserProfile = {
        uid: user ? user.id : (prev?.uid || 'demo-user-id'),
        email: user ? (user.email || baseEmail) : baseEmail,
        displayName: baseName,
        role: targetRole,
        company: 'VCUBE R&D Labs',
        engineerRank: targetRole === 'admin' ? 'ForgeControl Root Admin' : targetRole === 'designer' ? 'Certified 3D Creator' : 'Customer Account',
        createdAt: prev?.createdAt || new Date().toISOString(),
      };

      localStorage.setItem('vcube_active_local_user', JSON.stringify(newProf));
      return newProf;
    });
  };

  const updateUserProfile = async (updates: Partial<AppUserProfile>) => {
    if (!profile) return;
    const updated = { ...profile, ...updates };
    setProfile(updated);
    localStorage.setItem('vcube_active_local_user', JSON.stringify(updated));

    if (user && isSupabaseConfigured) {
      try {
        await supabase.auth.updateUser({
          data: {
            display_name: updates.displayName || profile.displayName,
            role: updates.role || profile.role,
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
    setUser(null);
    setProfile(null);
    localStorage.removeItem('vcube_active_local_user');
    localStorage.removeItem('vcube_guest_role');
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
  const isLoggedIn: boolean = Boolean(
    user !== null || (profile && profile.uid && !profile.uid.startsWith('guest'))
  );

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
