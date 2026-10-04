import React, { createContext, useContext, useEffect, useState, useMemo } from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile
} from 'firebase/auth'
import type { User, UserCredential } from 'firebase/auth'
import { auth, isFirebaseConfigured } from '../config/firebase'

export interface AppUser {
  uid: string
  displayName: string | null
  email: string | null
  photoURL?: string | null
  isAnonymous?: boolean
  metadata?: {
    creationTime?: string
    lastSignInTime?: string
  }
}

interface AuthContextType {
  currentUser: User | AppUser | null
  loading: boolean
  isConfigured: boolean
  signup: (email: string, password: string, displayName?: string) => Promise<UserCredential>
  login: (email: string, password: string) => Promise<UserCredential>
  logout: () => Promise<void>
  loginWithGoogle: () => Promise<UserCredential>
  loginAsGuest: () => AppUser
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | AppUser | null>(null)
  const [loading, setLoading] = useState(true)

  const signup = async (email: string, password: string, displayName?: string) => {
    if (!isFirebaseConfigured) {
      throw new Error('Firebase is running in local demo mode. To enable registration, configure VITE_FIREBASE_* in your .env file, or use "Continue as Guest".')
    }
    const result = await createUserWithEmailAndPassword(auth, email, password)
    if (displayName && result.user) {
      await updateProfile(result.user, { displayName })
    }
    return result
  }

  const login = async (email: string, password: string) => {
    if (!isFirebaseConfigured) {
      throw new Error('Firebase is running in local demo mode. To enable login, configure VITE_FIREBASE_* in your .env file, or use "Continue as Guest".')
    }
    const result = await signInWithEmailAndPassword(auth, email, password)
    return result
  }

  const logout = async () => {
    localStorage.removeItem('speakmind_guest_mode')
    try {
      await signOut(auth)
    } catch {
      // Ignore if auth is in demo mode
    }
    setCurrentUser(null)
  }

  const loginWithGoogle = async () => {
    if (!isFirebaseConfigured) {
      throw new Error('Firebase is running in local demo mode. Configure VITE_FIREBASE_* in .env to enable Google Sign-In, or use "Continue as Guest".')
    }
    const provider = new GoogleAuthProvider()
    const result = await signInWithPopup(auth, provider)
    return result
  }

  const loginAsGuest = (): AppUser => {
    let guestUid = localStorage.getItem('speakmind_guest_uid')
    if (!guestUid) {
      guestUid = 'guest_' + Math.random().toString(36).substring(2, 9)
      localStorage.setItem('speakmind_guest_uid', guestUid)
    }
    localStorage.setItem('speakmind_guest_mode', 'true')

    const guestUser: AppUser = {
      uid: guestUid,
      displayName: 'Guest Explorer',
      email: 'guest@speakmind.app',
      isAnonymous: true,
      photoURL: null,
      metadata: {
        creationTime: new Date().toISOString(),
        lastSignInTime: new Date().toISOString()
      }
    }
    setCurrentUser(guestUser)
    return guestUser
  }

  useEffect(() => {
    try {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (user) {
          localStorage.removeItem('speakmind_guest_mode')
          setCurrentUser(user)
        } else {
          const isGuest = localStorage.getItem('speakmind_guest_mode') === 'true'
          if (isGuest) {
            const guestUid = localStorage.getItem('speakmind_guest_uid') || 'guest_user'
            setCurrentUser({
              uid: guestUid,
              displayName: 'Guest Explorer',
              email: 'guest@speakmind.app',
              isAnonymous: true,
              photoURL: null,
              metadata: {
                creationTime: new Date().toISOString(),
                lastSignInTime: new Date().toISOString()
              }
            })
          } else {
            setCurrentUser(null)
          }
        }
        setLoading(false)
      })

      return unsubscribe
    } catch (err) {
      console.warn('onAuthStateChanged error:', err)
      setLoading(false)
    }
  }, [])

  // Memoize the context value to prevent unnecessary re-renders
  const value: AuthContextType = useMemo(() => ({
    currentUser,
    loading,
    isConfigured: isFirebaseConfigured,
    signup,
    login,
    logout,
    loginWithGoogle,
    loginAsGuest
  }), [currentUser, loading])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-100 to-blue-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
          <p className="text-purple-600 font-medium">Loading SpeakMind...</p>
        </div>
      </div>
    )
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}