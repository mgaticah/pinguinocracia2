import Ally from './Ally.js'
import EventBus from '../EventBus.js'

const PUNK_ATTACK_RANGE = 250    // detecta enemigos más lejos
const PUNK_MELEE_RANGE = 60      // se acerca más antes de atacar
const PUNK_AGGRO_DURATION = 4000 // persigue al atacante por 4s

/**
 * AliadoPunk — Aggressive punk ally.
 * 12 HP, slower but tanky, attacks frequently.
 * Seeks out enemies actively, charges into melee range.
 * Gets aggro when hit and chases the attacker.
 */
export default class AliadoPunk extends Ally {
  constructor (scene, x, y) {
    super(scene, x, y, 'aliadoPunk', {
      hp: 12,
      speed: 144,
      type: 'punk',
      attackCooldown: 800
    })

    this.attackRange = PUNK_ATTACK_RANGE
    this._aggroTarget = null
    this._aggroTimer = 0

    // Add 3 molotovs to global counter on spawn
    if (this.scene && this.scene.globalCounter) {
      this.scene.globalCounter.molotovs += 3
      EventBus.emit('molotov:changed', { count: this.scene.globalCounter.molotovs })
    }
  }

  /**
   * Override: when hit, aggro on the attacker.
   */
  takeDamage (amount, fromX, fromY) {
    super.takeDamage(amount, fromX, fromY)
    if (this.isDead) return

    // Find the enemy closest to the damage source
    const enemies = this._getEnemies()
    let closest = null
    let minDist = Infinity
    for (const e of enemies) {
      const dx = e.x - (fromX || 0)
      const dy = e.y - (fromY || 0)
      const d = Math.sqrt(dx * dx + dy * dy)
      if (d < minDist) {
        minDist = d
        closest = e
      }
    }
    if (closest && minDist < 200) {
      this._aggroTarget = closest
      this._aggroTimer = PUNK_AGGRO_DURATION
    }
  }

  /**
   * Override: prioritize aggro target, use wider detection range.
   */
  update (delta) {
    if (this.isDead || !this.active) return

    // Decrement aggro timer
    if (this._aggroTimer > 0) {
      this._aggroTimer -= delta
      if (this._aggroTimer <= 0 || !this._aggroTarget?.active) {
        this._aggroTarget = null
        this._aggroTimer = 0
      }
    }

    // Use aggro target if available, otherwise find nearest
    const enemies = this._getEnemies()
    let target = null

    if (this._aggroTarget && this._aggroTarget.active && !this._aggroTarget.isDead) {
      target = this._aggroTarget
    } else {
      target = this._findNearestEnemy(enemies)
    }

    const player = this.scene?.player
    const distToPlayer = player ? Math.sqrt((this.x - player.x) ** 2 + (this.y - player.y) ** 2) : 0

    if (distToPlayer > 600) {
      // Too far — regroup but with higher tolerance
      this._doRegroup(player)
    } else if (target) {
      this._doAggressiveAttack(target)
    } else {
      this._doAdvance(player)
    }
  }

  /**
   * Aggressive attack: charge toward enemy, get into melee range, attack fast.
   */
  _doAggressiveAttack (enemy) {
    const dx = enemy.x - this.x
    const dy = enemy.y - this.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist > PUNK_MELEE_RANGE) {
      // Charge toward enemy at full speed
      this.setVelocity(
        (dx / dist) * this.speed * 1.15,
        (dy / dist) * this.speed * 1.15
      )
    } else {
      // In melee range — stop and pummel
      this.setVelocity(0, 0)
    }

    this._updateAnimation()

    // Attack if cooldown allows
    const now = Date.now()
    if (now - this._lastAttackTime >= this.attackCooldown) {
      this._lastAttackTime = now
      this._fireProjectile(enemy)
    }
  }
}
