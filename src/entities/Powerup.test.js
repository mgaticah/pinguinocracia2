import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('phaser', () => {
  class Sprite {
    constructor (scene, x, y, texture) {
      this.scene = scene
      this.x = x
      this.y = y
      this.texture = texture
      this.active = true
    }

    setVelocity () {}
    setCollideWorldBounds () {}
    play () {}
    destroy () { this.active = false }
  }

  class Scene {
    constructor (key) { this.key = key }
  }

  return {
    default: {
      Scene,
      AUTO: 0,
      Events: { EventEmitter: class {} },
      Physics: { Arcade: { Sprite } }
    },
    Scene,
    Physics: { Arcade: { Sprite } }
  }
})

vi.mock('../EventBus.js', () => ({
  default: { emit: vi.fn(), on: vi.fn(), off: vi.fn() }
}))

import Powerup from './Powerup.js'
import EventBus from '../EventBus.js'

function createMockScene () {
  return {
    add: {
      existing: vi.fn(),
      text: vi.fn(() => ({
        setOrigin: vi.fn(),
        setDepth: vi.fn(),
        x: 0,
        y: 0,
        destroy: vi.fn()
      }))
    },
    physics: { add: { existing: vi.fn() } },
    anims: { exists: () => false, create: vi.fn() },
    time: { delayedCall: vi.fn((duration, cb) => ({ remove: vi.fn() })) },
    tweens: null
  }
}

function createMockCollector (overrides = {}) {
  const scene = createMockScene()
  return {
    hp: 5,
    maxHp: 10,
    speed: 160,
    isAlive: true,
    x: 100,
    y: 200,
    scene,
    globalCounter: { molotovs: 3 },
    heal: vi.fn(function (amount) {
      this.hp = Math.min(this.maxHp, this.hp + amount)
    }),
    _energeticaActive: false,
    _energeticaTimer: null,
    ...overrides
  }
}

describe('Powerup', () => {
  let mockScene

  beforeEach(() => {
    vi.clearAllMocks()
    mockScene = createMockScene()
  })

  describe('constructor', () => {
    it('should store the powerup type', () => {
      const p = new Powerup(mockScene, 100, 200, 'manzana')
      expect(p.powerupType).toBe('manzana')
    })

    it('should add itself to scene', () => {
      new Powerup(mockScene, 100, 200, 'botellita')
      expect(mockScene.add.existing).toHaveBeenCalled()
      expect(mockScene.physics.add.existing).toHaveBeenCalled()
    })
  })

  describe('collect() — Manzana', () => {
    it('should heal collector by 2 HP', () => {
      const p = new Powerup(mockScene, 100, 200, 'manzana')
      const collector = createMockCollector({ hp: 5 })
      p.collect(collector)
      expect(collector.heal).toHaveBeenCalledWith(2)
    })

    it('should not exceed maxHp', () => {
      const p = new Powerup(mockScene, 100, 200, 'manzana')
      const collector = createMockCollector({ hp: 9 })
      p.collect(collector)
      expect(collector.hp).toBe(10)
    })

    it('should destroy the powerup after collection', () => {
      const p = new Powerup(mockScene, 100, 200, 'manzana')
      const collector = createMockCollector()
      p.collect(collector)
      expect(p.active).toBe(false)
    })

    it('should emit powerup:collected', () => {
      const p = new Powerup(mockScene, 100, 200, 'manzana')
      const collector = createMockCollector()
      p.collect(collector)
      expect(EventBus.emit).toHaveBeenCalledWith('powerup:collected', {
        type: 'manzana',
        collector
      })
    })
  })

  describe('collect() — Maruchan', () => {
    it('should heal collector by 5 HP', () => {
      const p = new Powerup(mockScene, 100, 200, 'maruchan')
      const collector = createMockCollector({ hp: 3 })
      p.collect(collector)
      expect(collector.heal).toHaveBeenCalledWith(5)
    })

    it('should not exceed maxHp', () => {
      const p = new Powerup(mockScene, 100, 200, 'maruchan')
      const collector = createMockCollector({ hp: 8 })
      p.collect(collector)
      expect(collector.hp).toBe(10)
    })
  })

  describe('collect() — Energética', () => {
    it('should boost speed to 1.5x base', () => {
      const p = new Powerup(mockScene, 100, 200, 'energetica')
      const collector = createMockCollector({ speed: 160 })
      p.collect(collector)
      expect(collector.speed).toBe(240)
      expect(collector._energeticaActive).toBe(true)
    })

    it('should not stack speed when already active', () => {
      const collector = createMockCollector({
        speed: 240,
        _energeticaActive: true,
        _energeticaTimer: { remove: vi.fn() }
      })

      const p = new Powerup(mockScene, 100, 200, 'energetica')
      p.collect(collector)
      // Speed should remain 240, not 360
      expect(collector.speed).toBe(240)
    })

    it('should reset timer when already active (reinicia duración)', () => {
      const removeFn = vi.fn()
      const collector = createMockCollector({
        speed: 240,
        _energeticaActive: true,
        _energeticaTimer: { remove: removeFn }
      })

      const p = new Powerup(mockScene, 100, 200, 'energetica')
      p.collect(collector)
      expect(removeFn).toHaveBeenCalled()
    })

    it('should revert speed after timer expires', () => {
      const collector = createMockCollector({ speed: 160 })
      collector.scene.time.delayedCall = vi.fn((duration, cb) => {
        cb() // immediately invoke
        return { remove: vi.fn() }
      })

      const p = new Powerup(mockScene, 100, 200, 'energetica')
      p.collect(collector)
      expect(collector.speed).toBe(160)
      expect(collector._energeticaActive).toBe(false)
    })
  })

  describe('collect() — Botellita', () => {
    it('should increment globalCounter.molotovs by 3', () => {
      const p = new Powerup(mockScene, 100, 200, 'botellita')
      const collector = createMockCollector({ globalCounter: { molotovs: 3 } })
      p.collect(collector)
      expect(collector.globalCounter.molotovs).toBe(6)
    })

    it('should emit molotov:changed', () => {
      const p = new Powerup(mockScene, 100, 200, 'botellita')
      const collector = createMockCollector({ globalCounter: { molotovs: 0 } })
      p.collect(collector)
      expect(EventBus.emit).toHaveBeenCalledWith('molotov:changed', { count: 3 })
    })

    it('should not crash if collector has no globalCounter', () => {
      const p = new Powerup(mockScene, 100, 200, 'botellita')
      const collector = createMockCollector({ globalCounter: null })
      expect(() => p.collect(collector)).not.toThrow()
    })
  })
})
