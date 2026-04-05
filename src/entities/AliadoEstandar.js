import Ally from './Ally.js'

const FLEE_RANGE = 100  // flee if enemy closer than this
const KITE_RANGE = 150  // attack from this distance while backing up

/**
 * AliadoEstándar — Evasive standard ally.
 * 10 HP, base speed. Keeps distance from enemies, attacks while retreating.
 * Flees toward the player when enemies get too close.
 */
export default class AliadoEstandar extends Ally {
  constructor (scene, x, y) {
    super(scene, x, y, 'aliadoEstandar', {
      hp: 10,
      speed: 160,
      type: 'estandar',
      attackCooldown: 1500
    })
  }

  /**
   * Override: evasive behavior — kite enemies, flee when too close.
   */
  attackNearestEnemy (enemy) {
    const dx = enemy.x - this.x
    const dy = enemy.y - this.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist < FLEE_RANGE) {
      // Too close — flee toward player
      const player = this.scene?.player
      if (player) {
        const pdx = player.x - this.x
        const pdy = player.y - this.y
        const pdist = Math.sqrt(pdx * pdx + pdy * pdy) || 1
        // Blend: 70% away from enemy + 30% toward player
        const fleeX = -dx / dist
        const fleeY = -dy / dist
        const toPlayerX = pdx / pdist
        const toPlayerY = pdy / pdist
        this.setVelocity(
          (fleeX * 0.7 + toPlayerX * 0.3) * this.speed,
          (fleeY * 0.7 + toPlayerY * 0.3) * this.speed
        )
      } else {
        // No player ref — just flee away from enemy
        this.setVelocity(
          (-dx / dist) * this.speed,
          (-dy / dist) * this.speed
        )
      }
    } else if (dist < KITE_RANGE) {
      // In kite range — back up slowly while attacking
      this.setVelocity(
        (-dx / dist) * this.speed * 0.4,
        (-dy / dist) * this.speed * 0.4
      )
    } else {
      // Out of range — approach to kite range
      this.setVelocity(
        (dx / dist) * this.speed * 0.6,
        (dy / dist) * this.speed * 0.6
      )
    }

    this._updateAnimation()

    // Attack if cooldown allows and within kite range
    if (dist <= KITE_RANGE) {
      const now = Date.now()
      if (now - this._lastAttackTime >= this.attackCooldown) {
        this._lastAttackTime = now
        this._fireProjectile(enemy)
      }
    }
  }
}
