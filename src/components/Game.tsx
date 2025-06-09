import { useAuth } from '../contexts/AuthContext'
import { LoginButton } from './LoginButton'
import PixiApp from "./PixiApp"
import defaultMap from '../PIXI/defaultmap.json'

const Game = () => {
  const { user } = useAuth()
  
  const userData = user ? {
    id: user.id,
    name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Anonymous',
    skin: "004"
  } : {
    id: "local-user-1",
    name: "Guest",
    skin: "004"
  }

  return (
    <div className="fixed inset-0 w-full h-full">
      <div className="absolute top-4 right-4 z-50">
        <LoginButton />
      </div>
      <PixiApp 
        realmData={defaultMap} 
        className='w-full h-full' 
        username={userData.id}
        initialSkin={userData.skin} 
      />
    </div>
  )
}

export default Game 