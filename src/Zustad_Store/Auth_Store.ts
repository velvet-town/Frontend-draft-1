import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { BACKEND_HTTP_URL } from '../PIXI/multiplayer/API_CALLS/config'

interface User {
  id: string;           // Google user id
  email: string;        // Google email (from Google and DB)
  name: string;         // App username (from DB)
  picture?: string;     // Google profile picture (from Google and DB)
  gender?: string;      // From DB
  profile_pic?: string; // From DB (could be same as picture)
}

interface AuthState {
  user: User | null
  loading: boolean
  isAuthenticated: boolean
  userExists: boolean | null
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  setUser: (user: User | null) => void
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  loading: true,
  isAuthenticated: false,
  userExists: null,

  setUser: async (googleUser) => {
    set({ loading: true, isAuthenticated: !!googleUser });
    if (googleUser) {
      const exists = await checkUserExists(googleUser.id);
      set({ userExists: exists });
      if (exists) {
        const backendUser = await fetchUserProfile(googleUser.id);
        set({
          user: {
            id: googleUser.id,
            email: backendUser.email,
            name: backendUser.username,
            picture: backendUser.profile_pic,
            gender: backendUser.gender,
            profile_pic: backendUser.profile_pic,
          },
          loading: false,
        });
      } else {
        set({ user: null, loading: false });
      }
    } else {
      set({ user: null, userExists: null, loading: false });
    }
  },

  signInWithGoogle: async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `https://ybtbskhxtucypexlbrfv.supabase.co/auth/v1/callback`
        }
      })
      if (error) throw error
    } catch (error) {
      console.error('Error signing in with Google:', error)
      throw error
    }
  },

  signOut: async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      set({ user: null, isAuthenticated: false, userExists: null })
    } catch (error) {
      console.error('Error signing out:', error)
      throw error
    }
  }
}))

// Initialize auth state
supabase.auth.getSession().then(({ data: { session } }) => {
  if (session?.user) {
    useAuthStore.getState().setUser({
      id: session.user.id,
      email: session.user.email || '',
      name: session.user.user_metadata?.full_name || '',
      picture: session.user.user_metadata?.avatar_url
    })
  }
})

// Listen for auth changes
supabase.auth.onAuthStateChange((_event, session) => {
  if (session?.user) {
    useAuthStore.getState().setUser({
      id: session.user.id,
      email: session.user.email || '',
      name: session.user.user_metadata?.full_name || '',
      picture: session.user.user_metadata?.avatar_url
    })
  } else {
    useAuthStore.getState().setUser(null)
  }
})

export async function checkUserExists(userId: string): Promise<boolean> {
  try {
    const res = await fetch(`${BACKEND_HTTP_URL}/auth/user-exists`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
    if (!res.ok) throw new Error('Failed to check user');
    const data = await res.json();
    return !!data.exists;
  } catch (e) {
    console.error('Error checking user existence:', e);
    return false;
  }
}

export async function fetchUserProfile(userId: string): Promise<{
  username: string;
  gender: string;
  email: string;
  profile_pic: string;
}> {
  const res = await fetch(`${BACKEND_HTTP_URL}/auth/get-user`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  if (!res.ok) throw new Error('Failed to fetch user profile');
  return await res.json();
} 