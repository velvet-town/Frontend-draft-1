import { useAuthStore } from '../Zustad_Store/Auth_Store'
import PixiApp from "./PixiApp"
import defaultMap from '../PIXI/defaultmap.json'
import { useNavigate } from '@tanstack/react-router'
import { leaveRoom } from '../PIXI/multiplayer/API_CALLS/Player_Calls'
import PerformanceMonitor from './PerformanceMonitor'

const Game = () => {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  
  const userData = user ? {
    id: user.id,
    name: user.name || user.email?.split('@')[0] || 'Anonymous',
    skin: "004"
  } : {
    id: "local-user-1",
    name: "Guest",
    skin: "004"
  }

  const handleLeaveRoom = async () => {
    try {
      await leaveRoom()
      navigate({ to: '/' })
    } catch (error) {
      console.error('Failed to leave room:', error)
    }
  }

  return (
    <div className="fixed inset-0 w-full h-full"> 
      <button
        onClick={handleLeaveRoom}
        className="absolute top-4 left-4 bg-gradient-to-r from-[#a4508b] to-[#5f0a87] text-white font-bold py-2 px-5 rounded-lg shadow-md hover:from-[#5f0a87] hover:to-[#a4508b] transition-colors duration-200 z-50"
      >
        Leave Room
      </button>
      <div className="absolute top-4 right-4 z-50">
        <PerformanceMonitor />
      </div>
      <PixiApp 
        realmData={defaultMap} 
        className='w-full h-full' 
        userId={userData.id}
        username={userData.name}
        initialSkin={userData.skin} 
      />
    </div>
  )
}

export default Game 