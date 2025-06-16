import * as PIXI from 'pixi.js';
import playerSpriteSheetData from './PlayerSpriteSheetData';

export class OtherPlayer extends PIXI.Container {
    private animatedSprite: PIXI.AnimatedSprite | null = null;
    // private usernameLabel: PIXI.Text;
    private lastDirection: string = 'down';
    public skin: string;
    private sheet: PIXI.Spritesheet | null = null;
    // private lastPosition: { x: number; y: number } = { x: 0, y: 0 };
    private targetPosition: { x: number; y: number } = { x: 0, y: 0 };
    private _wasMoving: boolean = false;
    private animationState: string = 'idle_down';
    // private direction: string = 'down';
    private animationSpeed: number = 0.1;

    constructor( skin: string) {
        super();
        this.skin = skin;
        // this.usernameLabel = this.addUsername(username);
        this.loadAnimations();
    }

    

    private async loadAnimations() {
        const src = `/sprites/characters/Character_${this.skin}.png`;
        await PIXI.Assets.load(src);
        const spriteSheetData = JSON.parse(JSON.stringify(playerSpriteSheetData));
        spriteSheetData.meta.image = src;
        this.sheet = new PIXI.Spritesheet(PIXI.Texture.from(src), spriteSheetData);
        await this.sheet.parse();
        this.animatedSprite = new PIXI.AnimatedSprite(this.sheet.animations['idle_down']);
        this.animatedSprite.anchor.set(0.5, 1);
        this.animatedSprite.animationSpeed = this.animationSpeed;
        this.animatedSprite.play();
        this.addChildAt(this.animatedSprite, 0);
    }

    public setPosition(x: number, y: number) {
        // Use pixel coordinates directly
        this.targetPosition = { x, y };
    }

    public update() {
        const lerp = 0.2;
        const prevX = this.x;
        const prevY = this.y;
        this.x += (this.targetPosition.x - this.x) * lerp;
        this.y += (this.targetPosition.y - this.y) * lerp;

        // Animation logic
        const dx = this.x - prevX;
        const dy = this.y - prevY;
        const speed = Math.sqrt(dx * dx + dy * dy);

        const moved = speed > 0.5;
        let direction = this.lastDirection;
        if (Math.abs(dx) > Math.abs(dy)) {
            direction = dx > 0 ? 'right' : dx < 0 ? 'left' : this.lastDirection;
        } else if (Math.abs(dy) > 0) {
            direction = dy > 0 ? 'down' : 'up';
        }
        if (moved !== this._wasMoving || direction !== this.lastDirection) {
            this.changeAnimationState(moved ? `walk_${direction}` : `idle_${direction}`);
            this.lastDirection = direction;
            this._wasMoving = moved;
        }
        // this.lastPosition = { x: this.x, y: this.y };
    }

    public changeAnimationState(state: string) {
        if (this.animationState === state) return;
        this.animationState = state;
        if (this.animatedSprite && this.sheet) {
            this.animatedSprite.textures = this.sheet.animations[state];
            this.animatedSprite.play();
        }
    }

    public async init() {
        await this.loadAnimations();
    }

    public destroy() {
        // Cleanup if needed
    }
}