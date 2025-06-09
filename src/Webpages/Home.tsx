import { useNavigate } from '@tanstack/react-router'
import { useAuth } from '../contexts/AuthContext'
import { LoginButton } from '../components/LoginButton'

const Home = () => {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()

  const handleSignOut = async () => {
    await signOut()
    navigate({ to: '/' })
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-[#2d0036] via-[#4b005c] to-[#1a0021] relative">
      {user && (
        <button
          onClick={handleSignOut}
          className="absolute top-6 left-6 bg-gradient-to-r from-[#a4508b] to-[#5f0a87] text-white font-bold py-2 px-5 rounded-lg shadow-md hover:from-[#5f0a87] hover:to-[#a4508b] transition-colors duration-200"
        >
          Sign Out
        </button>
      )}
      <div className="flex flex-col items-center justify-center">
        <h1 className="text-5xl font-extrabold text-white mb-6 drop-shadow-lg">Welcome to Velvet</h1>
        <p className="text-lg text-[#e0b3ff] mb-8">Please sign in to start playing</p>
        {user ? (
          <button
            onClick={() => navigate({ to: '/game' })}
            className="bg-gradient-to-r from-[#a4508b] to-[#5f0a87] text-white font-bold py-3 px-10 rounded-xl shadow-lg text-2xl hover:from-[#5f0a87] hover:to-[#a4508b] transition-colors duration-200"
          >
            Start Game
          </button>
        ) : (
          <div className="space-y-4">
            <LoginButton />
          </div>
        )}
      </div>
    </div>
  )
}

export default Home 