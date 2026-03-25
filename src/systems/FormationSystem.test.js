import { describe, it, expect, beforeEach } from 'vitest'
import FormationSystem from './FormationSystem.js'

describe('FormationSystem', () => {
  let fs

  beforeEach(() => {
    fs = new FormationSystem()
  })

  describe('getPosition()', () => {
    it('should return {0,0} when total is 0', () => {
      const pos = fs.getPosition(0, 0)
      expect(pos.x).toBe(0)
      expect(pos.y).toBe(0)
    })

    it('should return position on circle for single ally', () => {
      const pos = fs.getPosition(0, 1)
      // angle = 0, so x = radius, y = 0
      expect(pos.x).toBeCloseTo(60, 1)
      expect(pos.y).toBeCloseTo(0, 1)
    })

    it('should space two allies evenly (opposite sides)', () => {
      const p0 = fs.getPosition(0, 2)
      const p1 = fs.getPosition(1, 2)
      // p0 at angle 0, p1 at angle PI
      expect(p0.x).toBeCloseTo(60, 1)
      expect(p0.y).toBeCloseTo(0, 1)
      expect(p1.x).toBeCloseTo(-60, 1)
      expect(p1.y).toBeCloseTo(0, 1)
    })

    it('should space three allies evenly (120° apart)', () => {
      const p0 = fs.getPosition(0, 3)
      const p1 = fs.getPosition(1, 3)
      const p2 = fs.getPosition(2, 3)

      // All should be at radius 60 from origin
      const dist0 = Math.sqrt(p0.x * p0.x + p0.y * p0.y)
      const dist1 = Math.sqrt(p1.x * p1.x + p1.y * p1.y)
      const dist2 = Math.sqrt(p2.x * p2.x + p2.y * p2.y)
      expect(dist0).toBeCloseTo(60, 1)
      expect(dist1).toBeCloseTo(60, 1)
      expect(dist2).toBeCloseTo(60, 1)
    })

    it('should not produce overlapping positions for different indices', () => {
      const p0 = fs.getPosition(0, 4)
      const p1 = fs.getPosition(1, 4)
      const dx = p0.x - p1.x
      const dy = p0.y - p1.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      expect(dist).toBeGreaterThan(0)
    })
  })

  describe('update()', () => {
    it('should set formation offsets on active allies', () => {
      const allies = [
        { active: true, isDead: false, _formationOffset: { x: 0, y: 0 } },
        { active: true, isDead: false, _formationOffset: { x: 0, y: 0 } }
      ]
      const player = { x: 100, y: 100 }

      fs.update(allies, player)

      // Offsets should be set (opposite sides for 2 allies)
      expect(allies[0]._formationOffset.x).toBeCloseTo(60, 1)
      expect(allies[1]._formationOffset.x).toBeCloseTo(-60, 1)
    })

    it('should skip dead allies', () => {
      const allies = [
        { active: true, isDead: false, _formationOffset: { x: 0, y: 0 } },
        { active: true, isDead: true, _formationOffset: { x: 0, y: 0 } }
      ]
      const player = { x: 100, y: 100 }

      fs.update(allies, player)

      // Only 1 active ally, so single position at angle 0
      expect(allies[0]._formationOffset.x).toBeCloseTo(60, 1)
      // Dead ally offset should not be updated
      expect(allies[1]._formationOffset.x).toBe(0)
    })

    it('should handle empty allies array', () => {
      const player = { x: 100, y: 100 }
      expect(() => fs.update([], player)).not.toThrow()
      expect(fs.positions).toEqual([])
    })

    it('should handle null inputs gracefully', () => {
      expect(() => fs.update(null, null)).not.toThrow()
    })

    it('should update positions array', () => {
      const allies = [
        { active: true, isDead: false, _formationOffset: { x: 0, y: 0 } },
        { active: true, isDead: false, _formationOffset: { x: 0, y: 0 } },
        { active: true, isDead: false, _formationOffset: { x: 0, y: 0 } }
      ]
      const player = { x: 0, y: 0 }

      fs.update(allies, player)

      expect(fs.positions).toHaveLength(3)
    })
  })
})
