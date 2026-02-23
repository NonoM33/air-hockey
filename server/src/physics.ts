import { Vector2D, Puck, Paddle, GAME_CONFIG, Player } from './types';

const { TABLE_WIDTH, TABLE_HEIGHT, PUCK_RADIUS, PADDLE_RADIUS, GOAL_WIDTH, FRICTION, RESTITUTION, MAX_PUCK_SPEED, PADDLE_HIT_BOOST } = GAME_CONFIG;

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

function vectorLength(v: Vector2D): number {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

function normalizeVector(v: Vector2D): Vector2D {
  const len = vectorLength(v);
  if (len === 0) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

function dotProduct(a: Vector2D, b: Vector2D): number {
  return a.x * b.x + a.y * b.y;
}

function subtractVectors(a: Vector2D, b: Vector2D): Vector2D {
  return { x: a.x - b.x, y: a.y - b.y };
}

function addVectors(a: Vector2D, b: Vector2D): Vector2D {
  return { x: a.x + b.x, y: a.y + b.y };
}

function scaleVector(v: Vector2D, scale: number): Vector2D {
  return { x: v.x * scale, y: v.y * scale };
}

function distance(a: Vector2D, b: Vector2D): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function clampSpeed(velocity: Vector2D, maxSpeed: number): Vector2D {
  const speed = vectorLength(velocity);
  if (speed > maxSpeed) {
    const scale = maxSpeed / speed;
    return scaleVector(velocity, scale);
  }
  return velocity;
}

export function updatePhysics(puck: Puck, players: Player[], deltaTime: number): PhysicsResult {
  const collisions: CollisionEvent[] = [];
  let goal: 'top' | 'bottom' | null = null;

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
        const reflected = subtractVectors(
          puck.velocity,
          scaleVector(normal, 2 * relAlongNormal)
        );

        // Add paddle velocity for momentum transfer
        const paddleSpeed = vectorLength(paddle.velocity);
        const paddleInfluence = scaleVector(paddle.velocity, 0.8);
        
        puck.velocity = addVectors(reflected, paddleInfluence);
        
        // Boost based on paddle speed
        const speedBoost = Math.max(PADDLE_HIT_BOOST, 1.0 + paddleSpeed * 0.08);
        puck.velocity = scaleVector(puck.velocity, Math.min(speedBoost, 2.0));
        puck.velocity = clampSpeed(puck.velocity, MAX_PUCK_SPEED);
      } else {
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
  } else if (puck.position.x + PUCK_RADIUS > TABLE_WIDTH) {
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
    } else {
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
    } else {
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

export function resetPuck(scoredOn: 'top' | 'bottom'): Puck {
  // Puck starts in the center, moving towards the player who was scored on
  const direction = scoredOn === 'top' ? -1 : 1;
  return {
    position: { x: TABLE_WIDTH / 2, y: TABLE_HEIGHT / 2 },
    velocity: { x: (Math.random() - 0.5) * 2, y: direction * 3 },
    radius: PUCK_RADIUS,
  };
}

export function createInitialPuck(): Puck {
  // Random starting direction
  const direction = Math.random() > 0.5 ? 1 : -1;
  return {
    position: { x: TABLE_WIDTH / 2, y: TABLE_HEIGHT / 2 },
    velocity: { x: (Math.random() - 0.5) * 3, y: direction * 6 },
    radius: PUCK_RADIUS,
  };
}

export function clampPaddlePosition(position: Vector2D, side: 'top' | 'bottom'): Vector2D {
  // Clamp X
  let x = Math.max(PADDLE_RADIUS, Math.min(TABLE_WIDTH - PADDLE_RADIUS, position.x));

  // Clamp Y to player's half
  let y: number;
  if (side === 'top') {
    y = Math.max(PADDLE_RADIUS, Math.min(TABLE_HEIGHT / 2 - PADDLE_RADIUS, position.y));
  } else {
    y = Math.max(TABLE_HEIGHT / 2 + PADDLE_RADIUS, Math.min(TABLE_HEIGHT - PADDLE_RADIUS, position.y));
  }

  return { x, y };
}

export function pixelsToKmh(pixelsPerFrame: number): number {
  // Fun conversion - 1 pixel = 1mm, 60fps
  // pixelsPerFrame * 60 = pixels per second
  // pixels per second * 0.001 = meters per second
  // m/s * 3.6 = km/h
  return Math.round(pixelsPerFrame * 60 * 0.001 * 3.6 * 100); // Scaled up for fun factor
}
