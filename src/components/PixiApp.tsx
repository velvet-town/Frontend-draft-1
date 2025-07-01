import { useEffect, useRef, useState } from "react"
import { PlayApp } from "./../PIXI/pixi/PlayApp";
import type { RealmData } from "./../PIXI/pixi/types";
import Chat_Component from '../PIXI/multiplayer/Chat_AudioCalls/Chat_Component'

type PixiAppPropa= {
    className?: string
    realmData: RealmData
    userId: string
    username: string
    initialSkin: string
}

interface Player {
    id: string;
    username: string;
}

const PixiApp:React.FC<PixiAppPropa> = ({ className, realmData, userId, username, initialSkin }) => {

    const appRef=useRef<PlayApp | null>(null);
    const [players, setPlayers] = useState<Player[]>([]);

    useEffect(() => {
        const mount=async()=>{
        const app=new PlayApp(realmData, username, initialSkin);
        appRef.current=app;
        await app.init();
        const pixiApp=app.getApp();
        document.getElementById('app-container')!.appendChild(pixiApp.canvas);
        
        // Set up interval to get players from PlayApp
        const playerUpdateInterval = setInterval(() => {
            if (appRef.current) {
                const currentPlayers = Object.entries(appRef.current.players).map(([id, player]) => ({
                    id,
                    username: player.username || id
                }));
                setPlayers(currentPlayers);
            }
        }, 1000); // Update every second

        return () => {
            clearInterval(playerUpdateInterval);
        };
        }
        if(!appRef.current){
            mount();
        }

        return ()=>{
            if(appRef.current){
                appRef.current.destroy();
            }
        }
    },[])
    return (
        <div id="app-container" className={`overflow-hidden relative ${className}`}>
            <Chat_Component userId={userId} username={username} players={players} />
        </div>
    )
}

export default PixiApp