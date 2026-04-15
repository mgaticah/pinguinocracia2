import Phaser from 'phaser'
import EventBus from '../EventBus.js'
import Projectile from './Projectile.js'

/**
 * Player — The main character controlled by the user.
 * Extends Phaser.Physics.Arcade.Sprite with WASD movement, HP system,
 * and weapon management.
 */
export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor (scene, x, y) {
    super(scene, x, y, 'player')

    // Add to scene and enable physics
    scene.add.existing(this)
    scene.physics.add.existing(this)

    // Scale up sprite for visibility in the large world
    if (this.setScale) this.setScale(2)

    // Shrink physics body to lower torso/feet area
    // Sprite is 48×48 scaled ×2 = 96×96 display.
    // Body must fit through 1-tile (48px) gaps: 22×24 * scale 2 = 44×48
    if (this.body?.setSize) {
      this.body.setSize(22, 24)
      this.body.setOffset(13, 16)
    }

    // Core stats
    this.hp = 10
    this.maxHp = 10
    this.speed = 160
    this.weapon = 'piedra'
    this.isAlive = true

    // Track last facing direction for idle animation
    this._lastDirection = 'down'
    this._isAttacking = false

    // Set up WASD + arrow keys
    this.keys = scene.input.keyboard.addKeys('W,A,S,D')
    this.cursors = scene.input.keyboard.createCursorKeys
      ? scene.input.keyboard.createCursorKeys()
      : null

    // Create animation fallbacks only if BootScene hasn't registered them yet
    this._ensureAnimations()
  }

  /**
   * Creates single-frame animation fallbacks for each direction,
   * only if BootScene hasn't already registered proper multi-frame animations.
   */
  _ensureAnimations () {
    const anims = this.scene.anims
    const directions = ['up', 'down', 'left', 'right']
    // Fallback idle frames for 5-col layout: up=0, down=5, left=10, right=15
    const idleFrames = { up: 0, down: 5, left: 10, right: 15 }

    for (const dir of directions) {
      const walkKey = `player_walk_${dir}`
      const idleKey = `player_idle_${dir}`

      if (!anims.exists(walkKey)) {
        anims.create({
          key: walkKey,
          frames: [{ key: 'player', frame: idleFrames[dir] }],
          frameRate: 8,
          repeat: -1
        })
      }

      if (!anims.exists(idleKey)) {
        anims.create({
          key: idleKey,
          frames: [{ key: 'player', frame: idleFrames[dir] }],
          frameRate: 1,
          repeat: 0
        })
      }
    }
  }

  /**
   * Reads WASD key state, normalizes diagonal movement, and sets velocity.
   * Call this from the scene's update() loop.
   * @param {object} keys - WASD key objects from Phaser input
   */
  move (keys) {
    if (!this.isAlive) {
      this.setVelocity(0, 0)
      return
    }

    let vx = 0
    let vy = 0

    if (keys.A.isDown || this.cursors?.left?.isDown) vx -= 1
    if (keys.D.isDown || this.cursors?.right?.isDown) vx += 1
    if (keys.W.isDown || this.cursors?.up?.isDown) vy -= 1
    if (keys.S.isDown || this.cursors?.down?.isDown) vy += 1

    // Touch joystick input
    const touch = this.scene?.touchControls
    if (touch?.isEnabled && (touch.direction.x !== 0 || touch.direction.y !== 0)) {
      vx = touch.direction.x
      vy = touch.direction.y
    }

    // Normalize diagonal movement so speed is consistent
    if (vx !== 0 && vy !== 0) {
      const factor = Math.SQRT1_2 // 1 / sqrt(2)
      vx *= factor
      vy *= factor
    }

    this.setVelocity(vx * this.speed, vy * this.speed)

    // Don't override attack animation while it's playing
    if (this._isAttacking) {
      // Still update direction tracking
      if (vx !== 0 || vy !== 0) {
        if (Math.abs(vy) >= Math.abs(vx)) {
          this._lastDirection = vy < 0 ? 'up' : 'down'
        } else {
          this._lastDirection = vx < 0 ? 'left' : 'right'
        }
      }
      return
    }

    // Determine animation
    if (vx !== 0 || vy !== 0) {
      // Pick direction based on dominant axis
      if (Math.abs(vy) >= Math.abs(vx)) {
        this._lastDirection = vy < 0 ? 'up' : 'down'
      } else {
        this._lastDirection = vx < 0 ? 'left' : 'right'
      }
      this.play(`player_walk_${this._lastDirection}`, true)
    } else {
      this.play(`player_idle_${this._lastDirection}`, true)
    }
  }

  /**
   * Reduces HP by the given amount, clamped to [0, maxHp].
   * Emits 'player:damaged' on EventBus. Emits 'gameover' if HP reaches 0.
   * @param {number} amount - Damage to apply (positive number)
   */
  takeDamage (amount, fromX, fromY) {
    if (!this.isAlive || amount <= 0) return

    this.hp = Math.max(0, this.hp - amount)
    this._flashHit()
    this._knockback(fromX, fromY)
    EventBus.emit('player:damaged', { amount, hp: this.hp })

    // Hit sound
    try { this.scene?.sound?.play('sfx_golpeplayer', { volume: 0.4 }) } catch (e) {}

    // Hit effect — exclamation rises and fades
    this._spawnHitEffect()

    if (this.hp <= 0) {
      this.isAlive = false
      this.setVelocity(0, 0)
      EventBus.emit('gameover')
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
   * Restores HP by the given amount, clamped to [0, maxHp].
   * Emits 'player:healed' on EventBus.
   * @param {number} amount - HP to restore (positive number)
   */
  heal (amount) {
    if (!this.isAlive || amount <= 0) return

    this.hp = Math.min(this.maxHp, this.hp + amount)
    EventBus.emit('player:healed', { amount, hp: this.hp })
  }

  /**
   * Temporarily boosts speed by a multiplier for a given duration.
   * @param {number} multiplier - Speed multiplier (e.g. 1.5)
   * @param {number} duration - Duration in milliseconds
   */
  applySpeedBoost (multiplier, duration) {
    const baseSpeed = 160
    this.speed = baseSpeed * multiplier

    this.scene.time.delayedCall(duration, () => {
      this.speed = baseSpeed
    })
  }

  /**
   * Launches a projectile toward the target position.
   * Piedra: infinite ammo, damage=1.
   * Molotov: requires globalCounter.molotovs >= 1, damage=5, decrements counter.
   * @param {number} targetX - World X coordinate
   * @param {number} targetY - World Y coordinate
   * @returns {Projectile|null} The created projectile, or null if unable to fire
   */
  shoot (targetX, targetY) {
    if (!this.isAlive) return null

    if (this.weapon === 'molotov') {
      if (!this.globalCounter || this.globalCounter.molotovs <= 0) {
        return null
      }
      this.globalCounter.molotovs -= 1
      EventBus.emit('molotov:changed', { count: this.globalCounter.molotovs })

      // Auto-switch back to piedra when out of molotovs
      if (this.globalCounter.molotovs <= 0) {
        this.weapon = 'piedra'
        EventBus.emit('weapon:changed', { weapon: this.weapon })
      }
    }

    // Play throw animation in the facing direction
    this._playAttackAnim()

    // Offset projectile spawn to the right hand (diestro)
    // Relative to facing direction: right hand is offset perpendicular
    const HAND_OFFSET = 16
    const handOffsets = {
      up: { x: HAND_OFFSET, y: 0 },       // mirando arriba → mano derecha está a la derecha
      down: { x: -HAND_OFFSET, y: 0 },     // mirando abajo → mano derecha está a la izquierda (espejado)
      left: { x: 0, y: -HAND_OFFSET },     // mirando izquierda → mano derecha está arriba
      right: { x: 0, y: HAND_OFFSET }      // mirando derecha → mano derecha está abajo
    }
    const ho = handOffsets[this._lastDirection] || { x: 0, y: 0 }
    const spawnX = this.x + ho.x
    const spawnY = this.y + ho.y

    const projectile = new Projectile(this.scene, spawnX, spawnY, this.weapon, targetX, targetY)

    // Add to projectileGroup if available, then re-apply velocity
    // (adding to a group can reset the physics body)
    if (this.projectileGroup) {
      this.projectileGroup.add(projectile)
      if (projectile.launch) projectile.launch()
    }

    // Notify enemies that a projectile was fired (for aggro)
    EventBus.emit('projectile:fired', { weapon: this.weapon, x: this.x, y: this.y })

    return projectile
  }

  /**
   * Play the attack/throw animation for the current facing direction.
   * Animation plays once then the movement logic resumes walk/idle.
   */
  _playAttackAnim () {
    const attackKey = `player_attack_${this._lastDirection}`
    if (this.scene?.anims?.exists(attackKey)) {
      this._isAttacking = true
      this.play(attackKey)
      this.once('animationcomplete', () => {
        this._isAttacking = false
      })
    }
  }

  /**
   * Fires a projectile in the player's current facing direction.
   * Used by spacebar — shoots 200px ahead in the direction the player faces.
   * @returns {Projectile|null}
   */
  shootInFacingDirection () {
    const SHOOT_DISTANCE = 240 // 5 cuerpos (5 × 48px)
    const offsets = {
      up: { x: 0, y: -SHOOT_DISTANCE },
      down: { x: 0, y: SHOOT_DISTANCE },
      left: { x: -SHOOT_DISTANCE, y: 0 },
      right: { x: SHOOT_DISTANCE, y: 0 }
    }
    const offset = offsets[this._lastDirection] || offsets.down
    return this.shoot(this.x + offset.x, this.y + offset.y)
  }

  /**
   * Spawn a hit effect sprite that rises and fades out.
   */
  _spawnHitEffect () {
    if (!this.scene?.add?.sprite) return
    try {
      const fx = this.scene.add.sprite(this.x, this.y - 20, 'efecGolpe')
      fx.setDepth(100)
      if (this.scene.anims?.exists('efecGolpe')) fx.play('efecGolpe')
      if (this.scene.tweens) {
        this.scene.tweens.add({
          targets: fx,
          y: fx.y - 40,
          alpha: 0,
          duration: 600,
          onComplete: () => { if (fx?.destroy) fx.destroy() }
        })
      } else if (this.scene.time) {
        this.scene.time.delayedCall(600, () => { if (fx?.destroy) fx.destroy() })
      }
    } catch (_) {}
  }

  /**
   * Flash yellow tint when hit, then restore original tint.
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
   * Toggles weapon between 'piedra' and 'molotov'.
   */
  switchWeapon () {
    this.weapon = this.weapon === 'piedra' ? 'molotov' : 'piedra'
    EventBus.emit('weapon:changed', { weapon: this.weapon })
  }
}
