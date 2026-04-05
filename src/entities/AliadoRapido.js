import Ally from './Ally.js'

const FLEE_RANGE = 130  // wider flee zone — more cautious
const KITE_RANGE = 180  // attacks from further away
const DODGE_CHANCE = 0.3 // 30% chance to sidestep when fleeing

/**
 * AliadoRápido — Fast evasive ally.
 * 8 HP, high speed. Keeps maximum distance, dodges sideways when fleeing.
 * Hit-and-run style: darts in, fires, darts out.
 */
export default class AliadoRapido extends Ally {
  constructor (scene, x, y) {
    super(scene, x, y, 'aliadoRapido', {
      hp: 8,
      speed: 220,
      type: 'rapido',
      attackCooldown: 1200
    })

    this._dodgeDir = Math.random() < 0.5 ? 1 : -1
    this._dodgeTimer = 0
  }

  /**
   * Override: fast evasive behavior with sidestep dodging.
   */
  attackNearestEnemy (enemy) {
    const dx = enemy.x - this.x
    const dy = enemy.y - this.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist < FLEE_RANGE) {
      // Flee with sidestep dodge
      const fleeX = -dx / dist
      const fleeY = -dy / dist

      // Add perpendicular dodge component
      let vx = fleeX
      let vy = fleeY
      if (Math.random() < DODGE_CHANCE) {
        // Perpendicular: rotate 90°
        vx = fleeX * 0.6 + (-fleeY) * this._dodgeDir * 0.4
        vy = fleeY * 0.6 + (fleeX) * this._dodgeDir * 0.4
        // Flip dodge direction occasionally
        this._dodgeTimer++
        if (this._dodgeTimer > 3) {
          this._dodgeDir *= -1
          this._dodgeTimer = 0
        }
      }

      this.setVelocity(vx * this.speed, vy * this.speed)
    } else if (dist < KITE_RANGE) {
      // Kite: back up while shooting
      this.setVelocity(
        (-dx / dist) * this.speed * 0.5,
        (-dy / dist) * this.speed * 0.5
      )
    } else {
      // Approach to kite range quickly
      this.setVelocity(
        (dx / dist) * this.speed * 0.7,
        (dy / dist) * this.speed * 0.7
      )
    }

    this._updateAnimation()

    // Attack from kite range
    if (dist <= KITE_RANGE) {
      const now = Date.now()
      if (now - this._lastAttackTime >= this.attackCooldown) {
        this._lastAttackTime = now
        this._fireProjectile(enemy)
      }
    }
  }
}
