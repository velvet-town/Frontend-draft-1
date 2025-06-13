import { useAuthStore } from '../Zustad_Store/Auth_Store'
import PixiApp from "./PixiApp"
import defaultMap from '../PIXI/defaultmap.json'

const Game = () => {
  const { user } = useAuthStore()
  
  const userData = user ? {
    id: user.id,
    name: user.name || user.email?.split('@')[0] || 'Anonymous',
    skin: "004"
  } : {
    id: "local-user-1",
    name: "Guest",
    skin: "004"
  }

  return (
    <div className="fixed inset-0 w-full h-full">
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