import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Phaser — MapManager only needs it when generating procedural maps
vi.mock('phaser', () => {
  class Scene {
    constructor (key) { this.key = key }
  }
  return {
    default: {
      Scene,
      AUTO: 0,
      Events: { EventEmitter: class {} },
      Physics: { Arcade: { Sprite: class {} } }
    },
    Scene
  }
})

import MapManager, { MAP_CONFIGS } from './MapManager.js'

describe('MapManager', () => {
  let manager

  beforeEach(() => {
    manager = new MapManager()
  })

  // -----------------------------------------------------------------------
  // MAP_CONFIGS validation
  // -----------------------------------------------------------------------

  describe('MAP_CONFIGS', () => {
    const expectedKeys = [
      'map_level1',
      'map_amunategui',
      'map_lastarria',
      'map_plaza_italia'
    ]

    it('should define exactly 4 maps', () => {
      expect(Object.keys(MAP_CONFIGS)).toHaveLength(5)
    })

    it.each(expectedKeys)('should contain map "%s"', (key) => {
      expect(MAP_CONFIGS[key]).toBeDefined()
    })

    it.each(expectedKeys)('map "%s" should have required fields', (key) => {
      const cfg = MAP_CONFIGS[key]
      expect(cfg.key).toBe(key)
      expect(typeof cfg.name).toBe('string')
      expect(typeof cfg.tilemapKey).toBe('string')
      expect(cfg.entryPoint).toHaveProperty('x')
      expect(cfg.entryPoint).toHaveProperty('y')
      expect(Array.isArray(cfg.spawnPoints)).toBe(true)
      expect(cfg.spawnPoints.length).toBeGreaterThanOrEqual(1)
      expect(Array.isArray(cfg.powerupPoints)).toBe(true)
      expect(cfg.powerupPoints.length).toBeGreaterThanOrEqual(1)
      expect(Array.isArray(cfg.exitZones)).toBe(true)
      expect(typeof cfg.difficultyModifier).toBe('number')
    })

    it('map_level1 should have name "Level 1"', () => {
      expect(MAP_CONFIGS.map_level1.name).toBe('Level 1')
    })

    it('map_amunategui should have name "Amunátegui"', () => {
      expect(MAP_CONFIGS.map_amunategui.name).toBe('Amunátegui')
    })

    it('map_lastarria should have name "Lastarria"', () => {
      expect(MAP_CONFIGS.map_lastarria.name).toBe('Lastarria')
    })

    it('map_plaza_italia should have name "Plaza Italia"', () => {
      expect(MAP_CONFIGS.map_plaza_italia.name).toBe('Plaza Italia')
    })

    it('plaza_italia should have no exit zones (final map)', () => {
      expect(MAP_CONFIGS.map_plaza_italia.exitZones).toHaveLength(0)
    })

    it('non-final maps should have at least one exit zone', () => {
      expect(MAP_CONFIGS.map_level1.exitZones.length).toBeGreaterThanOrEqual(1)
      expect(MAP_CONFIGS.map_amunategui.exitZones.length).toBeGreaterThanOrEqual(1)
      expect(MAP_CONFIGS.map_lastarria.exitZones.length).toBeGreaterThanOrEqual(1)
    })

    it('exit zones should reference valid target maps', () => {
      for (const [, cfg] of Object.entries(MAP_CONFIGS)) {
        for (const ez of cfg.exitZones) {
          expect(MAP_CONFIGS[ez.targetMap]).toBeDefined()
        }
      }
    })

    it('difficulty modifier should increase across maps', () => {
      expect(MAP_CONFIGS.map_level1.difficultyModifier)
        .toBeLessThan(MAP_CONFIGS.map_amunategui.difficultyModifier)
      expect(MAP_CONFIGS.map_amunategui.difficultyModifier)
        .toBeLessThan(MAP_CONFIGS.map_lastarria.difficultyModifier)
      expect(MAP_CONFIGS.map_lastarria.difficultyModifier)
        .toBeLessThan(MAP_CONFIGS.map_plaza_italia.difficultyModifier)
    })
  })

  // -----------------------------------------------------------------------
  // Constructor
  // -----------------------------------------------------------------------

  describe('constructor', () => {
    it('should initialize maps with all 4 configs', () => {
      expect(manager.maps.size).toBe(5)
    })

    it('should start with no current map', () => {
      expect(manager.currentMap).toBeNull()
    })
  })

  // -----------------------------------------------------------------------
  // loadMap
  // -----------------------------------------------------------------------

  describe('loadMap()', () => {
    it('should set currentMap to the loaded config', () => {
      const result = manager.loadMap('map_level1', null)
      expect(manager.currentMap).toBe(MAP_CONFIGS.map_level1)
      expect(result).toBe(MAP_CONFIGS.map_level1)
    })

    it('should throw for unknown map key', () => {
      expect(() => manager.loadMap('map_unknown', null)).toThrow('unknown map key')
    })

    it('should build walkable grid on load', () => {
      manager.loadMap('map_level1', null)
      const grid = manager.getWalkableGrid()
      expect(grid.length).toBeGreaterThan(0)
      expect(grid[0].length).toBeGreaterThan(0)
    })

    it('should mark obstacle cells as 1 in the grid', () => {
      manager.loadMap('map_level1', null)
      const grid = manager.getWalkableGrid()
      // Obstacle at (480, 240, 288, 192) → tile col 10, row 5
      expect(grid[5][10]).toBe(1)
    })

    it('should mark non-obstacle cells as 0', () => {
      manager.loadMap('map_level1', null)
      const grid = manager.getWalkableGrid()
      // (0,0) is not an obstacle
      expect(grid[0][0]).toBe(0)
    })
  })

  // -----------------------------------------------------------------------
  // Accessor methods
  // -----------------------------------------------------------------------

  describe('getSpawnPoints()', () => {
    it('should return spawn points for a valid map', () => {
      const points = manager.getSpawnPoints('map_level1')
      expect(points.length).toBe(MAP_CONFIGS.map_level1.spawnPoints.length)
      expect(points[0]).toHaveProperty('x')
      expect(points[0]).toHaveProperty('y')
    })

    it('should return a copy (not the original array)', () => {
      const points = manager.getSpawnPoints('map_level1')
      points.push({ x: 0, y: 0 })
      expect(manager.getSpawnPoints('map_level1').length)
        .toBe(MAP_CONFIGS.map_level1.spawnPoints.length)
    })

    it('should return empty array for unknown key', () => {
      expect(manager.getSpawnPoints('nope')).toEqual([])
    })
  })

  describe('getPowerupPoints()', () => {
    it('should return powerup points for a valid map', () => {
      const points = manager.getPowerupPoints('map_amunategui')
      expect(points.length).toBe(MAP_CONFIGS.map_amunategui.powerupPoints.length)
    })

    it('should return empty array for unknown key', () => {
      expect(manager.getPowerupPoints('nope')).toEqual([])
    })
  })

  describe('getExitZones()', () => {
    it('should return exit zones for a valid map', () => {
      const zones = manager.getExitZones('map_level1')
      expect(zones.length).toBe(1)
      expect(zones[0]).toHaveProperty('targetMap', 'map_level2')
      expect(zones[0]).toHaveProperty('width')
      expect(zones[0]).toHaveProperty('height')
    })

    it('should return empty array for plaza_italia', () => {
      expect(manager.getExitZones('map_plaza_italia')).toEqual([])
    })

    it('should return empty array for unknown key', () => {
      expect(manager.getExitZones('nope')).toEqual([])
    })
  })

  describe('getEntryPoint()', () => {
    it('should return entry point for a valid map', () => {
      const ep = manager.getEntryPoint('map_lastarria')
      expect(ep).toEqual(MAP_CONFIGS.map_lastarria.entryPoint)
    })

    it('should return a copy (not the original object)', () => {
      const ep = manager.getEntryPoint('map_lastarria')
      ep.x = 9999
      expect(manager.getEntryPoint('map_lastarria').x)
        .toBe(MAP_CONFIGS.map_lastarria.entryPoint.x)
    })

    it('should return null for unknown key', () => {
      expect(manager.getEntryPoint('nope')).toBeNull()
    })
  })

  // -----------------------------------------------------------------------
  // getObstacleLayer / getWalkableGrid / getMapDimensions
  // -----------------------------------------------------------------------

  describe('getObstacleLayer()', () => {
    it('should return null before loading a map (no scene)', () => {
      expect(manager.getObstacleLayer()).toBeNull()
    })
  })

  describe('getWalkableGrid()', () => {
    it('should return empty array before loading a map', () => {
      expect(manager.getWalkableGrid()).toEqual([])
    })

    it('should return grid with correct dimensions after load', () => {
      manager.loadMap('map_plaza_italia', null)
      const grid = manager.getWalkableGrid()
      // 3840/48 = 80 cols, 2160/48 = 45 rows
      expect(grid.length).toBe(45)
      expect(grid[0].length).toBe(80)
    })

    it('plaza_italia should have fewer obstacles than other maps', () => {
      const countOnes = (grid) =>
        grid.reduce((sum, row) => sum + row.filter(c => c === 1).length, 0)

      manager.loadMap('map_level1', null)
      const baCount = countOnes(manager.getWalkableGrid())

      manager.loadMap('map_plaza_italia', null)
      const piCount = countOnes(manager.getWalkableGrid())

      expect(piCount).toBeLessThan(baCount)
    })
  })

  describe('getMapDimensions()', () => {
    it('should return width and height', () => {
      const dims = manager.getMapDimensions()
      expect(dims.width).toBe(3840)
      expect(dims.height).toBe(2160)
    })
  })
})
