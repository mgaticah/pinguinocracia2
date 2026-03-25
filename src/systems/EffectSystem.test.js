import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('phaser', () => ({
  default: {
    Events: { EventEmitter: class {} }
  }
}))

vi.mock('../EventBus.js', () => ({
  default: {
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn()
  }
}))

import EventBus from '../EventBus.js'
import EffectSystem from './EffectSystem.js'

describe('EffectSystem', () => {
  let effectSystem

  beforeEach(() => {
    vi.clearAllMocks()
    effectSystem = new EffectSystem()
  })

  // -------------------------------------------------------------------
  // applyEffect()
  // -------------------------------------------------------------------

  describe('applyEffect()', () => {
    it('should store effect correctly for a new entity', () => {
      const entity = { speed: 160 }
      effectSystem.applyEffect(entity, 'energetica', 6)

      expect(effectSystem.activeEffects.has(entity)).toBe(true)
      const effect = effectSystem.activeEffects.get(entity)
      expect(effect.type).toBe('energetica')
      expect(effect.remaining).toBe(6)
      expect(effect.originalSpeed).toBe(160)
    })

    it('should apply 1.5x speed multiplier for energetica', () => {
      const entity = { speed: 160 }
      effectSystem.applyEffect(entity, 'energetica', 6)
      expect(entity.speed).toBe(240)
    })

    it('should emit energetica:tick with remaining time', () => {
      const entity = { speed: 160 }
      effectSystem.applyEffect(entity, 'energetica', 6)
      expect(EventBus.emit).toHaveBeenCalledWith('energetica:tick', { remaining: 6 })
    })

    it('should reset duration without stacking speed when reapplying same effect', () => {
      const entity = { speed: 160 }
      effectSystem.applyEffect(entity, 'energetica', 6)
      expect(entity.speed).toBe(240)

      // Reapply — should reset duration but NOT change speed
      effectSystem.applyEffect(entity, 'energetica', 6)
      expect(entity.speed).toBe(240) // still 1.5x, not 2.25x
      expect(effectSystem.activeEffects.get(entity).remaining).toBe(6)
    })

    it('should not multiply speed to 1.0 for unknown effect types', () => {
      const entity = { speed: 160 }
      effectSystem.applyEffect(entity, 'unknown', 5)
      expect(entity.speed).toBe(160) // multiplier is 1 for non-energetica
    })
  })

  // -------------------------------------------------------------------
  // update()
  // -------------------------------------------------------------------

  describe('update()', () => {
    it('should decrement remaining time by delta', () => {
      const entity = { speed: 160 }
      effectSystem.applyEffect(entity, 'energetica', 6)

      effectSystem.update(2)
      expect(effectSystem.activeEffects.get(entity).remaining).toBe(4)
    })

    it('should emit energetica:tick with updated remaining', () => {
      const entity = { speed: 160 }
      effectSystem.applyEffect(entity, 'energetica', 6)
      vi.clearAllMocks()

      effectSystem.update(1)
      expect(EventBus.emit).toHaveBeenCalledWith('energetica:tick', { remaining: 5 })
    })

    it('should revert entity speed when effect expires', () => {
      const entity = { speed: 160 }
      effectSystem.applyEffect(entity, 'energetica', 6)
      expect(entity.speed).toBe(240)

      effectSystem.update(6)
      expect(entity.speed).toBe(160)
    })

    it('should remove effect from map when expired', () => {
      const entity = { speed: 160 }
      effectSystem.applyEffect(entity, 'energetica', 3)

      effectSystem.update(3)
      expect(effectSystem.activeEffects.has(entity)).toBe(false)
    })

    it('should handle multiple entities independently', () => {
      const e1 = { speed: 160 }
      const e2 = { speed: 200 }
      effectSystem.applyEffect(e1, 'energetica', 6)
      effectSystem.applyEffect(e2, 'energetica', 3)

      effectSystem.update(3)
      // e2 should have expired, e1 still active
      expect(effectSystem.activeEffects.has(e1)).toBe(true)
      expect(effectSystem.activeEffects.get(e1).remaining).toBe(3)
      expect(effectSystem.activeEffects.has(e2)).toBe(false)
      expect(e2.speed).toBe(200) // reverted
    })

    it('should not crash with no active effects', () => {
      expect(() => effectSystem.update(1)).not.toThrow()
    })
  })

  // -------------------------------------------------------------------
  // clearEffectsOnMapTransition()
  // -------------------------------------------------------------------

  describe('clearEffectsOnMapTransition()', () => {
    it('should preserve active effects across map transitions', () => {
      const entity = { speed: 160 }
      effectSystem.applyEffect(entity, 'energetica', 6)

      effectSystem.update(2) // remaining = 4
      effectSystem.clearEffectsOnMapTransition(entity)

      // Effect should still be active
      expect(effectSystem.activeEffects.has(entity)).toBe(true)
      const effect = effectSystem.activeEffects.get(entity)
      expect(effect.remaining).toBe(4)
      expect(effect.type).toBe('energetica')
      expect(effect.originalSpeed).toBe(160)
    })

    it('should do nothing for entity without effects', () => {
      const entity = { speed: 160 }
      expect(() => effectSystem.clearEffectsOnMapTransition(entity)).not.toThrow()
      expect(effectSystem.activeEffects.has(entity)).toBe(false)
    })

    it('should allow effect to continue ticking after transition', () => {
      const entity = { speed: 160 }
      effectSystem.applyEffect(entity, 'energetica', 6)
      effectSystem.update(2) // remaining = 4

      effectSystem.clearEffectsOnMapTransition(entity)

      // Continue updating — should still work
      effectSystem.update(2) // remaining = 2
      expect(effectSystem.activeEffects.get(entity).remaining).toBe(2)
      expect(entity.speed).toBe(240) // still boosted

      effectSystem.update(2) // remaining = 0 → expires
      expect(effectSystem.activeEffects.has(entity)).toBe(false)
      expect(entity.speed).toBe(160) // reverted
    })
  })

  // -------------------------------------------------------------------
  // EventBus emissions
  // -------------------------------------------------------------------

  describe('EventBus emissions', () => {
    it('should emit energetica:tick on applyEffect', () => {
      const entity = { speed: 160 }
      effectSystem.applyEffect(entity, 'energetica', 6)
      expect(EventBus.emit).toHaveBeenCalledWith('energetica:tick', { remaining: 6 })
    })

    it('should emit energetica:tick on each update tick while active', () => {
      const entity = { speed: 160 }
      effectSystem.applyEffect(entity, 'energetica', 6)
      vi.clearAllMocks()

      effectSystem.update(1)
      expect(EventBus.emit).toHaveBeenCalledWith('energetica:tick', { remaining: 5 })

      vi.clearAllMocks()
      effectSystem.update(1)
      expect(EventBus.emit).toHaveBeenCalledWith('energetica:tick', { remaining: 4 })
    })

    it('should not emit energetica:tick after effect expires', () => {
      const entity = { speed: 160 }
      effectSystem.applyEffect(entity, 'energetica', 2)
      vi.clearAllMocks()

      effectSystem.update(2) // expires
      // No tick emitted for expired effect
      expect(EventBus.emit).not.toHaveBeenCalled()

      vi.clearAllMocks()
      effectSystem.update(1) // nothing active
      expect(EventBus.emit).not.toHaveBeenCalled()
    })
  })
})
