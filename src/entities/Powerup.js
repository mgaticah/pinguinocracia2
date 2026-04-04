import Phaser from 'phaser'
import EventBus from '../EventBus.js'

/**
 * Powerup — Collectible item on the map.
 * Types: manzana, maruchan, energetica, botellita
 */
export default class Powerup extends Phaser.Physics.Arcade.Sprite {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x
   * @param {number} y
   * @param {string} type - 'manzana' | 'maruchan' | 'energetica' | 'botellita'
   */
  constructor (scene, x, y, type) {
    super(scene, x, y, type)

    scene.add.existing(this)
    scene.physics.add.existing(this, true) // static body

    this.powerupType = type

    // Play shimmer animation if available
    const animKey = `powerup_${type}`
    if (scene.anims?.exists(animKey)) {
      this.play(animKey)
    }
  }

  /**
   * Called when a collector (Player or Ally) picks up this powerup.
   * Applies the effect and destroys the sprite.
   * @param {object} collector - The entity collecting (must have hp, maxHp, speed, etc.)
   */
  collect (collector) {
    switch (this.powerupType) {
      case 'manzana':
        this._applyHeal(collector, 2)
        this._showEffect(collector, 'heal')
        break
      case 'maruchan':
        this._applyHeal(collector, 5)
        this._showEffect(collector, 'heal')
        break
      case 'energetica':
        this._applySpeedBoost(collector)
        this._showEffect(collector, 'speed')
        break
      case 'botellita':
        this._applyBotellita(collector)
        this._showEffect(collector, 'molotov')
        break
    }

    EventBus.emit('powerup:collected', { type: this.powerupType, collector })
    this.destroy()
  }

  /**
   * @param {object} collector
   * @param {number} amount
   */
  _applyHeal (collector, amount) {
    if (collector.heal) {
      collector.heal(amount)
    }
  }

  /**
   * Applies speed boost: ×1.5 for 6s. If already active, resets duration
   * without stacking the multiplier.
   * @param {object} collector
   */
  _applySpeedBoost (collector) {
    const BASE_SPEED = 160
    const MULTIPLIER = 1.5
    const DURATION = 6000

    // Cancel existing timer if active
    if (collector._energeticaTimer) {
      collector._energeticaTimer.remove(false)
      collector._energeticaTimer = null
    }

    // Apply speed only if not already boosted
    if (!collector._energeticaActive) {
      collector.speed = BASE_SPEED * MULTIPLIER
      collector._energeticaActive = true
    }

    // Schedule revert
    if (collector.scene && collector.scene.time) {
      collector._energeticaTimer = collector.scene.time.delayedCall(DURATION, () => {
        collector.speed = BASE_SPEED
        collector._energeticaActive = false
        collector._energeticaTimer = null
      })
    }
  }

  /**
   * Increments the global molotov counter by 1.
   * @param {object} collector
   */
  _applyBotellita (collector) {
    if (collector.globalCounter) {
      collector.globalCounter.molotovs += 1
      EventBus.emit('molotov:changed', { count: collector.globalCounter.molotovs })
    }
  }

  /**
   * Shows a brief visual effect on the collector.
   * @param {object} collector
   * @param {string} effectType - 'heal' | 'speed' | 'molotov'
   */
  _showEffect (collector, effectType) {
    if (!collector.scene || !collector.scene.add) return

    const colors = { heal: '#00ff00', speed: '#ffff00', molotov: '#ff6600' }
    const labels = { heal: '+HP', speed: '⚡', molotov: '+🔥' }

    const text = collector.scene.add.text(
      collector.x, collector.y - 20,
      labels[effectType] || '',
      { fontSize: '16px', color: colors[effectType] || '#ffffff' }
    )
    if (text.setOrigin) text.setOrigin(0.5)
    if (text.setDepth) text.setDepth(100)

    if (collector.scene.tweens) {
      collector.scene.tweens.add({
        targets: text,
        y: text.y - 30,
        alpha: 0,
        duration: 800,
        onComplete: () => text.destroy()
      })
    } else if (collector.scene.time) {
      collector.scene.time.delayedCall(800, () => text.destroy())
    }
  }
}
