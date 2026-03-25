import Enemy from './Enemy.js'

const CHARGE_RANGE = 48
const PUSH_FORCE = 200

/**
 * PolicíaMontado — Mounted police that charges and pushes on impact.
 * 15 HP, speed×1.2, 2 damage + push.
 */
export default class PoliciaMontado extends Enemy {
  constructor (scene, x, y) {
    super(scene, x, y, 'policiaMontado', {
      hp: 15,
      speed: 144, // 120 * 1.2
      damage: 2,
      attackCooldown: 1500,
      type: 'montado'
    })
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
      const attackKey = `policiaMontado_attack_${this._lastDirection}`
      if (this.scene?.anims?.exists(attackKey)) {
        this.play(attackKey)
      }

      if (this.target.takeDamage) {
        this.target.takeDamage(this.damage)
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
