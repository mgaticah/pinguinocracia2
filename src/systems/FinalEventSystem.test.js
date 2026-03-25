import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Phaser
vi.mock('phaser', () => {
  class Sprite {
    constructor (scene, x, y, texture) {
      this.scene = scene
      this.x = x
      this.y = y
      this.texture = { key: texture }
      this.active = true
      this.hp = 10
      this.maxHp = 10
      this.isDead = false
    }

    setVelocity () {}
    setCollideWorldBounds () {}
    play () {}
    destroy () { this.active = false }
  }

  return {
    default: {
      Scene: class {},
      AUTO: 0,
      Events: { EventEmitter: class {} },
      Physics: { Arcade: { Sprite } }
    },
    Scene: class {},
    Physics: { Arcade: { Sprite } }
  }
})

vi.mock('../EventBus.js', () => ({
  default: { emit: vi.fn(), on: vi.fn(), off: vi.fn() }
}))

vi.mock('easystarjs', () => ({
  default: { js: class { setGrid () {} setAcceptableTiles () {} enableDiagonals () {} enableCornerCutting () {} findPath () {} calculate () {} } }
}))

import FinalEventSystem, {
  ALL_ENEMY_TYPES,
  FINAL_SQUAD_COMPOSITIONS,
  DEFAULT_DURATION,
  MIN_DURATION,
  MAX_DURATION,
  SPAWN_INTERVAL_MIN,
  SPAWN_INTERVAL_MAX
} from './FinalEventSystem.js'
import EventBus from '../EventBus.js'

function createMockScene (overrides = {}) {
  return {
    currentMapKey: 'map_plaza_italia',
    player: { x: 500, y: 500, isAlive: true },
    enemyGroup: { add: vi.fn(), getChildren: () => [] },
    spawnSystem: {
      selectSpawnPoint: vi.fn(() => ({ x: 1000, y: 1000 }))
    },
    scoreSystem: {
      getTotal: vi.fn(() => 420)
    },
    add: { existing: vi.fn() },
    physics: { add: { existing: vi.fn() } },
    anims: { exists: () => false },
    ...overrides
  }
}

describe('FinalEventSystem', () => {
  let scene, system

  beforeEach(() => {
    vi.clearAllMocks()
    scene = createMockScene()
    system = new FinalEventSystem(scene)
  })

  // -----------------------------------------------------------------------
  // Constructor
  // -----------------------------------------------------------------------

  describe('constructor', () => {
    it('should initialize as inactive', () => {
      expect(system.active).toBe(false)
    })

    it('should initialize remaining to 0', () => {
      expect(system.remaining).toBe(0)
    })

    it('should store scene reference', () => {
      expect(system.scene).toBe(scene)
    })
  })

  // -----------------------------------------------------------------------
  // start()
  // -----------------------------------------------------------------------

  describe('start()', () => {
    it('should initialize timer with default duration (90s)', () => {
      system.start()
      expect(system.remaining).toBe(DEFAULT_DURATION)
      expect(system.remaining).toBe(90)
    })

    it('should set active to true', () => {
      system.start()
      expect(system.active).toBe(true)
    })

    it('should accept a custom duration', () => {
      system.start(75)
      expect(system.remaining).toBe(75)
    })

    it('should clamp duration to minimum 60s', () => {
      system.start(30)
      expect(system.remaining).toBe(MIN_DURATION)
    })

    it('should clamp duration to maximum 120s', () => {
      system.start(200)
      expect(system.remaining).toBe(MAX_DURATION)
    })

    it('should emit finalevent:started on EventBus', () => {
      system.start(80)
      expect(EventBus.emit).toHaveBeenCalledWith('finalevent:started', { duration: 80 })
    })

    it('should reset spawn timer', () => {
      system._timeSinceLastSpawn = 9999
      system.start()
      expect(system._timeSinceLastSpawn).toBe(0)
    })
  })

  // -----------------------------------------------------------------------
  // update() — timer decrement
  // -----------------------------------------------------------------------

  describe('update() — timer', () => {
    it('should do nothing when not active', () => {
      system.update(1000)
      expect(EventBus.emit).not.toHaveBeenCalled()
    })

    it('should decrement remaining time', () => {
      system.start(90)
      EventBus.emit.mockClear()
      system.update(5000) // 5 seconds in ms
      expect(system.remaining).toBeCloseTo(85, 1)
    })

    it('should emit finalevent:tick with remaining time', () => {
      system.start(90)
      EventBus.emit.mockClear()
      system.update(1000)
      expect(EventBus.emit).toHaveBeenCalledWith(
        'finalevent:tick',
        expect.objectContaining({ remaining: expect.any(Number) })
      )
    })

    it('should emit victory when timer reaches 0', () => {
      system.start(60)
      EventBus.emit.mockClear()
      // Advance 60 seconds
      system.update(60000)
      expect(EventBus.emit).toHaveBeenCalledWith('victory', { score: 420 })
    })

    it('should set active to false after victory', () => {
      system.start(60)
      system.update(60000)
      expect(system.active).toBe(false)
    })

    it('should set remaining to 0 after victory', () => {
      system.start(60)
      system.update(61000)
      expect(system.remaining).toBe(0)
    })
  })

  // -----------------------------------------------------------------------
  // stop()
  // -----------------------------------------------------------------------

  describe('stop()', () => {
    it('should set active to false', () => {
      system.start(90)
      system.stop()
      expect(system.active).toBe(false)
    })

    it('should set remaining to 0', () => {
      system.start(90)
      system.stop()
      expect(system.remaining).toBe(0)
    })
  })

  // -----------------------------------------------------------------------
  // Squad compositions — all enemy types, larger sizes
  // -----------------------------------------------------------------------

  describe('squad compositions', () => {
    it('ALL_ENEMY_TYPES should include all 4 types', () => {
      expect(ALL_ENEMY_TYPES).toEqual(['estandar', 'montado', 'agua', 'gas'])
    })

    it('every composition should include all enemy types across the set', () => {
      const allTypes = new Set()
      for (const comp of FINAL_SQUAD_COMPOSITIONS) {
        for (const entry of comp) {
          allTypes.add(entry.type)
        }
      }
      for (const type of ALL_ENEMY_TYPES) {
        expect(allTypes.has(type)).toBe(true)
      }
    })

    it('every composition should have total squad size >= 5', () => {
      for (const comp of FINAL_SQUAD_COMPOSITIONS) {
        const total = comp.reduce((sum, e) => sum + e.count, 0)
        expect(total).toBeGreaterThanOrEqual(5)
      }
    })

    it('every composition should have total squad size <= 8', () => {
      for (const comp of FINAL_SQUAD_COMPOSITIONS) {
        const total = comp.reduce((sum, e) => sum + e.count, 0)
        expect(total).toBeLessThanOrEqual(8)
      }
    })

    it('squad sizes should be larger than normal SpawnSystem squads (max 4)', () => {
      for (const comp of FINAL_SQUAD_COMPOSITIONS) {
        const total = comp.reduce((sum, e) => sum + e.count, 0)
        expect(total).toBeGreaterThan(4)
      }
    })
  })

  // -----------------------------------------------------------------------
  // Spawn interval — faster than normal SpawnSystem
  // -----------------------------------------------------------------------

  describe('spawn interval', () => {
    it('SPAWN_INTERVAL_MIN should be 3000ms', () => {
      expect(SPAWN_INTERVAL_MIN).toBe(3000)
    })

    it('SPAWN_INTERVAL_MAX should be 5000ms', () => {
      expect(SPAWN_INTERVAL_MAX).toBe(5000)
    })

    it('spawn interval should be faster than normal SpawnSystem minimum (5000ms)', () => {
      expect(SPAWN_INTERVAL_MIN).toBeLessThan(5000)
    })

    it('should spawn enemies when interval elapses', () => {
      system.start(90)
      EventBus.emit.mockClear()

      // Force a known short interval
      system._currentSpawnInterval = 3000
      system._timeSinceLastSpawn = 0

      // Advance 3 seconds
      system.update(3000)

      // Should have attempted to spawn (enemyGroup.add called or selectSpawnPoint called)
      expect(scene.spawnSystem.selectSpawnPoint).toHaveBeenCalled()
    })
  })

  // -----------------------------------------------------------------------
  // Duration constants
  // -----------------------------------------------------------------------

  describe('duration constants', () => {
    it('DEFAULT_DURATION should be 90', () => {
      expect(DEFAULT_DURATION).toBe(90)
    })

    it('MIN_DURATION should be 60', () => {
      expect(MIN_DURATION).toBe(60)
    })

    it('MAX_DURATION should be 120', () => {
      expect(MAX_DURATION).toBe(120)
    })
  })
})
