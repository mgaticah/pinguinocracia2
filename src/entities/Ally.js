import Phaser from 'phaser'
import EventBus from '../EventBus.js'
import Projectile from './Projectile.js'

const ATTACK_RANGE = 150
const FOLLOW_DISTANCE = 60
const ATTACK_CLOSE_RANGE = 120

/**
 * Ally — Base class for all ally types.
 * Follows the Player when no enemy is in range, attacks nearest enemy otherwise.
 */
export default class Ally extends Phaser.Physics.Arcade.Sprite {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x
   * @param {number} y
   * @param {string} texture
   * @param {object} config - { hp, speed, type, attackCooldown }
   */
  constructor (scene, x, y, texture, config = {}) {
    super(scene, x, y, texture)

    scene.add.existing(this)
    scene.physics.add.existing(this)

    // Scale up sprite for visibility
    if (this.setScale) this.setScale(2)

    this.hp = config.hp ?? 10
    this.maxHp = this.hp
    this.speed = config.speed ?? 160
    this.type = config.type ?? 'estandar'
    this.attackCooldown = config.attackCooldown ?? 1500
    this.attackRange = ATTACK_RANGE
    this._lastAttackTime = 0
    this._formationOffset = { x: 0, y: 0 }
    this._lastDirection = 'down'
    this.isDead = false
  }

  /**
   * Main update loop.
   * If enemy in range → attack, else → follow player using formation offset.
   * @param {number} delta - ms since last frame
   */
  update (delta) {
    if (this.isDead || !this.active) return

    const enemies = this._getEnemies()
    const nearest = this._findNearestEnemy(enemies)

    if (nearest) {
      this.attackNearestEnemy(nearest)
    } else {
      const player = this.scene && this.scene.player
      if (player) {
        this.followPlayer(player, this._formationOffset)
      }
    }
  }

  /**
   * Move toward player + formation offset position.
   * @param {object} player
   * @param {{ x: number, y: number }} formationOffset
   */
  followPlayer (player, formationOffset) {
    const targetX = player.x + (formationOffset ? formationOffset.x : 0)
    const targetY = player.y + (formationOffset ? formationOffset.y : 0)

    const dx = targetX - this.x
    const dy = targetY - this.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist > FOLLOW_DISTANCE / 3) {
      this.setVelocity(
        (dx / dist) * this.speed,
        (dy / dist) * this.speed
      )
    } else {
      this.setVelocity(0, 0)
    }

    // Direction-based animation
    const vx = this.body?.velocity?.x ?? 0
    const vy = this.body?.velocity?.y ?? 0
    const textureKey = this.texture.key

    if (Math.abs(vx) > 1 || Math.abs(vy) > 1) {
      if (Math.abs(vy) >= Math.abs(vx)) {
        this._lastDirection = vy < 0 ? 'up' : 'down'
      } else {
        this._lastDirection = vx < 0 ? 'left' : 'right'
      }
      const walkKey = `${textureKey}_walk_${this._lastDirection}`
      if (this.scene?.anims?.exists(walkKey)) {
        this.play(walkKey, true)
      }
    } else {
      const idleKey = `${textureKey}_idle_${this._lastDirection}`
      if (this.scene?.anims?.exists(idleKey)) {
        this.play(idleKey, true)
      }
    }
  }

  /**
   * Move toward nearest enemy and attack when close enough.
   * @param {object} enemy - nearest enemy sprite
   */
  attackNearestEnemy (enemy) {
    const dx = enemy.x - this.x
    const dy = enemy.y - this.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    // Move toward enemy
    if (dist > ATTACK_CLOSE_RANGE) {
      this.setVelocity(
        (dx / dist) * this.speed,
        (dy / dist) * this.speed
      )
    } else {
      this.setVelocity(0, 0)
    }

    // Direction-based animation
    const vx = this.body?.velocity?.x ?? 0
    const vy = this.body?.velocity?.y ?? 0
    const textureKey = this.texture.key

    if (Math.abs(vx) > 1 || Math.abs(vy) > 1) {
      if (Math.abs(vy) >= Math.abs(vx)) {
        this._lastDirection = vy < 0 ? 'up' : 'down'
      } else {
        this._lastDirection = vx < 0 ? 'left' : 'right'
      }
      const walkKey = `${textureKey}_walk_${this._lastDirection}`
      if (this.scene?.anims?.exists(walkKey)) {
        this.play(walkKey, true)
      }
    } else {
      const idleKey = `${textureKey}_idle_${this._lastDirection}`
      if (this.scene?.anims?.exists(idleKey)) {
        this.play(idleKey, true)
      }
    }

    // Attack if cooldown allows
    const now = Date.now()
    if (now - this._lastAttackTime >= this.attackCooldown) {
      this._lastAttackTime = now
      this._fireProjectile(enemy)
    }
  }

  /**
   * Fire a projectile at the target enemy.
   * Uses Molotov if globalCounter has molotovs, otherwise Piedra.
   * @param {object} target
   */
  _fireProjectile (target) {
    const globalCounter = this.scene && this.scene.globalCounter
    let weaponType = 'piedra'

    if (globalCounter && globalCounter.molotovs > 0) {
      weaponType = 'molotov'
      globalCounter.molotovs -= 1
      EventBus.emit('molotov:changed', { count: globalCounter.molotovs })
    }

    // Play throw animation in the facing direction
    const textureKey = this.texture?.key
    if (textureKey) {
      const attackKey = `${textureKey}_attack_${this._lastDirection}`
      if (this.scene?.anims?.exists(attackKey)) {
        this.play(attackKey)
      }
    }

    const projectile = new Projectile(
      this.scene, this.x, this.y, weaponType, target.x, target.y
    )

    if (this.scene && this.scene.projectileGroup) {
      this.scene.projectileGroup.add(projectile)
      if (projectile.launch) projectile.launch()
    }

    return projectile
  }

  /**
   * Reduce HP by amount, clamped to [0, maxHp].
   * @param {number} amount
   */
  takeDamage (amount, fromX, fromY) {
    if (this.isDead || amount <= 0) return

    this.hp = Math.max(0, this.hp - amount)
    this._flashHit()
    this._knockback(fromX, fromY)

    if (this.hp <= 0) {
      this.die()
    }
  }

  /**
   * Push entity away from damage source by 10% of body size.
   */
  _knockback (fromX, fromY) {
    if (fromX == null || fromY == null) return
    const dx = this.x - fromX
    const dy = this.y - fromY
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist === 0) return
    const push = 10
    this.x += (dx / dist) * push
    this.y += (dy / dist) * push
  }

  /**
   * Emit ally:died and destroy.
   */
  die () {
    if (this.isDead) return
    this.isDead = true

    this.setVelocity(0, 0)
    EventBus.emit('ally:died', { ally: this })

    if (this.scene && this.scene.tweens) {
      this.scene.tweens.add({
        targets: this,
        alpha: 0,
        duration: 300,
        onComplete: () => {
          this.destroy()
        }
      })
    } else {
      this.destroy()
    }
  }

  /**
   * Flash yellow tint when hit.
   */
  _flashHit () {
    if (this.setTint) {
      this.setTint(0xffff00)
      if (this.scene?.time) {
        this.scene.time.delayedCall(150, () => {
          if (this.active && this.clearTint) this.clearTint()
        })
      }
    }
  }

  /**
   * Increase HP by amount, clamped to maxHp.
   * @param {number} amount
   */
  heal (amount) {
    if (this.isDead || amount <= 0) return

    this.hp = Math.min(this.maxHp, this.hp + amount)
  }

  /**
   * Get enemies from the scene's enemyGroup.
   * @returns {Array}
   */
  _getEnemies () {
    if (this.scene && this.scene.enemyGroup) {
      return this.scene.enemyGroup.getChildren().filter(e => e.active && !e.isDead)
    }
    return []
  }

  /**
   * Find the nearest enemy within attack range.
   * @param {Array} enemies
   * @returns {object|null}
   */
  _findNearestEnemy (enemies) {
    let nearest = null
    let minDist = Infinity

    for (const enemy of enemies) {
      const dx = enemy.x - this.x
      const dy = enemy.y - this.y
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist <= this.attackRange && dist < minDist) {
        minDist = dist
        nearest = enemy
      }
    }

    return nearest
  }
}
