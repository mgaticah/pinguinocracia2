import Enemy from './Enemy.js'

const MELEE_RANGE = 40

/**
 * PolicíaEstándar — Basic melee enemy.
 * 10 HP, base speed, 1 damage, 1s cooldown.
 */
export default class PoliciaEstandar extends Enemy {
  constructor (scene, x, y) {
    super(scene, x, y, 'policiaEstandar', {
      hp: 10,
      speed: 120,
      damage: 1,
      attackCooldown: 1000,
      type: 'estandar'
    })
  }

  update (delta) {
    super.update(delta)
    if (this.isDead || !this.target) return

    // Melee attack when in range
    const dx = this.target.x - this.x
    const dy = this.target.y - this.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist <= MELEE_RANGE && this.canAttack()) {
      // Play baton strike animation
      const attackKey = `policiaEstandar_attack_${this._lastDirection}`
      if (this.scene?.anims?.exists(attackKey)) {
        this.play(attackKey)
      }

      if (this.target.takeDamage) {
        this.target.takeDamage(this.damage)
      }
    }
  }
}
