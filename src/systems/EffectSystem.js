import EventBus from '../EventBus.js'

/**
 * EffectSystem — Manages temporary effects (e.g. Energética speed boost)
 * on Player and Allies.
 *
 * activeEffects is a Map<entity, { type, remaining, originalSpeed }>
 */
export default class EffectSystem {
  constructor () {
    /** @type {Map<object, { type: string, remaining: number, originalSpeed: number }>} */
    this.activeEffects = new Map()
  }

  /**
   * Applies a temporary effect to an entity.
   * If the entity already has the same effect type, resets duration without stacking.
   * @param {object} entity - Player or Ally with a `speed` property
   * @param {string} type - Effect type (e.g. 'energetica')
   * @param {number} duration - Duration in seconds
   */
  applyEffect (entity, type, duration) {
    const existing = this.activeEffects.get(entity)

    if (existing && existing.type === type) {
      // Reset duration, don't stack speed
      existing.remaining = duration
    } else {
      // Store original speed and apply multiplier
      const originalSpeed = entity.speed
      const multiplier = type === 'energetica' ? 1.5 : 1
      entity.speed = originalSpeed * multiplier

      this.activeEffects.set(entity, {
        type,
        remaining: duration,
        originalSpeed
      })
    }

    EventBus.emit('energetica:tick', { remaining: duration })
  }

  /**
   * Decrements timers for all active effects. Reverts entity speed when expired.
   * @param {number} delta - Time elapsed in seconds
   */
  update (delta) {
    for (const [entity, effect] of this.activeEffects) {
      effect.remaining -= delta

      if (effect.remaining <= 0) {
        // Revert speed and remove
        entity.speed = effect.originalSpeed
        this.activeEffects.delete(entity)
      } else {
        // Emit tick for HUD updates
        EventBus.emit('energetica:tick', { remaining: effect.remaining })
      }
    }
  }

  /**
   * Preserves effects across map transitions.
   * Re-registers the effect so it continues in the new map context.
   * Does NOT clear effects.
   * @param {object} entity - The entity whose effects should be preserved
   */
  clearEffectsOnMapTransition (entity) {
    const effect = this.activeEffects.get(entity)
    if (effect) {
      // Re-register: ensure the effect continues with current remaining time
      this.activeEffects.set(entity, { ...effect })
    }
  }
}
