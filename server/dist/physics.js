"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePhysics = updatePhysics;
exports.resetPuck = resetPuck;
exports.createInitialPuck = createInitialPuck;
exports.clampPaddlePosition = clampPaddlePosition;
exports.pixelsToKmh = pixelsToKmh;
const types_1 = require("./types");
const { TABLE_WIDTH, TABLE_HEIGHT, PUCK_RADIUS, PADDLE_RADIUS, GOAL_WIDTH, FRICTION, RESTITUTION, MAX_PUCK_SPEED, PADDLE_HIT_BOOST } = types_1.GAME_CONFIG;
function vectorLength(v) {
    return Math.sqrt(v.x * v.x + v.y * v.y);
}
function normalizeVector(v) {
    const len = vectorLength(v);
    if (len === 0)
        return { x: 0, y: 0 };
    return { x: v.x / len, y: v.y / len };
}
function dotProduct(a, b) {
    return a.x * b.x + a.y * b.y;
}
function subtractVectors(a, b) {
    return { x: a.x - b.x, y: a.y - b.y };
}
function addVectors(a, b) {
    return { x: a.x + b.x, y: a.y + b.y };
}
function scaleVector(v, scale) {
    return { x: v.x * scale, y: v.y * scale };
}
function distance(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
}
function clampSpeed(velocity, maxSpeed) {
    const speed = vectorLength(velocity);
    if (speed > maxSpeed) {
        const scale = maxSpeed / speed;
        return scaleVector(velocity, scale);
    }
    return velocity;
}
function updatePhysics(puck, players, deltaTime) {
    const collisions = [];
    let goal = null;
    // Apply velocity
    const dt = deltaTime / 16.67; // Normalize to 60fps
    puck.position.x += puck.velocity.x * dt;
    puck.position.y += puck.velocity.y * dt;
    // Apply friction
    puck.velocity.x *= FRICTION;
    puck.velocity.y *= FRICTION;
    // Clamp speed
    puck.velocity = clampSpeed(puck.velocity, MAX_PUCK_SPEED);
    // Check paddle collisions
    for (const player of players) {
        const paddle = player.paddle;
        const dist = distance(puck.position, paddle.position);
        const minDist = PUCK_RADIUS + PADDLE_RADIUS;
        if (dist < minDist) {
            // Collision detected
            const normal = normalizeVector(subtractVectors(puck.position, paddle.position));
            // Use relative velocity (puck - paddle) to check approach
            const relVelocity = subtractVectors(puck.velocity, paddle.velocity);
            const relAlongNormal = dotProduct(relVelocity, normal);
            // Resolve if objects are approaching each other (relative motion)
            if (relAlongNormal < 0) {
                // Reflect relative velocity
                const reflected = subtractVectors(puck.velocity, scaleVector(normal, 2 * relAlongNormal));
                // Add paddle velocity for momentum transfer
                const paddleSpeed = vectorLength(paddle.velocity);
                const paddleInfluence = scaleVector(paddle.velocity, 0.8);
                puck.velocity = addVectors(reflected, paddleInfluence);
                // Boost based on paddle speed
                const speedBoost = Math.max(PADDLE_HIT_BOOST, 1.0 + paddleSpeed * 0.15);
                puck.velocity = scaleVector(puck.velocity, Math.min(speedBoost, 3.0));
                puck.velocity = clampSpeed(puck.velocity, MAX_PUCK_SPEED);
            }
            else {
                // Still overlapping but not approaching — just push puck away with paddle momentum
                if (vectorLength(paddle.velocity) > 1) {
                    puck.velocity = addVectors(puck.velocity, scaleVector(paddle.velocity, 1.2));
                    puck.velocity = clampSpeed(puck.velocity, MAX_PUCK_SPEED);
                }
            }
            // Always separate puck from paddle
            const overlap = minDist - dist;
            puck.position = addVectors(puck.position, scaleVector(normal, overlap + 1));
            collisions.push({
                type: 'paddle',
                position: { ...puck.position },
                velocity: vectorLength(puck.velocity),
                playerId: player.id,
            });
        }
    }
    // Wall collisions (left/right)
    if (puck.position.x - PUCK_RADIUS < 0) {
        puck.position.x = PUCK_RADIUS;
        puck.velocity.x = -puck.velocity.x * RESTITUTION;
        collisions.push({
            type: 'wall',
            position: { ...puck.position },
            velocity: vectorLength(puck.velocity),
        });
    }
    else if (puck.position.x + PUCK_RADIUS > TABLE_WIDTH) {
        puck.position.x = TABLE_WIDTH - PUCK_RADIUS;
        puck.velocity.x = -puck.velocity.x * RESTITUTION;
        collisions.push({
            type: 'wall',
            position: { ...puck.position },
            velocity: vectorLength(puck.velocity),
        });
    }
    // Goal zones
    const goalLeft = (TABLE_WIDTH - GOAL_WIDTH) / 2;
    const goalRight = (TABLE_WIDTH + GOAL_WIDTH) / 2;
    const isInGoalX = puck.position.x > goalLeft && puck.position.x < goalRight;
    // Top wall / goal
    if (puck.position.y - PUCK_RADIUS < 0) {
        if (isInGoalX) {
            // Goal scored on top player!
            goal = 'top';
            collisions.push({
                type: 'goal',
                position: { ...puck.position },
                velocity: vectorLength(puck.velocity),
            });
        }
        else {
            puck.position.y = PUCK_RADIUS;
            puck.velocity.y = -puck.velocity.y * RESTITUTION;
            collisions.push({
                type: 'wall',
                position: { ...puck.position },
                velocity: vectorLength(puck.velocity),
            });
        }
    }
    // Bottom wall / goal
    if (puck.position.y + PUCK_RADIUS > TABLE_HEIGHT) {
        if (isInGoalX) {
            // Goal scored on bottom player!
            goal = 'bottom';
            collisions.push({
                type: 'goal',
                position: { ...puck.position },
                velocity: vectorLength(puck.velocity),
            });
        }
        else {
            puck.position.y = TABLE_HEIGHT - PUCK_RADIUS;
            puck.velocity.y = -puck.velocity.y * RESTITUTION;
            collisions.push({
                type: 'wall',
                position: { ...puck.position },
                velocity: vectorLength(puck.velocity),
            });
        }
    }
    return { puck, goal, collisions };
}
function resetPuck(scoredOn) {
    // Puck starts in the center, moving towards the player who was scored on
    const direction = scoredOn === 'top' ? -1 : 1;
    return {
        position: { x: TABLE_WIDTH / 2, y: TABLE_HEIGHT / 2 },
        velocity: { x: (Math.random() - 0.5) * 2, y: direction * 3 },
        radius: PUCK_RADIUS,
    };
}
function createInitialPuck() {
    // Random starting direction
    const direction = Math.random() > 0.5 ? 1 : -1;
    return {
        position: { x: TABLE_WIDTH / 2, y: TABLE_HEIGHT / 2 },
        velocity: { x: (Math.random() - 0.5) * 6, y: direction * 10 },
        radius: PUCK_RADIUS,
    };
}
function clampPaddlePosition(position, side) {
    // Clamp X
    let x = Math.max(PADDLE_RADIUS, Math.min(TABLE_WIDTH - PADDLE_RADIUS, position.x));
    // Clamp Y to player's half
    let y;
    if (side === 'top') {
        y = Math.max(PADDLE_RADIUS, Math.min(TABLE_HEIGHT / 2 - PADDLE_RADIUS, position.y));
    }
    else {
        y = Math.max(TABLE_HEIGHT / 2 + PADDLE_RADIUS, Math.min(TABLE_HEIGHT - PADDLE_RADIUS, position.y));
    }
    return { x, y };
}
function pixelsToKmh(pixelsPerFrame) {
    // Fun conversion - 1 pixel = 1mm, 60fps
    // pixelsPerFrame * 60 = pixels per second
    // pixels per second * 0.001 = meters per second
    // m/s * 3.6 = km/h
    return Math.round(pixelsPerFrame * 60 * 0.001 * 3.6 * 100); // Scaled up for fun factor
}
//# sourceMappingURL=physics.js.map