import React, { useState, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'

interface AuthScreenProps {
  onAuth: (wasSignup?: boolean, user?: any) => void
}

// Password strength validation
const validatePasswordStrength = (password: string): { isValid: boolean; message: string } => {
  if (password.length < 8) {
    return { isValid: false, message: 'Password must be at least 8 characters' }
  }
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one uppercase letter' }
  }
  if (!/[a-z]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one lowercase letter' }
  }
  if (!/[0-9]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one number' }
  }
  return { isValid: true, message: '' }
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onAuth }) => {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  
  // Rate limiting: track failed attempts
  const failedAttemptsRef = useRef(0)
  const lastAttemptTimeRef = useRef(0)

  const { login, signup, loginWithGoogle, loginAsGuest, isConfigured } = useAuth()

  const handleGuestLogin = () => {
    const guestUser = loginAsGuest()
    const onboardingKey = `speakmind_user_onboarding_${guestUser.uid}`
    const hasCompletedOnboarding = localStorage.getItem(onboardingKey)
    onAuth(!hasCompletedOnboarding, guestUser)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setPasswordError('')

    // Rate limiting check
    const now = Date.now()
    const timeSinceLastAttempt = now - lastAttemptTimeRef.current
    
    if (failedAttemptsRef.current >= 5 && timeSinceLastAttempt < 60000) {
      setError('Too many failed attempts. Please wait 1 minute before trying again.')
      return
    }

    // Reset failed attempts after 1 minute
    if (timeSinceLastAttempt > 60000) {
      failedAttemptsRef.current = 0
    }

    // Validate password strength for signup
    if (!isLogin) {
      const validation = validatePasswordStrength(password)
      if (!validation.isValid) {
        setPasswordError(validation.message)
        return
      }
    }

    setLoading(true)
    lastAttemptTimeRef.current = now

    try {
      if (isLogin) {
        const result = await login(email, password)
        failedAttemptsRef.current = 0 // Reset on success
        onAuth(false, result?.user) // This was a login
      } else {
        const result = await signup(email, password, displayName)
        failedAttemptsRef.current = 0 // Reset on success
        onAuth(true, result?.user) // This was a signup
      }
    } catch (error: unknown) {
      failedAttemptsRef.current++
      const errorMessage = error instanceof Error ? error.message : 'An error occurred'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setError('')
    setLoading(true)

    try {
      const result = await loginWithGoogle()

      if (result?.user) {
        // Check if this is a new user based on account metadata
        const userMetadata = result.user.metadata
        const isNewUser =
          userMetadata?.creationTime && userMetadata?.lastSignInTime
            ? userMetadata.creationTime === userMetadata.lastSignInTime
            : false

        // Check if user has previously completed onboarding
        const onboardingKey = `speakmind_user_onboarding_${result.user.uid}`
        const hasCompletedOnboarding = localStorage.getItem(onboardingKey)

        // New users or users who haven't completed onboarding should go through it
        onAuth(isNewUser || !hasCompletedOnboarding, result.user)
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col relative"
      style={{
        background: 'linear-gradient(135deg, #D8B5FF 0%, #FFB5E8 50%, #B5E0FF 100%)'
      }}
    >
      {/* Top Section - Logo and SpeakMind */}
      <div className="flex flex-col items-center pt-12 md:pt-16 pb-6 md:pb-8">
        <img
          src="/onboarding/speakmindlogoupscaled.png"
          alt="SpeakMind Logo"
          className="w-20 h-20 md:w-28 md:h-28 mb-3 md:mb-4"
          onError={(e) => {
            // Fallback to alternative logo if main one fails
            const target = e.currentTarget;
            if (target.src.includes('speakmindlogoupscaled')) {
              target.src = "/onboarding/speakmindlogo.png";
            } else if (target.src.includes('speakmindlogo')) {
              target.src = "/onboarding/Logo (1).png";
            } else {
              // Final fallback - hide image and show text
              target.style.display = 'none';
            }
          }}
        />
        <h1
          className="text-white drop-shadow-lg"
          style={{
            fontFamily: 'Manrope, sans-serif',
            fontWeight: 800,
            fontSize: 'clamp(24px, 5vw, 32px)',
            lineHeight: '1.2',
            letterSpacing: '0px',
            textAlign: 'center'
          }}
        >
          SpeakMind
        </h1>
      </div>

      {/* Center Section - Welcome message */}
      <div className="flex-1 flex items-center justify-center px-4 md:px-6">
        <p
          className="text-white/90 transition-all duration-500 ease-in-out"
          style={{
            fontFamily: 'Manrope, sans-serif',
            fontWeight: 600,
            fontSize: 'clamp(15px, 3.5vw, 17px)',
            lineHeight: '1.3',
            letterSpacing: '0px',
            textAlign: 'center',
            verticalAlign: 'middle'
          }}
        >
          {isLogin ? 'Welcome back to serenity!' : 'Begin your mindful journey!'}
        </p>
      </div>

      {/* Bottom Section - Auth Form */}
      <div className="px-4 md:px-6 lg:px-8 pb-6 md:pb-8">
        <div className="max-w-md mx-auto bg-white/8 backdrop-blur-2xl rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-2xl border border-white/15 relative overflow-hidden transition-all duration-500 ease-in-out">
          {/* Glassmorphism accent */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-white/3 pointer-events-none"></div>

          <div className="relative z-10">

            {!isConfigured && (
              <div className="bg-amber-500/20 border border-amber-400/40 rounded-xl p-3 mb-4 backdrop-blur-md text-center">
                <p className="text-amber-100 text-xs font-semibold">
                  Running in Local Demo Mode
                </p>
                <p className="text-white/75 text-[11px] mt-0.5">
                  Firebase credentials not set in .env. Click <strong>Explore as Guest</strong> below to test all features.
                </p>
              </div>
            )}

            {error && (
              <div className="bg-red-500/20 border border-red-400/50 rounded-xl p-3 mb-4 backdrop-blur-md">
                <p className="text-red-100 text-sm">{error}</p>
              </div>
            )}

            {passwordError && (
              <div className="bg-yellow-500/20 border border-yellow-400/50 rounded-xl p-3 mb-4 backdrop-blur-md">
                <p className="text-yellow-100 text-sm">{passwordError}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-2 md:space-y-3">
              <div className={`relative transition-all duration-500 ease-in-out ${!isLogin ? 'max-h-20 opacity-100 mb-2 md:mb-3' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                <input
                  type="text"
                  placeholder="Full Name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3 py-2.5 md:px-4 md:py-3 bg-black/20 border border-white/20 rounded-lg md:rounded-xl text-sm md:text-base text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/40 focus:border-white/40 transition-all duration-200 backdrop-blur-lg"
                  required={!isLogin}
                  aria-label="Full Name"
                  autoComplete="name"
                />
              </div>

              <div className="relative">
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2.5 md:px-4 md:py-3 bg-black/20 border border-white/20 rounded-lg md:rounded-xl text-sm md:text-base text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/40 focus:border-white/40 transition-all duration-200 backdrop-blur-lg"
                  required
                  autoComplete="username"
                  aria-label="Email Address"
                />
              </div>

              <div className="relative">
                <input
                  type="password"
                  placeholder={isLogin ? "Password" : "Password (min 8 chars, 1 uppercase, 1 number)"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    setPasswordError('')
                  }}
                  className="w-full px-3 py-2.5 md:px-4 md:py-3 bg-black/20 border border-white/20 rounded-lg md:rounded-xl text-sm md:text-base text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/40 focus:border-white/40 transition-all duration-200 backdrop-blur-lg"
                  required
                  minLength={isLogin ? 6 : 8}
                  autoComplete="current-password"
                  aria-label="Password"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-white/15 hover:bg-white/25 backdrop-blur-lg text-white py-2.5 md:py-3 rounded-lg md:rounded-xl text-sm md:text-base font-semibold transition-all duration-200 disabled:opacity-50 shadow-lg border border-white/20 relative overflow-hidden group mt-3 md:mt-4"
                aria-label={isLogin ? 'Sign In' : 'Sign Up'}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 group-hover:translate-x-full transition-transform duration-700"></div>
                <span className="relative z-10">
                  {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Sign Up')}
                </span>
              </button>
            </form>

            <div className="my-3 md:my-4 flex items-center">
              <div className="flex-1 border-t border-white/30"></div>
              <span className="px-2 md:px-3 text-white/80 text-xs md:text-sm font-medium">or continue with</span>
              <div className="flex-1 border-t border-white/30"></div>
            </div>

            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full bg-white/85 backdrop-blur-lg text-gray-800 py-2.5 md:py-3 rounded-lg md:rounded-xl text-sm md:text-base font-semibold hover:bg-white/95 transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 md:gap-3 shadow-lg border border-white/40 relative overflow-hidden group mb-2.5"
              aria-label="Sign in with Google"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent transform -skew-x-12 group-hover:translate-x-full transition-transform duration-700"></div>
              <svg className="w-4 h-4 md:w-5 md:h-5 relative z-10" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <span className="relative z-10">Google</span>
            </button>

            <button
              type="button"
              onClick={handleGuestLogin}
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600/75 to-indigo-600/75 hover:from-purple-600/90 hover:to-indigo-600/90 text-white py-2.5 md:py-3 rounded-lg md:rounded-xl text-sm md:text-base font-semibold transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg border border-white/20 relative overflow-hidden group backdrop-blur-md"
              aria-label="Explore as Guest"
            >
              <span>Explore as Guest</span>
              <span className="text-[10px] uppercase font-bold tracking-wider bg-white/20 px-2 py-0.5 rounded-full">Demo</span>
            </button>

            <div className="text-center mt-4 md:mt-6">
              <button
                onClick={() => {
                  setIsLogin(!isLogin)
                  setError('')
                  setPasswordError('')
                }}
                className="text-white/80 hover:text-white transition-colors font-medium text-xs md:text-sm"
                aria-label={isLogin ? "Switch to sign up" : "Switch to sign in"}
              >
                {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AuthScreen