import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  signOut as fbSignOut,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from '../firebase';
import { AppUserProfile, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  profile: AppUserProfile | null;
  role: UserRole;
  loading: boolean;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, name: string, defaultRole?: UserRole) => Promise<void>;
  signInWithGoogle: (defaultRole?: UserRole) => Promise<void>;
  switchDemoRole: (role: UserRole) => Promise<void>;
  updateUserProfile: (updates: Partial<AppUserProfile>) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Preset demo accounts for quick testing
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

interface StoredLocalUser {
  uid: string;
  email: string;
  displayName: string;
  password?: string;
  role: UserRole;
  company?: string;
  createdAt: string;
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AppUserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Initialize demo or active session
  useEffect(() => {
    // Check if there is an active local session first
    const activeLocalUserJson = localStorage.getItem('vcube_active_local_user');
    if (activeLocalUserJson) {
      try {
        const localUser = JSON.parse(activeLocalUserJson) as AppUserProfile;
        setProfile(localUser);
      } catch (e) {
        console.warn('Error reading local user session:', e);
      }
    }

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        setUser(fbUser);
        try {
          // Fetch user profile from Firestore
          const userDocRef = doc(db, 'users', fbUser.uid);
          const snap = await getDoc(userDocRef);
          
          if (snap.exists()) {
            const data = snap.data() as AppUserProfile;
            setProfile(data);
            localStorage.setItem('vcube_active_local_user', JSON.stringify(data));
          } else {
            // Create default profile if not exists
            const newProfile: AppUserProfile = {
              uid: fbUser.uid,
              email: fbUser.email || '',
              displayName: fbUser.displayName || 'VCUBE Member',
              role: (fbUser.email?.includes('admin') ? 'admin' : fbUser.email?.includes('creator') || fbUser.email?.includes('designer') ? 'designer' : 'customer') as UserRole,
              avatarUrl: fbUser.photoURL || undefined,
              createdAt: new Date().toISOString(),
            };
            try {
              await setDoc(userDocRef, newProfile);
            } catch (err) {
              console.warn('Firestore doc write fallback:', err);
            }
            setProfile(newProfile);
            localStorage.setItem('vcube_active_local_user', JSON.stringify(newProfile));
          }
        } catch (err) {
          console.warn('Firestore profile sync error (falling back to memory):', err);
          // Fallback profile
          const fallbackProfile: AppUserProfile = {
            uid: fbUser.uid,
            email: fbUser.email || 'user@vcube.vn',
            displayName: fbUser.displayName || 'Kỹ sư VCUBE',
            role: (fbUser.email?.includes('admin') ? 'admin' : fbUser.email?.includes('designer') ? 'designer' : 'customer') as UserRole,
            createdAt: new Date().toISOString(),
          };
          setProfile(fallbackProfile);
          localStorage.setItem('vcube_active_local_user', JSON.stringify(fallbackProfile));
        }
      } else {
        setUser(null);
        // If no active local user was already loaded from localStorage, set default guest
        const activeLocal = localStorage.getItem('vcube_active_local_user');
        if (!activeLocal) {
          const storedRole = (localStorage.getItem('vcube_guest_role') as UserRole) || 'customer';
          setProfile({
            uid: 'demo-user-123',
            email: storedRole === 'admin' ? 'admin.forge@vcube.vn' : storedRole === 'designer' ? 'creator.lethang@vcube.vn' : 'minh.engineer@vcube.vn',
            displayName: storedRole === 'admin' ? 'Kỹ Sư Trưởng Tuấn' : storedRole === 'designer' ? 'Lê Thắng CAD/CAM' : 'Nguyễn Văn Minh',
            role: storedRole,
            company: 'VCUBE R&D Lab',
            engineerRank: storedRole === 'admin' ? 'Chief Production Engineer' : storedRole === 'designer' ? 'Senior CAD Modeler' : 'Verified Pro Engineer',
            createdAt: '2026-01-10T08:00:00.000Z',
          });
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithEmail = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, pass);
      setUser(cred.user);
    } catch (err: any) {
      // If Firebase Auth provider is not enabled in Firebase Console (operation-not-allowed)
      // or other setup constraints, gracefully fall back to local auth store:
      if (
        err.code === 'auth/operation-not-allowed' || 
        err.code === 'auth/admin-restricted-operation' ||
        err.message?.includes('operation-not-allowed')
      ) {
        console.warn('Firebase Email Provider not active, using resilient VCUBE local auth fallback.');
        
        // Check registered local users
        const localListJson = localStorage.getItem('vcube_registered_users');
        const localList: StoredLocalUser[] = localListJson ? JSON.parse(localListJson) : [];
        const found = localList.find((u) => u.email.toLowerCase() === email.toLowerCase());

        let matchedRole: UserRole = 'customer';
        let matchedName = email.split('@')[0];

        if (found) {
          matchedRole = found.role;
          matchedName = found.displayName;
        } else if (email.toLowerCase().includes('admin')) {
          matchedRole = 'admin';
          matchedName = 'Kỹ Sư Trưởng Tuấn (Admin)';
        } else if (email.toLowerCase().includes('designer') || email.toLowerCase().includes('creator')) {
          matchedRole = 'designer';
          matchedName = 'Lê Thắng CAD/CAM (Creator)';
        } else if (email.toLowerCase().includes('khachhang') || email.toLowerCase().includes('minh')) {
          matchedRole = 'customer';
          matchedName = 'Nguyễn Văn Minh';
        }

        const fallbackProf: AppUserProfile = {
          uid: found ? found.uid : `user-${Date.now()}`,
          email,
          displayName: matchedName,
          role: matchedRole,
          createdAt: found ? found.createdAt : new Date().toISOString(),
        };

        setProfile(fallbackProf);
        localStorage.setItem('vcube_active_local_user', JSON.stringify(fallbackProf));
        localStorage.setItem('vcube_guest_role', matchedRole);
        setLoading(false);
        return;
      }

      setLoading(false);
      throw err;
    }
  };

  const signUpWithEmail = async (email: string, pass: string, name: string, defaultRole: UserRole = 'customer') => {
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      await updateProfile(cred.user, { displayName: name });
      
      const newProfile: AppUserProfile = {
        uid: cred.user.uid,
        email,
        displayName: name,
        role: defaultRole,
        createdAt: new Date().toISOString(),
      };
      
      try {
        await setDoc(doc(db, 'users', cred.user.uid), newProfile);
      } catch (e) {
        console.warn('Could not write to firestore:', e);
      }
      
      setUser(cred.user);
      setProfile(newProfile);
      localStorage.setItem('vcube_active_local_user', JSON.stringify(newProfile));
      localStorage.setItem('vcube_guest_role', defaultRole);
    } catch (err: any) {
      if (
        err.code === 'auth/operation-not-allowed' || 
        err.code === 'auth/admin-restricted-operation' ||
        err.message?.includes('operation-not-allowed')
      ) {
        console.warn('Firebase Email Provider not active, using resilient VCUBE local auth register.');
        
        const newUid = `user-${Date.now()}`;
        const newLocalUser: StoredLocalUser = {
          uid: newUid,
          email,
          displayName: name,
          password: pass,
          role: defaultRole,
          createdAt: new Date().toISOString(),
        };

        // Save in local list
        const localListJson = localStorage.getItem('vcube_registered_users');
        const localList: StoredLocalUser[] = localListJson ? JSON.parse(localListJson) : [];
        localList.push(newLocalUser);
        localStorage.setItem('vcube_registered_users', JSON.stringify(localList));

        const newProfile: AppUserProfile = {
          uid: newUid,
          email,
          displayName: name,
          role: defaultRole,
          createdAt: new Date().toISOString(),
        };

        // Try writing to firestore doc as well if firestore is open
        try {
          await setDoc(doc(db, 'users', newUid), newProfile);
        } catch (e) {
          // ignore firestore error if offline
        }

        setProfile(newProfile);
        localStorage.setItem('vcube_active_local_user', JSON.stringify(newProfile));
        localStorage.setItem('vcube_guest_role', defaultRole);
        setLoading(false);
        return;
      }

      setLoading(false);
      throw err;
    }
  };

  const signInWithGoogle = async (defaultRole: UserRole = 'customer') => {
    setLoading(true);
    try {
      const res = await signInWithPopup(auth, googleProvider);
      const fbUser = res.user;
      
      const userRef = doc(db, 'users', fbUser.uid);
      const snap = await getDoc(userRef);
      
      if (!snap.exists()) {
        const newProf: AppUserProfile = {
          uid: fbUser.uid,
          email: fbUser.email || '',
          displayName: fbUser.displayName || 'Google User',
          avatarUrl: fbUser.photoURL || undefined,
          role: defaultRole,
          createdAt: new Date().toISOString(),
        };
        try {
          await setDoc(userRef, newProf);
        } catch (e) {
          console.warn('Firestore write error:', e);
        }
        setProfile(newProf);
        localStorage.setItem('vcube_active_local_user', JSON.stringify(newProf));
      } else {
        const prof = snap.data() as AppUserProfile;
        setProfile(prof);
        localStorage.setItem('vcube_active_local_user', JSON.stringify(prof));
      }
    } catch (err: any) {
      if (
        err.code === 'auth/operation-not-allowed' ||
        err.code === 'auth/popup-blocked' ||
        err.code === 'auth/unauthorized-domain' ||
        err.message?.includes('operation-not-allowed')
      ) {
        console.warn('Google Provider not active, using simulated Google login session.');
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
        setLoading(false);
        return;
      }

      setLoading(false);
      throw err;
    }
  };

  const switchDemoRole = async (targetRole: UserRole) => {
    localStorage.setItem('vcube_guest_role', targetRole);
    if (user) {
      try {
        await updateDoc(doc(db, 'users', user.uid), { role: targetRole });
      } catch (err) {
        console.log('Update role local:', err);
      }
    }
    
    setProfile((prev) => {
      const baseName = targetRole === 'admin' ? 'Kỹ Sư Trưởng Tuấn (Admin)' : targetRole === 'designer' ? 'Lê Thắng CAD/CAM (Creator)' : 'Nguyễn Văn Minh (Khách Hàng)';
      const baseEmail = targetRole === 'admin' ? 'admin.forge@vcube.vn' : targetRole === 'designer' ? 'creator.lethang@vcube.vn' : 'minh.engineer@vcube.vn';
      
      const newProf: AppUserProfile = {
        uid: user ? user.uid : (prev?.uid || 'demo-user-id'),
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
    if (user) {
      try {
        await updateDoc(doc(db, 'users', user.uid), updates);
      } catch (err) {
        console.warn('Profile update error:', err);
      }
    }
  };

  const logout = async () => {
    try {
      await fbSignOut(auth);
    } catch (e) {
      console.warn('Signout error:', e);
    }
    setUser(null);
    localStorage.removeItem('vcube_active_local_user');
    localStorage.removeItem('vcube_guest_role');
    setProfile({
      uid: 'guest-anon',
      email: 'guest@vcube.vn',
      displayName: 'Khách vãng lai',
      role: 'customer',
      createdAt: new Date().toISOString(),
    });
  };

  const currentRole: UserRole = profile?.role || 'customer';

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role: currentRole,
        loading,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        switchDemoRole,
        updateUserProfile,
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
