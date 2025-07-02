import * as PIXI from 'pixi.js'
import type { Layer, RealmData, ColliderMap, TilePoint, Room } from './types'
import type { Collider } from './spritesheet/spritesheet'
import { sprites } from './spritesheet/spritesheet'
import { TileSchema } from './zod'

// Set pixel art rendering (no blurry scaling)
PIXI.TextureStyle.defaultOptions.scaleMode = 'nearest'

/**
 * 🗺️ MAP GENERATOR CLASS
 * 
 * This class takes JSON coordinate data and converts it into a visual game map!
 * It handles loading tilesets, placing tiles at coordinates, and managing layers.
 */
export class App {
    // 🖥️ PIXI Application - handles the canvas and rendering
    protected app: PIXI.Application = new PIXI.Application()
    protected initialized: boolean = false
    
    // 🏗️ VISUAL LAYERS - tiles are rendered in 3 layers (bottom to top)
    protected layers: { [key in Layer]: PIXI.Container } = {
        floor: new PIXI.Container(),      // Bottom layer: grass, dirt, stone floors
        above_floor: new PIXI.Container(), // Middle layer: overlays, transitions, decorations
        object: new PIXI.Container(),     // Top layer: trees, walls, furniture, NPCs
    }
    
    // 🏠 ROOM MANAGEMENT
    public currentRoomIndex: number = 0    // Which room is currently loaded (0, 1, 2, etc.)
    public realmData: RealmData           // Contains ALL room data from defaultmap.json
    
    // 🚫 COLLISION DETECTION
    protected collidersFromSpritesMap: ColliderMap = {} // Tracks which coordinates block movement
    
    // 🎨 VISUAL SETTINGS
    protected backgroundColor: number = 0x0F0F0F // Dark background color

    // 🎯 Frustum Culling Integration
    protected onTileAddedCallback?: (sprite: PIXI.Container) => void;
    
    // 🚀 Smart Sorting Optimization
    private sortingDirty: boolean = false;
    private lastSortTime: number = 0;
    private readonly SORT_THROTTLE_MS = 16; // ~60fps sorting maximum

    /**
     * 🏗️ CONSTRUCTOR - Initialize with map data
     * @param realmData - The complete map data (usually from defaultmap.json)
     */
    constructor(realmData: RealmData) {
        // Deep clone the data to avoid mutations
        this.realmData = JSON.parse(JSON.stringify(realmData))
    }

    /**
     * 🎯 Set callback for when tiles are added (for frustum culling)
     */
    public setOnTileAddedCallback(callback: (sprite: PIXI.Container) => void) {
        this.onTileAddedCallback = callback;
    }

    /**
     * 🚀 INITIALIZE THE GAME ENGINE
     * Sets up the PIXI canvas and adds all layers to the stage
     */
    public async init() {
        // Find the HTML container where we'll put the game
        const container = document.getElementById('app-container')
        if (!container) {
            throw new Error('Container not found')
        }

        // Initialize PIXI with our settings
        await this.app.init({
            resizeTo: container,                    // Fit to container size
            backgroundColor: this.backgroundColor,   // Dark background
            roundPixels: true,                      // Crisp pixel art
        })
        this.initialized = true

        // Add all 3 layers to the stage (order matters - floor first, object last)
        this.app.stage.addChild(this.layers.floor)      // Bottom layer
        this.app.stage.addChild(this.layers.above_floor) // Middle layer  
        this.app.stage.addChild(this.layers.object)     // Top layer
    }

    /**
     * 🗺️ MAIN MAP GENERATION FUNCTION
     * Takes a room's tilemap data and converts it into visual sprites
     * 
     * @param room - Room data containing tilemap with coordinates and tile names
     */
    protected async loadRoomFromData(room: Room) {
        // 🧹 CLEAR PREVIOUS ROOM
        // Remove all existing sprites from each layer
        this.layers.floor.removeChildren()
        this.layers.above_floor.removeChildren()
        this.layers.object.removeChildren()
        this.collidersFromSpritesMap = {} // Clear collision data

        // 🔄 PROCESS EVERY TILE IN THE ROOM
        // Loop through each coordinate in the tilemap
        for (const [tilePoint, tileData] of Object.entries(room.tilemap)) {
            // Parse and validate the tile data
            const tile = TileSchema.parse(tileData)
            const floor = tile.floor           // e.g., "ground-normal_detailed_grass"
            const above_floor = tile.above_floor // e.g., "ground-top_inner_curve_detailed_dirt"  
            const object = tile.object         // e.g., "grasslands-light_basic_tree_bundle"

            // 📐 CONVERT COORDINATE STRING TO NUMBERS
            // "1, 2" → x=1, y=2
            const [x, y] = tilePoint.split(',').map(Number)

            // 🎨 PLACE TILES ON EACH LAYER (if they exist)
            if (floor) {
                await this.placeTileFromJson(x, y, 'floor', floor)
            }

            if (above_floor) {
                await this.placeTileFromJson(x, y, 'above_floor', above_floor)
            }

            if (object) {
                await this.placeTileFromJson(x, y, 'object', object)
            }
        }

        // 🏗️ ARRANGE OBJECTS BY DEPTH (optimized)
        this.markSortingDirty()
        this.sortObjectsByYOptimized()
    }

    /**
     * 🚪 LOAD A SPECIFIC ROOM BY INDEX
     * @param index - Room number (0 = first room, 1 = second room, etc.)
     */
    protected async loadRoom(index: number) {
        const room = this.realmData.rooms[index] // Get room data from JSON
        await this.loadRoomFromData(room)        // Generate the visual map
    }

    /**
     * 🎯 PLACE A SINGLE TILE AT COORDINATES
     * This is where the magic happens - converts coordinate + tilename into visual sprite
     * 
     * @param x - Grid X coordinate (e.g., 1)
     * @param y - Grid Y coordinate (e.g., 2)  
     * @param layer - Which visual layer ('floor', 'above_floor', 'object')
     * @param tileName - Sprite name (e.g., "ground-normal_detailed_grass")
     */
    private placeTileFromJson = async (x: number, y: number, layer: Layer, tileName: string) => {
        // 📐 CONVERT GRID COORDINATES TO SCREEN PIXELS
        // Grid (1, 2) → Screen (32px, 64px) because each tile is 32x32 pixels
        const screenCoordinates = this.convertTileToScreenCoordinates(x, y)
        
        // 🖼️ LOAD THE ACTUAL IMAGE SPRITE
        // "ground-normal_detailed_grass" → gets grass texture from spritesheet
        const { sprite, data } = await sprites.getSpriteForTileJSON(tileName)
        
        // 📍 POSITION THE SPRITE ON SCREEN
        sprite.position.set(screenCoordinates.x, screenCoordinates.y)
        
        // 🏗️ ADD TO THE CORRECT VISUAL LAYER
        this.layers[layer].addChild(sprite)

        // 🎯 Notify callback for frustum culling integration
        if (this.onTileAddedCallback) {
            this.onTileAddedCallback(sprite);
        }

        // 🚫 SET UP COLLISION DETECTION
        // Some sprites (like walls, trees) block movement
        if (data.colliders) {
            data.colliders.forEach((collider) => {
                const colliderCoordinates = this.getTileCoordinatesOfCollider(collider, sprite)

                // Mark this coordinate as blocked for movement
                const key = `${colliderCoordinates.x}, ${colliderCoordinates.y}` as TilePoint
                this.collidersFromSpritesMap[key] = true
            })
        }
    }

    /**
     * 🚫 CALCULATE COLLISION COORDINATES
     * Some sprites have collision areas that don't match their visual position
     */
    protected getTileCoordinatesOfCollider = (collider: Collider, sprite: PIXI.Sprite) => {
        // Calculate the sprite's top-left corner
        const topLeftX = sprite.x - sprite.width * sprite.anchor.x
        const topLeftY = sprite.y - sprite.height * sprite.anchor.y

        // Convert back to grid coordinates
        const gridCoordinates = this.convertScreenToTileCoordinates(topLeftX, topLeftY)

        // Add the collider offset
        return {
            x: gridCoordinates.x + collider.x,
            y: gridCoordinates.y + collider.y,
        }
    }

    /**
     * 🎮 GET THE PIXI APPLICATION
     * Used by other parts of the game to access the canvas
     */
    public getApp = () => {
        if (!this.initialized) {
            throw new Error('App not initialized')
        }

        return this.app
    }

    /**
     * 📐 CONVERT SCREEN PIXELS TO GRID COORDINATES
     * Screen (64px, 96px) → Grid (2, 3)
     * 
     * @param x - Screen X position in pixels
     * @param y - Screen Y position in pixels
     * @returns Grid coordinates
     */
    public convertScreenToTileCoordinates = (x: number, y: number) => {
        const tileSize = 32 // Each tile is 32x32 pixels
        return {
            x: Math.floor(x / tileSize), // 64px ÷ 32 = 2
            y: Math.floor(y / tileSize), // 96px ÷ 32 = 3
        }
    }

    /**
     * 📐 CONVERT GRID COORDINATES TO SCREEN PIXELS  
     * Grid (2, 3) → Screen (64px, 96px)
     * 
     * @param x - Grid X coordinate
     * @param y - Grid Y coordinate  
     * @returns Screen position in pixels
     */
    public convertTileToScreenCoordinates = (x: number, y: number) => {
        const tileSize = 32 // Each tile is 32x32 pixels
        return {
            x: x * tileSize, // 2 × 32 = 64px
            y: y * tileSize, // 3 × 32 = 96px
        }
    }

    /**
     * 🚀 Mark that sorting is needed (dirty flag pattern)
     */
    public markSortingDirty() {
        this.sortingDirty = true;
    }

    /**
     * 🏗️ ARRANGE OBJECTS BY DEPTH (OPTIMIZED VERSION)
     * Objects lower on the screen should appear in front of objects higher up
     * Only sorts when needed and throttles frequency
     */
    public sortObjectsByYOptimized = () => {
        // Only sort if dirty and enough time has passed
        const now = Date.now();
        if (!this.sortingDirty || (now - this.lastSortTime) < this.SORT_THROTTLE_MS) {
            return;
        }
        
        this.sortingDirty = false;
        this.lastSortTime = now;
        
        // Only sort object layer (most dynamic layer)
        this.layers.object.children.forEach((child) => {
            child.zIndex = this.getZIndex(child)
        })
        
        // Sort the layer
        this.layers.object.sortChildren();
    }

    /**
     * 🏗️ ARRANGE OBJECTS BY DEPTH (LEGACY VERSION)
     * Objects lower on the screen should appear in front of objects higher up
     * (like a tree at the bottom appears in front of a tree at the top)
     */
    public sortObjectsByY = () => {
        this.layers.object.children.forEach((child) => {
            child.zIndex = this.getZIndex(child)
        })
    }

    /**
     * 📏 CALCULATE DEPTH VALUE FOR LAYERING
     * Higher Y position = higher zIndex = appears in front
     */
    public getZIndex = (child: PIXI.ContainerChild) => {
        if (child instanceof PIXI.Sprite) {
            const containerChild = child as PIXI.ContainerChild
            return containerChild.y + 32 // Add tile height for proper sorting
        } else {
            return child.y
        }
    }

    /**
     * 🗑️ CLEANUP FUNCTION
     * Properly destroys PIXI application when game ends
     */
    public destroy() {
        if (this.initialized) {
            this.app.destroy()
        }
    }
}