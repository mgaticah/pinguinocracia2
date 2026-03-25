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

import PowerupSpawnSystem, {
  SPAWN_INTERVAL,
  MIN_SPAWN_DISTANCE,
  WEIGHTS_NORMAL,
  WEIGHTS_DANGER
} from './PowerupSpawnSystem.js'

function createMockScene () {
  return {
    currentMapKey: 'map_barros_arana',
    player: { x: 192, y: 1080 },
    mapManager: {
      getPowerupPoints: vi.fn(() => [
        { x: 960, y: 540 },
        { x: 1920, y: 1080 },
        { x: 2880, y: 540 },
        { x: 960, y: 1620 },
        { x: 2880, y: 1620 }
      ])
    },
    add: { existing: vi.fn() },
    physics: { add: { existing: vi.fn() } },
    anims: { exists: () => false, create: vi.fn() },
    time: { delayedCall: vi.fn() }
  }
}

describe('PowerupSpawnSystem', () => {
  let scene, system, mockGroup

  beforeEach(() => {
    scene = createMockScene()
    mockGroup = { add: vi.fn() }
    system = new PowerupSpawnSystem(scene, mockGroup)
  })

  describe('constants', () => {
    it('should have spawn interval of 15000ms', () => {
      expect(SPAWN_INTERVAL).toBe(15000)
    })

    it('should have min spawn distance of 300', () => {
      expect(MIN_SPAWN_DISTANCE).toBe(300)
    })

    it('should have correct normal weights', () => {
      expect(WEIGHTS_NORMAL).toEqual({
        manzana: 40,
        maruchan: 10,
        botellita: 25,
        energetica: 10
      })
    })

    it('should have correct danger weights', () => {
      expect(WEIGHTS_DANGER).toEqual({
        manzana: 30,
        maruchan: 20,
        botellita: 15,
        energetica: 30
      })
    })
  })

  describe('update()', () => {
    it('should not spawn before interval elapses', () => {
      const spy = vi.spyOn(system, 'spawnPowerup')
      system.update(10000, 10, 0)
      expect(spy).not.toHaveBeenCalled()
    })

    it('should spawn when interval elapses', () => {
      const spy = vi.spyOn(system, 'spawnPowerup')
      system.update(15000, 10, 0)
      expect(spy).toHaveBeenCalledTimes(1)
    })

    it('should accumulate delta across multiple calls', () => {
      const spy = vi.spyOn(system, 'spawnPowerup')
      system.update(5000, 10, 0)
      system.update(5000, 10, 0)
      expect(spy).not.toHaveBeenCalled()
      system.update(5000, 10, 0)
      expect(spy).toHaveBeenCalledTimes(1)
    })

    it('should reset timer after spawn', () => {
      const spy = vi.spyOn(system, 'spawnPowerup')
      system.update(15000, 10, 0)
      spy.mockClear()
      system.update(10000, 10, 0)
      expect(spy).not.toHaveBeenCalled()
    })
  })

  describe('selectType()', () => {
    it('should return a valid powerup type', () => {
      const validTypes = ['manzana', 'maruchan', 'botellita', 'energetica']
      const type = system.selectType(10, 0)
      expect(validTypes).toContain(type)
    })

    it('should use normal weights when not in danger', () => {
      // With HP=10 and 0 enemies, not in danger
      const counts = { manzana: 0, maruchan: 0, botellita: 0, energetica: 0 }
      for (let i = 0; i < 1000; i++) {
        counts[system.selectType(10, 0)]++
      }
      // Manzana (weight 40) should be most common
      expect(counts.manzana).toBeGreaterThan(counts.maruchan)
      expect(counts.manzana).toBeGreaterThan(counts.energetica)
    })

    it('should use danger weights when HP < 3', () => {
      const counts = { manzana: 0, maruchan: 0, botellita: 0, energetica: 0 }
      for (let i = 0; i < 1000; i++) {
        counts[system.selectType(2, 0)]++
      }
      // Energetica (weight 30) should be much higher than normal (weight 10)
      // In danger: energetica=30/95 ≈ 31.6% vs normal: 10/85 ≈ 11.8%
      expect(counts.energetica).toBeGreaterThan(200)
    })

    it('should use danger weights when enemies >= 5', () => {
      const counts = { manzana: 0, maruchan: 0, botellita: 0, energetica: 0 }
      for (let i = 0; i < 1000; i++) {
        counts[system.selectType(10, 5)]++
      }
      expect(counts.energetica).toBeGreaterThan(200)
    })
  })

  describe('selectSpawnPoint()', () => {
    it('should return a point at least minDistance from player', () => {
      const point = system.selectSpawnPoint('map_barros_arana', { x: 192, y: 1080 }, MIN_SPAWN_DISTANCE)
      expect(point).not.toBeNull()
      const dx = point.x - 192
      const dy = point.y - 1080
      expect(Math.sqrt(dx * dx + dy * dy)).toBeGreaterThanOrEqual(MIN_SPAWN_DISTANCE)
    })

    it('should return null if no points are far enough', () => {
      scene.mapManager.getPowerupPoints = vi.fn(() => [{ x: 192, y: 1080 }])
      const point = system.selectSpawnPoint('map_barros_arana', { x: 192, y: 1080 }, MIN_SPAWN_DISTANCE)
      expect(point).toBeNull()
    })

    it('should return null if mapManager is missing', () => {
      system.scene.mapManager = null
      const point = system.selectSpawnPoint('map_barros_arana', { x: 0, y: 0 }, 300)
      expect(point).toBeNull()
    })
  })

  describe('spawnPowerup()', () => {
    it('should add powerup to the group', () => {
      system.spawnPowerup('map_barros_arana', { x: 192, y: 1080 })
      expect(mockGroup.add).toHaveBeenCalled()
    })

    it('should return null if no valid spawn point', () => {
      scene.mapManager.getPowerupPoints = vi.fn(() => [{ x: 192, y: 1080 }])
      const result = system.spawnPowerup('map_barros_arana', { x: 192, y: 1080 })
      expect(result).toBeNull()
    })
  })
})
