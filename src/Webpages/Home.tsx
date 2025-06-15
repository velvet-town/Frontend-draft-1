import { useNavigate } from '@tanstack/react-router'
import { useAuthStore } from '../Zustad_Store/Auth_Store'
import { joinRoom } from '../PIXI/multiplayer/API_CALLS/Player_Calls'
import { useState } from 'react'
import Take_User_data from '../components/Take_User_data'

const Home = () => {
  const navigate = useNavigate()
  const { user, signInWithGoogle, signOut, userExists } = useAuthStore()
  const [isJoining, setIsJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showUserDataModal, setShowUserDataModal] = useState(true)

  const handleSignOut = async () => {
    await signOut()
    navigate({ to: '/' })
  }

  const handleStartGame = async () => {
    if (!user) return
    
    setIsJoining(true)
    setError(null)

    try {
      // First join the room
      const roomData = await joinRoom(user.id)
      console.log('Room joined:', roomData)
      
      // Then navigate to the room
      navigate({ 
        to: '/room/$roomId',
        params: { roomId: roomData.room_id }
      })
    } catch (error) {
      console.error('Failed to join room:', error)
      setError(error instanceof Error ? error.message : 'Failed to join room')
    } finally {
      setIsJoining(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-[#2d0036] via-[#4b005c] to-[#1a0021] relative">
      {userExists === false && (
        <Take_User_data open={showUserDataModal} onClose={() => setShowUserDataModal(false)} />
      )}
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
        {user ? (
          <p className="text-xl text-[#e0b3ff] mb-8">Welcome back, {user.name}! 👋</p>
        ) : (
          <p className="text-lg text-[#e0b3ff] mb-8">Please sign in to start playing</p>
        )}
        {user ? (
          <div className="flex flex-col items-center gap-4">
            <button
              onClick={handleStartGame}
              disabled={isJoining}
              className={`bg-gradient-to-r from-[#a4508b] to-[#5f0a87] text-white font-bold py-3 px-10 rounded-xl shadow-lg text-2xl hover:from-[#5f0a87] hover:to-[#a4508b] transition-colors duration-200 ${
                isJoining ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isJoining ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Joining Room...
                </div>
              ) : (
                'Start Game'
              )}
            </button>
            {error && (
              <div className="text-red-400 text-sm mt-2">
                {error}
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={signInWithGoogle}
            className="bg-gradient-to-r from-[#a4508b] to-[#5f0a87] text-white font-bold py-3 px-10 rounded-xl shadow-lg text-2xl hover:from-[#5f0a87] hover:to-[#a4508b] transition-colors duration-200"
          >
            Sign in with Google
          </button>
        )}
      </div>
    </div>
  )
}

export default Home 