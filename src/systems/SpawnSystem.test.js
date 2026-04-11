import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Phaser so Enemy base class doesn't blow up
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

vi.mock('easystarjs', () => ({
  default: { js: class { setGrid () {} setAcceptableTiles () {} enableDiagonals () {} enableCornerCutting () {} findPath () {} calculate () {} } }
}))

import SpawnSystem, {
  SQUAD_COMPOSITIONS,
  INTERVAL_SEQUENCE,
  MIN_SPAWN_DISTANCE,
  getEnabledTypes
} from './SpawnSystem.js'

function createMockScene (overrides = {}) {
  return {
    currentMapKey: 'map_barros_arana',
    totalTime: 0,
    player: { x: 192, y: 1080, isAlive: true },
    enemyGroup: { add: vi.fn(), getChildren: () => [] },
    mapManager: {
      getSpawnPoints: vi.fn(() => [
        { x: 96, y: 96 },
        { x: 3744, y: 96 },
        { x: 3744, y: 2064 },
        { x: 96, y: 2064 }
      ]),
      getVehicleSpawnPoints: vi.fn(() => [
        { x: 96, y: 96 },
        { x: 3744, y: 2064 }
      ]),
      getWalkableGrid: vi.fn(() => [])
    },
    add: { existing: vi.fn() },
    physics: { add: { existing: vi.fn() } },
    anims: { exists: () => false },
    ...overrides
  }
}

describe('SpawnSystem', () => {
  let scene, spawn

  beforeEach(() => {
    scene = createMockScene()
    spawn = new SpawnSystem(scene)
  })

  // -----------------------------------------------------------------------
  // Constructor / initial state
  // -----------------------------------------------------------------------

  describe('constructor', () => {
    it('should start at difficulty level 0', () => {
      expect(spawn.difficultyLevel).toBe(0)
    })

    it('should have intervalMs equal to first element of sequence', () => {
      expect(spawn.intervalMs).toBe(10000)
    })

    it('should store the interval sequence', () => {
      expect(spawn.intervalSequence).toEqual(INTERVAL_SEQUENCE)
    })
  })

  // -----------------------------------------------------------------------
  // INTERVAL_SEQUENCE constant
  // -----------------------------------------------------------------------

  describe('INTERVAL_SEQUENCE', () => {
    it('should be [10000, 30000, 20000, 15000, 10000, 7000, 5000]', () => {
      expect(INTERVAL_SEQUENCE).toEqual([10000, 30000, 20000, 15000, 10000, 7000, 5000])
    })

    it('minimum interval should be 5000ms', () => {
      expect(Math.min(...INTERVAL_SEQUENCE)).toBe(5000)
    })
  })

  // -----------------------------------------------------------------------
  // update() — timing
  // -----------------------------------------------------------------------

  describe('update()', () => {
    it('should spawn immediately at game start (first spawn)', () => {
      const spawnSquadSpy = vi.spyOn(spawn, 'spawnSquad')
      spawn.update(0, 0)
      expect(spawnSquadSpy).toHaveBeenCalledTimes(1)
    })

    it('should spawn again after intervalMs elapses (second spawn)', () => {
      const spawnSquadSpy = vi.spyOn(spawn, 'spawnSquad')
      spawn.update(0, 0) // first spawn immediate, escalates to level 1 (45000ms)
      spawnSquadSpy.mockClear()
      spawn.update(45001, 45)
      expect(spawnSquadSpy).toHaveBeenCalledTimes(1)
      expect(spawnSquadSpy).toHaveBeenCalledTimes(1)
    })

    it('should not spawn again until intervalMs has elapsed', () => {
      const spawnSquadSpy = vi.spyOn(spawn, 'spawnSquad')
      spawn.update(0, 60) // first spawn
      spawnSquadSpy.mockClear()
      spawn.update(10000, 70) // 10s later, interval is 45s (escalated after first)
      expect(spawnSquadSpy).not.toHaveBeenCalled()
    })

    it('should spawn again after intervalMs elapses', () => {
      const spawnSquadSpy = vi.spyOn(spawn, 'spawnSquad')
      spawn.update(0, 60) // first spawn, escalates to level 1 (45s)
      spawnSquadSpy.mockClear()
      spawn.update(45000, 105) // 45s later
      expect(spawnSquadSpy).toHaveBeenCalledTimes(1)
    })
  })

  // -----------------------------------------------------------------------
  // getEnabledTypes()
  // -----------------------------------------------------------------------

  describe('getEnabledTypes()', () => {
    it('should only enable estandar on level 1 at start', () => {
      const types = getEnabledTypes(0, 'map_level1')
      expect(types).toEqual(new Set(['estandar']))
    })

    it('should enable especial on level 2', () => {
      const types = getEnabledTypes(0, 'map_level2')
      expect(types.has('especial')).toBe(true)
      expect(types.has('estandar')).toBe(true)
    })

    it('should enable agua on level 3 (amunategui)', () => {
      const types = getEnabledTypes(0, 'map_amunategui')
      expect(types.has('agua')).toBe(true)
    })

    it('should enable gas on level 4 (lastarria)', () => {
      const types = getEnabledTypes(0, 'map_lastarria')
      expect(types.has('gas')).toBe(true)
      expect(types.size).toBe(4)
    })

    it('should enable especial by time (30s) even on level 1', () => {
      expect(getEnabledTypes(30, 'map_level1').has('especial')).toBe(true)
    })

    it('should enable agua by time (60s) even on level 1', () => {
      expect(getEnabledTypes(60, 'map_level1').has('agua')).toBe(true)
    })

    it('should enable gas by time (90s) even on level 1', () => {
      expect(getEnabledTypes(90, 'map_level1').has('gas')).toBe(true)
    })

    it('should not enable especial before 30s on level 1', () => {
      expect(getEnabledTypes(29, 'map_level1').has('especial')).toBe(false)
    })
  })

  // -----------------------------------------------------------------------
  // getSquadComposition()
  // -----------------------------------------------------------------------

  describe('getSquadComposition()', () => {
    it('should only return estandar squads on level 1 at start', () => {
      const comp = spawn.getSquadComposition(0, 0, 'map_level1')
      for (const entry of comp) {
        expect(entry.type).toBe('estandar')
      }
    })

    it('should allow especial in squads on level 2', () => {
      for (let i = 0; i < 20; i++) {
        const comp = spawn.getSquadComposition(1, 0, 'map_level2')
        for (const entry of comp) {
          expect(['estandar', 'especial']).toContain(entry.type)
        }
      }
    })

    it('should allow agua in squads on level 3', () => {
      for (let i = 0; i < 20; i++) {
        const comp = spawn.getSquadComposition(2, 0, 'map_amunategui')
        for (const entry of comp) {
          expect(['estandar', 'especial', 'agua']).toContain(entry.type)
        }
      }
    })

    it('should return a valid composition from SQUAD_COMPOSITIONS', () => {
      const comp = spawn.getSquadComposition(0, 0, 'map_plaza_italia')
      const match = SQUAD_COMPOSITIONS.some(sc =>
        JSON.stringify(sc) === JSON.stringify(comp)
      )
      expect(match).toBe(true)
    })
  })

  // -----------------------------------------------------------------------
  // selectSpawnPoint()
  // -----------------------------------------------------------------------

  describe('selectSpawnPoint()', () => {
    it('should return a point at least minDistance from player', () => {
      const point = spawn.selectSpawnPoint('map_barros_arana', { x: 192, y: 1080 }, MIN_SPAWN_DISTANCE)
      expect(point).not.toBeNull()
      const dx = point.x - 192
      const dy = point.y - 1080
      expect(Math.sqrt(dx * dx + dy * dy)).toBeGreaterThanOrEqual(MIN_SPAWN_DISTANCE)
    })

    it('should return null if no points are far enough', () => {
      scene.mapManager.getSpawnPoints = vi.fn(() => [{ x: 192, y: 1080 }])
      const point = spawn.selectSpawnPoint('map_barros_arana', { x: 192, y: 1080 }, MIN_SPAWN_DISTANCE)
      expect(point).toBeNull()
    })

    it('should return null if mapManager is missing', () => {
      spawn.scene.mapManager = null
      const point = spawn.selectSpawnPoint('map_barros_arana', { x: 0, y: 0 }, 300)
      expect(point).toBeNull()
    })
  })

  // -----------------------------------------------------------------------
  // escalateDifficulty()
  // -----------------------------------------------------------------------

  describe('escalateDifficulty()', () => {
    it('should increment difficultyLevel', () => {
      spawn.escalateDifficulty('map_barros_arana', 0)
      expect(spawn.difficultyLevel).toBe(1)
    })

    it('should update intervalMs to match new level', () => {
      spawn.escalateDifficulty('map_barros_arana', 0)
      expect(spawn.intervalMs).toBe(30000)
    })

    it('should not exceed max difficulty level', () => {
      for (let i = 0; i < 20; i++) {
        spawn.escalateDifficulty('map_barros_arana', 0)
      }
      expect(spawn.difficultyLevel).toBe(INTERVAL_SEQUENCE.length - 1)
      expect(spawn.intervalMs).toBe(5000)
    })
  })

  // -----------------------------------------------------------------------
  // spawnSquad()
  // -----------------------------------------------------------------------

  describe('spawnSquad()', () => {
    it('should add enemies to the enemyGroup', () => {
      scene.totalTime = 60
      spawn.spawnSquad('map_barros_arana', { x: 192, y: 1080 })
      expect(scene.enemyGroup.add).toHaveBeenCalled()
    })

    it('should not crash if no valid spawn point', () => {
      scene.mapManager.getSpawnPoints = vi.fn(() => [{ x: 192, y: 1080 }])
      expect(() => {
        spawn.spawnSquad('map_barros_arana', { x: 192, y: 1080 })
      }).not.toThrow()
    })

    it('should spawn the correct number of enemies for a 4-estandar squad', () => {
      scene.totalTime = 60
      // Force composition to be the first one (4 estandar)
      vi.spyOn(spawn, 'getSquadComposition').mockReturnValue([{ type: 'estandar', count: 4 }])
      spawn.spawnSquad('map_barros_arana', { x: 192, y: 1080 })
      expect(scene.enemyGroup.add).toHaveBeenCalledTimes(4)
    })
  })

  // -----------------------------------------------------------------------
  // MIN_SPAWN_DISTANCE constant
  // -----------------------------------------------------------------------

  describe('MIN_SPAWN_DISTANCE', () => {
    it('should be 300', () => {
      expect(MIN_SPAWN_DISTANCE).toBe(300)
    })
  })
})
