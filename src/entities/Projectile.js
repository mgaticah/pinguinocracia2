import Phaser from 'phaser'

const FIRE_DURATION = 3000    // 3 seconds
const FIRE_DAMAGE = 2         // damage per tick
const FIRE_TICK_INTERVAL = 1000 // 1 tick per second
const FIRE_RADIUS = 48        // 1 cuerpo

/**
 * Projectile — A thrown weapon (Piedra or Molotov).
 * Piedra: travels to target, deals damage on hit, disappears.
 * Molotov: travels to target, explodes on hit or at max range,
 *          leaves fire zone for 3s dealing 2 damage/second.
 */
export default class Projectile extends Phaser.Physics.Arcade.Sprite {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x - Start X
   * @param {number} y - Start Y
   * @param {string} type - 'piedra' | 'molotov'
   * @param {number} targetX - World X to fly toward
   * @param {number} targetY - World Y to fly toward
   */
  constructor (scene, x, y, type, targetX, targetY) {
    const textureKey = type === 'molotov' ? 'molotov' : 'piedra'
    super(scene, x, y, textureKey)

    scene.add.existing(this)
    scene.physics.add.existing(this)

    this.type = type
    this.damage = type === 'molotov' ? 5 : 1
    this._exploded = false

    // Store target info — velocity is applied in launch() after being added to group
    this._targetX = targetX
    this._targetY = targetY
    this._startX = x
    this._startY = y
    this._speed = 300

    // Launch immediately
    this.launch()

    // Play spin animation
    const spinKey = `${this.type}_spin`
    if (scene.anims?.exists(spinKey)) {
      this.play(spinKey)
    }

    // Play throw sound for molotov
    if (this.type === 'molotov' && scene.sound?.play) {
      try { scene.sound.play('sfx_lanzamolotov', { volume: 0.5 }) } catch (e) {}
    }
  }

  /**
   * Apply velocity toward target. Can be called again after adding to a physics group.
   */
  launch () {
    const dx = this._targetX - this._startX
    const dy = this._targetY - this._startY
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist > 0) {
      this.setVelocity((dx / dist) * this._speed, (dy / dist) * this._speed)
    }

    // Don't collide with world bounds — fly freely
    if (this.body) {
      this.body.setCollideWorldBounds(false)
    }

    // Auto-destroy after reaching target distance, or 2s max
    const travelTime = dist > 0 ? (dist / this._speed) * 1000 : 500
    const lifespan = Math.min(travelTime, 2000)
    if (this.scene?.time) {
      this.scene.time.delayedCall(lifespan, () => {
        if (this.active) {
          this.explodeAndDestroy()
        }
      })
    }
  }

  /**
   * Explode (if molotov) and destroy the projectile.
   * Called on enemy hit or when reaching max range.
   */
  explodeAndDestroy () {
    if (this._exploded) return
    this._exploded = true

    if (this.type === 'molotov') {
      // Impact sound
      try { this.scene?.sound?.play('sfx_quiebramolotov', { volume: 0.6 }) } catch (e) {}
      this._spawnFireZone(this.x, this.y)
    }

    this.destroy()
  }

  /**
   * Spawn a fire zone at the impact point.
   * Deals FIRE_DAMAGE per second to enemies in range for FIRE_DURATION.
   */
  _spawnFireZone (x, y) {
    const scene = this.scene
    if (!scene || !scene.add) return

    // Visual: fire sprite or fallback circle
    let fireVisual
    if (scene.anims?.exists('efecFuego')) {
      fireVisual = scene.add.sprite(x, y, 'efecFuego')
      fireVisual.play('efecFuego')
      fireVisual.setScale(2)
    } else {
      fireVisual = scene.add.graphics()
      fireVisual.fillStyle(0xff6600, 0.5)
      fireVisual.fillCircle(x, y, FIRE_RADIUS)
    }
    fireVisual.setDepth(3)

    // Fire loop sound
    let fireSound = null
    try {
      if (scene.sound?.add) {
        fireSound = scene.sound.add('sfx_ardemolotov', { volume: 0.3, loop: true })
        fireSound.play()
      }
    } catch (e) {}

    // Damage tick — every FIRE_TICK_INTERVAL, damage enemies within radius
    let elapsed = 0
    const tickTimer = scene.time?.addEvent({
      delay: FIRE_TICK_INTERVAL,
      repeat: Math.floor(FIRE_DURATION / FIRE_TICK_INTERVAL) - 1,
      callback: () => {
        elapsed += FIRE_TICK_INTERVAL
        if (!scene.enemyGroup) return

        const enemies = scene.enemyGroup.getChildren()
        for (const enemy of enemies) {
          if (!enemy.active || enemy.isDead) continue
          const dx = enemy.x - x
          const dy = enemy.y - y
          if (dx * dx + dy * dy <= FIRE_RADIUS * FIRE_RADIUS * 4) {
            if (enemy.takeDamage) {
              enemy.takeDamage(FIRE_DAMAGE, x, y)
            }
          }
        }
      }
    })

    // Clean up after duration
    if (scene.time) {
      scene.time.delayedCall(FIRE_DURATION, () => {
        if (tickTimer) tickTimer.remove()
        if (fireVisual?.destroy) fireVisual.destroy()
        if (fireSound) { fireSound.stop(); fireSound.destroy() }
      })
    }

    // Fade out the visual near the end
    if (scene.tweens && fireVisual) {
      scene.tweens.add({
        targets: fireVisual,
        alpha: 0,
        delay: FIRE_DURATION - 500,
        duration: 500
      })
    }
  }
}

export { FIRE_DURATION, FIRE_DAMAGE, FIRE_TICK_INTERVAL, FIRE_RADIUS }
