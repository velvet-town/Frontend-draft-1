import { App } from './MapGenerator'
import { Player } from './Player/Player'
import type { Point, RealmData, SpriteMap, TilePoint } from './types'
import * as PIXI from 'pixi.js'
import { defaultSkin } from './Player/skins'
import signal from '../signal'
import { gsap } from 'gsap'
import { initializeWebSocket, updatePlayerPosition, leaveRoom } from '../multiplayer/API_CALLS/Player_Calls'
import { OtherPlayer } from './Player/OtherPlayer'
import { joinRoom } from '../multiplayer/API_CALLS/Player_Calls'

// 🎯 Frustum Culling Configuration
const CULLING_MARGIN = 100; // Extra pixels around viewport for smooth transitions

export class PlayApp extends App {
    private scale: number = 1.5
    public player: Player
    public blocked: Set<TilePoint> = new Set()
    public keysDown: string[] = []
    private teleportLocation: Point | null = null
    private fadeOverlay: PIXI.Graphics = new PIXI.Graphics()
    private fadeDuration: number = 0.5
    //public uid: string = ''
    // public realmId: string = ''
    public players: { [key: string]: OtherPlayer } = {}
    private disableInput: boolean = false

    // private kicked: boolean = false

    private fadeTiles: SpriteMap = {}
    private fadeTileContainer: PIXI.Container = new PIXI.Container()
    private fadeAnimation: gsap.core.Tween | null = null
    private currentPrivateAreaTiles: TilePoint[] = []
    public proximityId: string | null = null

    private positionUpdateInterval: number | null = null;
    private lastSentPosition: { x: number; y: number } | null = null;

    // 🎯 Frustum Culling Properties
    private cullableObjects: Set<PIXI.Container> = new Set();
    private lastCameraPosition: { x: number; y: number } = { x: 0, y: 0 };
    private cullingUpdateThrottle: number = 0;
    private readonly CULLING_UPDATE_FREQUENCY = 3; // Update culling every 3 frames

    constructor(realmData: RealmData, username: string, skin: string = defaultSkin) {
        super(realmData)
        //this.uid = uid
        //this.realmId = realmId
        this.player = new Player(skin, this, username, true)
    }

    override async loadRoom(index: number) {
        this.players = {}
        
        // 🎯 Set up tile callback before loading room
        this.setOnTileAddedCallback((sprite: PIXI.Container) => {
            this.addToCullingSystem(sprite);
        });
        
        await super.loadRoom(index)
        this.setUpBlockedTiles()
        this.setUpFadeTiles()
        this.spawnLocalPlayer()
        
        // 🎯 Initialize frustum culling for this room
        this.initializeFrustumCulling()
        //await this.syncOtherPlayers()
        // this.displayInitialChatMessage()
    }

    // 🎯 Initialize Frustum Culling System
    private initializeFrustumCulling() {
        this.cullableObjects.clear()
        
        // Add all tiles to culling system
        this.layers.floor.children.forEach(child => this.cullableObjects.add(child as PIXI.Container))
        this.layers.above_floor.children.forEach(child => this.cullableObjects.add(child as PIXI.Container))
        this.layers.object.children.forEach(child => this.cullableObjects.add(child as PIXI.Container))
        
        // Add fade tiles
        this.fadeTileContainer.children.forEach(child => this.cullableObjects.add(child as PIXI.Container))
        
        console.log(`🎯 Frustum culling initialized for ${this.cullableObjects.size} objects`)
    }

    // 🎯 Add Object to Culling System
    public addToCullingSystem(object: PIXI.Container) {
        this.cullableObjects.add(object)
    }

    // 🎯 Remove Object from Culling System
    public removeFromCullingSystem(object: PIXI.Container) {
        this.cullableObjects.delete(object)
    }

    // 🎯 Calculate Viewport Bounds
    private getViewportBounds() {
        const camera = this.app.stage.pivot
        const scale = this.scale
        const screenWidth = this.app.screen.width / scale
        const screenHeight = this.app.screen.height / scale
        
        return {
            left: camera.x - CULLING_MARGIN,
            right: camera.x + screenWidth + CULLING_MARGIN,
            top: camera.y - CULLING_MARGIN,
            bottom: camera.y + screenHeight + CULLING_MARGIN
        }
    }

    // 🎯 Check if Object is in Viewport
    private isObjectInViewport(object: PIXI.Container, bounds: { left: number; right: number; top: number; bottom: number }): boolean {
        const objectBounds = object.getBounds()
        
        return !(objectBounds.right < bounds.left || 
                objectBounds.left > bounds.right || 
                objectBounds.bottom < bounds.top || 
                objectBounds.top > bounds.bottom)
    }

    // 🎯 Update Frustum Culling (Throttled) - TEMPORARILY DISABLED
    private updateFrustumCulling() {
        // 🚨 TEMPORARY FIX: Disable culling to fix black area issue
        return;
        
        // Throttle culling updates to every 3 frames for performance
        this.cullingUpdateThrottle++
        if (this.cullingUpdateThrottle < this.CULLING_UPDATE_FREQUENCY) {
            return
        }
        this.cullingUpdateThrottle = 0

        const currentCamera = this.app.stage.pivot
        
        // Skip if camera hasn't moved significantly
        const cameraMoved = Math.abs(currentCamera.x - this.lastCameraPosition.x) > 10 ||
                          Math.abs(currentCamera.y - this.lastCameraPosition.y) > 10
        
        if (!cameraMoved) return
        
        this.lastCameraPosition = { x: currentCamera.x, y: currentCamera.y }
        
        const bounds = this.getViewportBounds()
        let visibleCount = 0
        let hiddenCount = 0
        
        // Update visibility for all cullable objects
        this.cullableObjects.forEach(object => {
            const wasVisible = object.visible
            const shouldBeVisible = this.isObjectInViewport(object, bounds)
            
            if (wasVisible !== shouldBeVisible) {
                object.visible = shouldBeVisible
            }
            
            if (shouldBeVisible) {
                visibleCount++
            } else {
                hiddenCount++
            }
        })
        
        // Debug logging (remove in production)
        if (this.cullableObjects.size > 0) {
            console.log(`🎯 Culling: ${visibleCount} visible, ${hiddenCount} hidden (${Math.round(hiddenCount / this.cullableObjects.size * 100)}% culled)`)
        }
    }

    private setUpFadeTiles = () => {
        this.fadeTiles = {}
        this.fadeTileContainer.removeChildren()

        for (const key of Object.keys(this.realmData.rooms[this.currentRoomIndex].tilemap)) {
            const [x, y] = key.split(',').map(Number)
            const screenCoordinates = this.convertTileToScreenCoordinates(x, y)
            const tile: PIXI.Sprite = new PIXI.Sprite(PIXI.Assets.get('/sprites/faded-tile.png'))
            tile.x = screenCoordinates.x
            tile.y = screenCoordinates.y
            this.fadeTileContainer.addChild(tile)
            this.fadeTiles[key as TilePoint] = tile
            
            // 🎯 Add fade tiles to culling system
            this.addToCullingSystem(tile)
        }
    }

    public fadeInTiles = (privateAreaId: string) => {
        // Stop any ongoing fade animation
        if (this.fadeAnimation) {
            this.fadeAnimation.kill();
        }

        this.currentPrivateAreaTiles = [];
        // get all tiles with privateAreaId
        const tiles = Object.entries(this.realmData.rooms[this.currentRoomIndex].tilemap)
            .filter((entry) => entry[1].privateAreaId === privateAreaId);
        for (const [key] of tiles) {
            const tile = this.fadeTiles[key as TilePoint];
            tile.alpha = 0;
            this.currentPrivateAreaTiles.push(key as TilePoint);
        }

        this.fadeAnimation = gsap.to(this.fadeTileContainer, { 
            alpha: 1, 
            duration: 0.25, 
            ease: 'power2.out',
            onComplete: () => {
                this.fadeAnimation = null;
            }
        });
    }

    public fadeOutTiles = () => {
        // Stop any ongoing fade animation
        if (this.fadeAnimation) {
            this.fadeAnimation.kill()
        }

        this.fadeAnimation = gsap.to(this.fadeTileContainer, { 
            alpha: 0, 
            duration: 0.25, 
            ease: 'power2.in',
            onComplete: () => {
                for (const key of this.currentPrivateAreaTiles) {
                    const tile = this.fadeTiles[key]
                    tile.alpha = 1
                }
                this.fadeAnimation = null
            }
        })
    }

    private async loadAssets() {
        await Promise.all([
            PIXI.Assets.load('/fonts/silkscreen.ttf'),
            PIXI.Assets.load('/fonts/nunito.ttf'),
            PIXI.Assets.load('/sprites/faded-tile.png')
        ])
    }


    public async init() {
        await super.init()
        await this.loadAssets()
        await this.loadRoom(this.realmData.spawnpoint.roomIndex)
        this.app.stage.eventMode = 'static'
        this.setScale(this.scale)
        this.app.renderer.on('resize', this.resizeEvent)
        this.fadeTileContainer.alpha = 0
        this.app.stage.addChild(this.fadeTileContainer)
        this.clickEvents()
        this.setUpKeyboardEvents()
        this.setUpFadeOverlay()
        this.setUpSignalListeners()

        // Add event listeners for leaving the game
        window.addEventListener('beforeunload', this.handleBeforeUnload)
        window.addEventListener('popstate', this.handlePopState)

        // Initialize WebSocket connection
        this.initializeMultiplayer().catch(error => {
            console.error('WebSocket initialization failed:', error)
        })

        this.fadeOut()

        // 🎯 Enhanced Ticker with Frustum Culling
        PIXI.Ticker.shared.add(() => {
            // Update player positions
            Object.values(this.players).forEach(player => player.update());
            
            // Update frustum culling (throttled)
            this.updateFrustumCulling();
        });
    }

    private async initializeMultiplayer() {
        try {
            const roomData = await joinRoom(this.player.username);
            
            // Initialize other players from room data
            if (roomData.players) {
                for (const player of roomData.players) {
                    if (player.id !== this.player.username) {
                        await this.spawnPlayer(player.id, player.position, player.id);
                    }
                }
            }

            // Start position update interval
            this.startPositionUpdates();

            await initializeWebSocket(this.player.username, (data: { type: string; player_id?: string; position?: { x: number; y: number }; username?: string }) => {
                switch (data.type) {
                    case 'position_update':
                        if (data.player_id && data.position) {
                            this.updatePlayer(data.player_id, data.position, data.username);
                        }
                        break;
                    case 'player_joined':
                        if (data.player_id && data.position) {
                            this.updatePlayer(data.player_id, data.position, data.username);
                        }
                        break;
                    case 'player_left':
                        if (data.player_id) {
                            if (this.players[data.player_id]) {
                                // 🎯 Remove from culling system before destroying
                                this.removeFromCullingSystem(this.players[data.player_id]);
                                this.players[data.player_id].destroy();
                                delete this.players[data.player_id];
                                console.log('[player_left] Removed:', data.player_id, 'Now:', Object.keys(this.players));
                            }
                        }
                        break;
                }
            });
        } catch (error) {
            console.error('[MULTIPLAYER] Error:', error);
        }
    }

    private handleBeforeUnload = () => {
        leaveRoom();
    }

    private handlePopState = () => {
        leaveRoom();
    }

    private async updatePlayer(playerId: string, position: { x: number; y: number }, username?: string) {
        if (this.players[playerId]) {
            this.players[playerId].setPosition(position.x, position.y);
            if (username) {
                this.players[playerId].updateUsername(username);
            }
        } else {
            await this.spawnPlayer(playerId, position, username);
        }
    }

    private async spawnPlayer(playerId: string, position: { x: number; y: number }, username?: string) {

        const skin = '009'; // Or get from player data if available
        const otherPlayer = new OtherPlayer(skin, username || playerId);
        otherPlayer.setPosition(position.x, position.y);
        this.layers.object.addChild(otherPlayer);
        this.players[playerId] = otherPlayer;
        
        // 🎯 Add new player to culling system
        this.addToCullingSystem(otherPlayer);
    }

    private spawnLocalPlayer = async () => {
        await this.player.init()

        if (this.teleportLocation) {
            this.player.setPosition(this.teleportLocation.x, this.teleportLocation.y)
        } else {
            this.player.setPosition(this.realmData.spawnpoint.x, this.realmData.spawnpoint.y)
        }
        this.layers.object.addChild(this.player.parent)
        
        // 🎯 Add local player to culling system (though main player should always be visible)
        this.addToCullingSystem(this.player.parent)
        
        this.moveCameraToPlayer()
    }

    private setScale = (newScale: number) => {
        this.scale = newScale
        this.app.stage.scale.set(this.scale)
    }

    public moveCameraToPlayer = () => {
        const x = this.player.parent.x - (this.app.screen.width / 2) / this.scale
        const y = this.player.parent.y - (this.app.screen.height / 2) / this.scale
        this.app.stage.pivot.set(x, y)
        this.updateFadeOverlay(x, y)
        
        // 🎯 Force culling update when camera moves significantly
        this.updateFrustumCulling()
    }

    private updateFadeOverlay = (x: number, y: number) => {
        this.fadeOverlay.clear()
        this.fadeOverlay.rect(0, 0, this.app.screen.width * (1 / this.scale), this.app.screen.height * (1 / this.scale))
        this.fadeOverlay.fill(0x0F0F0F)
        this.fadeOverlay.pivot.set(-x, -y)
    }

    private resizeEvent = () => {
        this.moveCameraToPlayer()
        
        // 🎯 Update culling on resize
        this.updateFrustumCulling()
    }

    private setUpFadeOverlay = () => {
        this.fadeOverlay.rect(0, 0, this.app.screen.width * (1 / this.scale), this.app.screen.height * (1 / this.scale))
        this.fadeOverlay.fill(0x0F0F0F)
        this.app.stage.addChild(this.fadeOverlay)
    }

    private setUpBlockedTiles = () => {
        this.blocked = new Set<TilePoint>()

        for (const [key, value] of Object.entries(this.realmData.rooms[this.currentRoomIndex].tilemap)) {
            if (value.impassable) {
                this.blocked.add(key as TilePoint)
            }
        }

        for (const [key, value] of Object.entries(this.collidersFromSpritesMap)) {
            if (value) {
                this.blocked.add(key as TilePoint)
            }
        }
    }

    private clickEvents = () => {
        this.app.stage.on('pointerdown', (e: PIXI.FederatedPointerEvent) => {
            if (this.player.frozen || this.disableInput) return  

            const clickPosition = e.getLocalPosition(this.app.stage)
            const { x, y } = this.convertScreenToTileCoordinates(clickPosition.x, clickPosition.y)
            this.player.moveToTile(x, y)
            this.player.setMovementMode('mouse')
        })
    }

    private setUpKeyboardEvents = () => {
        document.addEventListener('keydown', this.keydown)
        document.addEventListener('keyup', this.keyup)
    }

    private keydown = (event: KeyboardEvent) => {
        if (this.keysDown.includes(event.key) || this.disableInput) return
        this.player.keydown(event)
        this.keysDown.push(event.key)
    }

    private keyup = (event: KeyboardEvent) => {
        this.keysDown = this.keysDown.filter((key) => key !== event.key)
    }

    public teleportIfOnTeleportSquare = (x: number, y: number) => {
        const tile = `${x}, ${y}` as TilePoint
        const teleport = this.realmData.rooms[this.currentRoomIndex].tilemap[tile]?.teleporter
        if (teleport) {
            this.teleport(teleport.roomIndex, teleport.x, teleport.y)
            return true
        }
        return false
    }

    private teleport = async (roomIndex: number, x: number, y: number) => {
        this.player.setFrozen(true)
        await this.fadeIn()
        if (this.currentRoomIndex === roomIndex) {
            this.player.setPosition(x, y)
            this.moveCameraToPlayer()
        } else {
            this.teleportLocation = { x, y }
            this.currentRoomIndex = roomIndex
            this.player.changeAnimationState('idle_down')
            await this.loadRoom(roomIndex)
        }

        // server.socket.emit('teleport', { x, y, roomIndex })

        this.player.setFrozen(false)
        this.fadeOut()
    }

    public hasTeleport = (x: number, y: number) => {
        const tile = `${x}, ${y}` as TilePoint
        return this.realmData.rooms[this.currentRoomIndex].tilemap[tile]?.teleporter
    }

    private fadeIn = () => {
        PIXI.Ticker.shared.remove(this.fadeOutTicker)
        this.fadeOverlay.alpha = 0
        return new Promise<void>((resolve) => {
            const fadeTicker = ({ deltaTime }: { deltaTime: number }) => {
                this.fadeOverlay.alpha += (deltaTime / 60) / this.fadeDuration
                if (this.fadeOverlay.alpha >= 1) {
                    this.fadeOverlay.alpha = 1
                    PIXI.Ticker.shared.remove(fadeTicker)
                    resolve()
                }
            }

            PIXI.Ticker.shared.add(fadeTicker)
        })
    }

    private fadeOut = () => {
        PIXI.Ticker.shared.add(this.fadeOutTicker)
    }

    private fadeOutTicker = ({ deltaTime }: { deltaTime: number }) => {
        this.fadeOverlay.alpha -= (deltaTime / 60) / this.fadeDuration
        if (this.fadeOverlay.alpha <= 0) {
            this.fadeOverlay.alpha = 0
            PIXI.Ticker.shared.remove(this.fadeOutTicker)
        }
    }

    private destroyPlayers = () => {
        for (const player of Object.values(this.players)) {
            player.destroy()
        }
        this.player.destroy()
    }

    private setUpSignalListeners = () => {
        signal.on('requestSkin', this.onRequestSkin)
        signal.on('switchSkin', this.onSwitchSkin)
        signal.on('disableInput', this.onDisableInput)
        signal.on('message', this.onMessage)
        signal.on('getSkinForUid', this.getSkinForUid)
    }

    private removeSignalListeners = () => {
        signal.off('requestSkin', this.onRequestSkin)
        signal.off('switchSkin', this.onSwitchSkin)
        signal.off('disableInput', this.onDisableInput)
        signal.off('message', this.onMessage)
        signal.off('getSkinForUid', this.getSkinForUid)
    }

    private onRequestSkin = () => {
        signal.emit('skin', this.player.skin)
    }

    private onSwitchSkin = (skin: string) => {
        this.player.changeSkin(skin)
        // server.socket.emit('changedSkin', skin)
    }

    private getSkinForUid = (uid: string) => {
        const player = this.players[uid]
        if (!player) return

        signal.emit('video-skin', {
            skin: player.skin,
            uid: uid,
        })
    }

    private onDisableInput = (disable: boolean) => {
        this.disableInput = disable
        this.keysDown = []
    }


    private onMessage = (message: string) => {
        this.player.setMessage(message)
        // server.socket.emit('sendMessage', message)
    }


    private removeEvents = () => {
        // this.removeSocketEvents()
        this.destroyPlayers()
        // server.disconnect()

        PIXI.Ticker.shared.destroy()

        this.removeSignalListeners()
        document.removeEventListener('keydown', this.keydown)
        document.removeEventListener('keyup', this.keyup)
    }

    public destroy() {
        // Remove event listeners
        window.removeEventListener('beforeunload', this.handleBeforeUnload)
        window.removeEventListener('popstate', this.handlePopState)
        console.log('Cleaning up PlayApp...');
        // Clear position update interval
        if (this.positionUpdateInterval) {
            clearInterval(this.positionUpdateInterval);
            this.positionUpdateInterval = null;
        }
        this.removeEvents()
        super.destroy()
    }

    // Update player position on backend and broadcast to others
    public movePlayer = (x: number, y: number) => {
        if (this.player.frozen || this.disableInput) return;
        const tileX = Math.floor(x / 32);
        const tileY = Math.floor(y / 32);
        if (this.isValidMove(tileX, tileY)) {
            this.player.moveToTile(tileX, tileY);
            this.player.setMovementMode('keyboard');
            
            const position = { x: tileX * 32, y: tileY * 32 };
            updatePlayerPosition(position, this.player.username);
        }
    }

    private isValidMove = (x: number, y: number): boolean => {
        const tile = `${x}, ${y}` as TilePoint;
        return !this.blocked.has(tile);
    }

    private startPositionUpdates() {
        // Clear any existing interval
        if (this.positionUpdateInterval) {
            clearInterval(this.positionUpdateInterval);
        }

        // Send position updates every 100ms
        this.positionUpdateInterval = window.setInterval(() => {
            const currentPosition = {
                x: this.player.parent.x,
                y: this.player.parent.y
            };

            // Only send if position has changed
            if (!this.lastSentPosition || 
                this.lastSentPosition.x !== currentPosition.x || 
                this.lastSentPosition.y !== currentPosition.y) {
               
                updatePlayerPosition(currentPosition, this.player.username);
                this.lastSentPosition = currentPosition;
            }
        }, 100);
    }
}