import { useAuth } from '../contexts/AuthContext'

export function LoginButton() {
  const { user, signInWithGoogle, signOut } = useAuth()

  return (
    <button
      onClick={user ? signOut : signInWithGoogle}
      className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
    >
      {user ? 'Sign Out' : 'Sign in with Google'}
    </button>
  )
} 