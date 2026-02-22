import { Vector2D, Puck, Player } from './types';
export interface CollisionEvent {
    type: 'paddle' | 'wall' | 'goal';
    position: Vector2D;
    velocity: number;
    playerId?: string;
}
export interface PhysicsResult {
    puck: Puck;
    goal: 'top' | 'bottom' | null;
    collisions: CollisionEvent[];
}
export declare function updatePhysics(puck: Puck, players: Player[], deltaTime: number): PhysicsResult;
export declare function resetPuck(scoredOn: 'top' | 'bottom'): Puck;
export declare function createInitialPuck(): Puck;
export declare function clampPaddlePosition(position: Vector2D, side: 'top' | 'bottom'): Vector2D;
export declare function pixelsToKmh(pixelsPerFrame: number): number;
//# sourceMappingURL=physics.d.ts.map