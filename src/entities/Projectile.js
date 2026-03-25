import Phaser from 'phaser'

/**
 * Projectile — A thrown weapon (Piedra or Molotov).
 * Travels toward a target position and auto-destroys on collision or after lifespan.
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

    // Store target info — velocity is applied in launch() after being added to group
    this._targetX = targetX
    this._targetY = targetY
    this._startX = x
    this._startY = y
    this._speed = 300

    // Launch immediately
    this.launch()
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
    this.scene.time.delayedCall(lifespan, () => {
      if (this.active) {
        this.destroy()
      }
    })
  }
}
