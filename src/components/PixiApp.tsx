import { useEffect, useRef } from "react"
import { PlayApp } from "../../utils/pixi/PlayApp";
import type { RealmData } from "../../utils/pixi/types";

type PixiAppPropa= {
    className?: string
    realmData: RealmData
    username: string
    initialSkin: string
}

const PixiApp:React.FC<PixiAppPropa> = ({ className, realmData, username, initialSkin }) => {

    const appRef=useRef<PlayApp | null>(null);

    useEffect(() => {
        const mount=async()=>{
        const app=new PlayApp(realmData, username, initialSkin);
        appRef.current=app;
        await app.init();
        const pixiApp=app.getApp();
        document.getElementById('app-container')!.appendChild(pixiApp.canvas);
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
        <div id="app-container" className={`overflow-hidden ${className}`}>

        </div>
    )
}

export default PixiApp