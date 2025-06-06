import PixiApp from "./components/PixiApp"
import defaultMap from '../utils/defaultmap.json'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { LoginButton } from './components/LoginButton'

const localGameData = {
  map_data: defaultMap
}

function GameContent() {
  const { user } = useAuth()
  
  // Use mock user data if not authenticated, otherwise use Supabase user data
  const userData = user ? {
    id: user.id,
    name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Anonymous',
    skin: "004" // You might want to store this in user metadata
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
        realmData={localGameData.map_data} 
        className='w-full h-full' 
        username={userData.id}
        initialSkin={userData.skin} 
      />
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <GameContent />
    </AuthProvider>
  )
}

export default App
