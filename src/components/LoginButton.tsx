import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from '@tanstack/react-router'

export const LoginButton = () => {
  const { user, signInWithGoogle, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate({ to: '/' })
  }

  if (user) {
    return (
      <button
        onClick={handleSignOut}
        className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200"
      >
        Sign Out
      </button>
    )
  }

  return (
    <button
      onClick={signInWithGoogle}
      className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200"
    >
      Sign in with Google
    </button>
  )
} 