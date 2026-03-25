import { describe, it, expect, vi, beforeEach } from 'vitest'

// Lightweight Phaser mock for Node environment
vi.mock('phaser', () => {
  class Sprite {
    constructor (scene, x, y, texture) {
      this.scene = scene
      this.x = x
      this.y = y
      this.texture = texture
      this.active = true
      this._vx = 0
      this._vy = 0
    }

    setVelocity (vx, vy) {
      this._vx = vx
      this._vy = vy
    }

    destroy () {
      this.active = false
    }
  }

  return {
    default: {
      Scene: class {},
      AUTO: 0,
      Events: { EventEmitter: class {} },
      Physics: {
        Arcade: {
          Sprite
        }
      }
    },
    Physics: {
      Arcade: {
        Sprite
      }
    }
  }
})

function createMockScene () {
  return {
    add: { existing: vi.fn() },
    physics: { add: { existing: vi.fn() } },
    time: {
      delayedCall: vi.fn()
    }
  }
}

describe('Projectile', () => {
  let Projectile, mockScene

  beforeEach(async () => {
    vi.clearAllMocks()
    const mod = await import('./Projectile.js')
    Projectile = mod.default
    mockScene = createMockScene()
  })

  describe('constructor', () => {
    it('should create a piedra projectile with damage=1', () => {
      const proj = new Projectile(mockScene, 100, 200, 'piedra', 300, 200)
      expect(proj.type).toBe('piedra')
      expect(proj.damage).toBe(1)
    })

    it('should create a molotov projectile with damage=5', () => {
      const proj = new Projectile(mockScene, 100, 200, 'molotov', 300, 200)
      expect(proj.type).toBe('molotov')
      expect(proj.damage).toBe(5)
    })

    it('should add itself to scene display and physics', () => {
      new Projectile(mockScene, 100, 200, 'piedra', 300, 200)
      expect(mockScene.add.existing).toHaveBeenCalled()
      expect(mockScene.physics.add.existing).toHaveBeenCalled()
    })

    it('should set velocity toward target at speed 300', () => {
      const proj = new Projectile(mockScene, 0, 0, 'piedra', 300, 400)
      // distance = sqrt(300^2 + 400^2) = 500
      expect(proj._vx).toBeCloseTo((300 / 500) * 300, 5)
      expect(proj._vy).toBeCloseTo((400 / 500) * 300, 5)
      const magnitude = Math.sqrt(proj._vx ** 2 + proj._vy ** 2)
      expect(magnitude).toBeCloseTo(300, 5)
    })

    it('should handle zero distance (target at same position)', () => {
      const proj = new Projectile(mockScene, 100, 200, 'piedra', 100, 200)
      expect(proj._vx).toBe(0)
      expect(proj._vy).toBe(0)
    })

    it('should schedule auto-destroy based on travel distance (max 2000ms)', () => {
      new Projectile(mockScene, 100, 200, 'piedra', 300, 200)
      // Distance=200, speed=300 → travelTime=666ms, capped at min(666, 2000)
      expect(mockScene.time.delayedCall).toHaveBeenCalledWith(expect.any(Number), expect.any(Function))
      const lifespan = mockScene.time.delayedCall.mock.calls[0][0]
      expect(lifespan).toBeGreaterThan(0)
      expect(lifespan).toBeLessThanOrEqual(2000)
    })

    it('should destroy itself when lifespan callback fires', () => {
      const proj = new Projectile(mockScene, 100, 200, 'piedra', 300, 200)
      expect(proj.active).toBe(true)

      // Simulate the timer callback
      const callback = mockScene.time.delayedCall.mock.calls[0][1]
      callback()
      expect(proj.active).toBe(false)
    })

    it('should not destroy if already inactive when lifespan fires', () => {
      const proj = new Projectile(mockScene, 100, 200, 'piedra', 300, 200)
      proj.active = false
      proj.destroy = vi.fn()

      const callback = mockScene.time.delayedCall.mock.calls[0][1]
      callback()
      // destroy should not be called again since active is false
      expect(proj.destroy).not.toHaveBeenCalled()
    })
  })
})
