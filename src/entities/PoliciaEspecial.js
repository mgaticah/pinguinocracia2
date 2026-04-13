import Enemy from './Enemy.js'

const CHARGE_RANGE = 48
const PUSH_FORCE = 250

/**
 * PolicíaEspecial — Perro siberiano antropomórfico con escudo y palo.
 * Más veloz y fuerte que el oso policía estándar.
 * 20 HP, speed×1.5, 3 damage + push.
 */
export default class PoliciaEspecial extends Enemy {
  constructor (scene, x, y) {
    super(scene, x, y, 'policiaEspecial', {
      hp: 20,
      speed: 180, // 120 * 1.5
      damage: 3,
      attackCooldown: 1200,
      type: 'especial'
    })
    this._role = 'flanker' // faster unit, natural flanker

    // Larger hitbox — fast unit needs to be hittable, offset higher for torso
    if (this.body?.setSize) {
      this.body.setSize(22, 26)
      this.body.setOffset(13, 14)
    }
  }

  update (delta) {
    super.update(delta)
    if (this.isDead || !this.target) return

    // Charge attack when in range — deal damage + push
    const dx = this.target.x - this.x
    const dy = this.target.y - this.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist <= CHARGE_RANGE && this.canAttack()) {
      // Play baton strike animation
      const attackKey = `policiaEspecial_attack_${this._lastDirection}`
      if (this.scene?.anims?.exists(attackKey)) {
        this.play(attackKey)
      }

      if (this.target.takeDamage) {
        this.target.takeDamage(this.damage, this.x, this.y)
      }

      // Push target in direction of impact
      if (dist > 0 && this.target.setVelocity) {
        const pushX = (dx / dist) * PUSH_FORCE
        const pushY = (dy / dist) * PUSH_FORCE
        this.target.setVelocity(pushX, pushY)

        // Reset target velocity after a short delay
        if (this.scene && this.scene.time) {
          this.scene.time.delayedCall(300, () => {
            if (this.target && this.target.active) {
              this.target.setVelocity(0, 0)
            }
          })
        }
      }
    }
  }
}
