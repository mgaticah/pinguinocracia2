import Phaser from 'phaser'
import EventBus from '../EventBus.js'
import Projectile from './Projectile.js'

const ATTACK_RANGE = 150
const ATTACK_CLOSE_RANGE = 120
const MIN_PLAYER_DISTANCE = 48  // 1 cuerpo — no acercarse más
const MAX_PLAYER_DISTANCE = 480 // 10 cuerpos — no alejarse más
const REGROUP_DISTANCE = 200    // al reagrupar, vuelve hasta ~4 cuerpos del player

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

    // Shrink physics body to lower torso/feet area
    // Must fit through 1-tile (48px) gaps: 20×20 * scale 2 = 40×40
    if (this.body?.setSize) {
      this.body.setSize(20, 20)
      this.body.setOffset(14, 24)
    }

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
   * Main update loop — state machine: advance / combat / regroup.
   * - advance: move toward nearest exit zone (goal), staying within 10 cuerpos of player
   * - combat: enemy within attack range, engage autonomously
   * - regroup: too far from player (>10 cuerpos), return to player
   * @param {number} delta - ms since last frame
   */
  update (delta) {
    if (this.isDead || !this.active) return

    const player = this.scene?.player
    const distToPlayer = player ? Math.sqrt((this.x - player.x) ** 2 + (this.y - player.y) ** 2) : 0

    // Check for nearby enemies
    const enemies = this._getEnemies()
    const nearest = this._findNearestEnemy(enemies)

    // State selection
    if (distToPlayer > MAX_PLAYER_DISTANCE) {
      // Too far from player — regroup
      this._doRegroup(player)
    } else if (nearest) {
      // Enemy in range — fight
      this.attackNearestEnemy(nearest)
    } else {
      // No enemies — advance toward goal, loosely following player
      this._doAdvance(player)
    }
  }

  /**
   * Advance toward the nearest exit zone (goal).
   * Keeps at least 1 cuerpo (48px) from the player.
   * Falls back to loose follow if no exit zones exist.
   * @param {object} player
   */
  _doAdvance (player) {
    const goal = this._getGoalPosition()

    if (!goal) {
      // No exit zone — loosely follow player at distance
      if (player) this._looseFollow(player)
      else this.setVelocity(0, 0)
      this._updateAnimation()
      return
    }

    // Head straight for the goal
    const dx = goal.x - this.x
    const dy = goal.y - this.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist > 24) {
      this.setVelocity((dx / dist) * this.speed, (dy / dist) * this.speed)
    } else {
      this.setVelocity(0, 0)
    }

    // If too close to player, nudge away
    if (player) {
      const pdx = this.x - player.x
      const pdy = this.y - player.y
      const pDist = Math.sqrt(pdx * pdx + pdy * pdy)
      if (pDist < MIN_PLAYER_DISTANCE && pDist > 0) {
        const pushX = (pdx / pDist) * this.speed * 0.5
        const pushY = (pdy / pDist) * this.speed * 0.5
        this.setVelocity(pushX, pushY)
      }
    }

    this._updateAnimation()
  }

  /**
   * Loosely follow the player keeping ~2 cuerpos distance.
   * Used when there's no exit zone on the map.
   * @param {object} player
   */
  _looseFollow (player) {
    const dx = player.x - this.x
    const dy = player.y - this.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist > MIN_PLAYER_DISTANCE * 2) {
      this.setVelocity((dx / dist) * this.speed, (dy / dist) * this.speed)
    } else if (dist < MIN_PLAYER_DISTANCE) {
      // Too close — push away
      const awayX = -dx / (dist || 1)
      const awayY = -dy / (dist || 1)
      this.setVelocity(awayX * this.speed * 0.5, awayY * this.speed * 0.5)
    } else {
      this.setVelocity(0, 0)
    }
  }

  /**
   * Regroup: return toward the player when too far away.
   * @param {object} player
   */
  _doRegroup (player) {
    if (!player) return

    const dx = player.x - this.x
    const dy = player.y - this.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist > REGROUP_DISTANCE) {
      // Run back toward player at full speed
      this.setVelocity(
        (dx / dist) * this.speed * 1.2,
        (dy / dist) * this.speed * 1.2
      )
    } else {
      this.setVelocity(0, 0)
    }

    this._updateAnimation()
  }

  /**
   * Get the nearest exit zone center as the goal position.
   * @returns {{ x: number, y: number }|null}
   */
  _getGoalPosition () {
    if (!this.scene?.mapManager?.getExitZones || !this.scene?.currentMapKey) return null

    const exits = this.scene.mapManager.getExitZones(this.scene.currentMapKey)
    if (!exits || exits.length === 0) return null

    let nearest = null
    let minDist = Infinity

    for (const ez of exits) {
      const cx = ez.x + ez.width / 2
      const cy = ez.y + ez.height / 2
      const dx = cx - this.x
      const dy = cy - this.y
      const dist = dx * dx + dy * dy
      if (dist < minDist) {
        minDist = dist
        nearest = { x: cx, y: cy }
      }
    }

    return nearest
  }

  /**
   * Update walk/idle animation based on current velocity.
   */
  _updateAnimation () {
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

    // Check distance to player directly (not formation offset)
    const pdx = this.x - player.x
    const pdy = this.y - player.y
    const pDist = Math.sqrt(pdx * pdx + pdy * pdy)

    if (pDist < MIN_PLAYER_DISTANCE && pDist > 0) {
      // Too close to player — push away gently
      this.setVelocity(
        (pdx / pDist) * this.speed * 0.5,
        (pdy / pDist) * this.speed * 0.5
      )
    } else if (dist > MIN_PLAYER_DISTANCE) {
      this.setVelocity(
        (dx / dist) * this.speed,
        (dy / dist) * this.speed
      )
    } else {
      this.setVelocity(0, 0)
    }

    this._updateAnimation()
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

    this._updateAnimation()

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
