import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('phaser', () => ({
  default: { Scene: class {}, AUTO: 0, Events: { EventEmitter: class {} }, Physics: { Arcade: { Sprite: class {} } } }
}))

vi.mock('../EventBus.js', () => ({
  default: { emit: vi.fn(), on: vi.fn(), off: vi.fn() }
}))

import SaveSystem, { STORAGE_KEY } from './SaveSystem.js'
import EventBus from '../EventBus.js'

function createMockLocalStorage () {
  const store = {}
  return {
    getItem: vi.fn((key) => store[key] ?? null),
    setItem: vi.fn((key, value) => { store[key] = value }),
    removeItem: vi.fn((key) => { delete store[key] }),
    _store: store
  }
}

describe('SaveSystem', () => {
  let saveSystem, mockStorage

  beforeEach(() => {
    vi.clearAllMocks()
    mockStorage = createMockLocalStorage()
    Object.defineProperty(globalThis, 'localStorage', { value: mockStorage, writable: true, configurable: true })
    saveSystem = new SaveSystem()
  })

  afterEach(() => { delete globalThis.localStorage })

  describe('save/load round-trip', () => {
    it('should produce identical state after save then load', () => {
      const state = {
        version: '1.0',
        savedAt: '2024-01-01T00:00:00.000Z',
        player: { hp: 7, speed: 160, weapon: 'molotov', x: 500, y: 300 },
        allies: [{ type: 'punk', hp: 10, offsetX: 40, offsetY: 40 }],
        inventory: { molotovs: 3 },
        map: { key: 'map_lastarria', entryPoint: { x: 192, y: 1080 } },
        difficulty: { totalTime: 180, spawnLevel: 3 },
        score: 250
      }
      saveSystem.save('quicksave', state)
      const loaded = saveSystem.load('quicksave')
      expect(loaded).toEqual(state)
    })

    it('should return true on successful save', () => {
      expect(saveSystem.save('quicksave', { score: 0 })).toBe(true)
    })

    it('should return false when localStorage throws', () => {
      mockStorage.setItem.mockImplementation(() => { throw new Error('QuotaExceeded') })
      expect(saveSystem.save('quicksave', { score: 0 })).toBe(false)
    })
  })

  describe('load()', () => {
    it('should return null when no save exists', () => {
      expect(saveSystem.load()).toBeNull()
    })

    it('should return null for tampered data', () => {
      // Save valid data first
      saveSystem.save('quicksave', { score: 100 })
      // Tamper with the stored value
      const key = STORAGE_KEY
      mockStorage._store[key] = 'dGFtcGVyZWQ=' // base64 of "tampered"
      expect(saveSystem.load()).toBeNull()
    })
  })

  describe('hasSave()', () => {
    it('should return false when no save exists', () => {
      expect(saveSystem.hasSave()).toBe(false)
    })

    it('should return true after saving', () => {
      saveSystem.save('quicksave', { score: 0 })
      expect(saveSystem.hasSave()).toBe(true)
    })
  })

  describe('deleteSave()', () => {
    it('should remove the save', () => {
      saveSystem.save('quicksave', { score: 0 })
      saveSystem.deleteSave()
      expect(saveSystem.hasSave()).toBe(false)
    })
  })

  describe('listSlots()', () => {
    it('should return empty slot when no save', () => {
      const slots = saveSystem.listSlots()
      expect(slots).toHaveLength(1)
      expect(slots[0].empty).toBe(true)
    })

    it('should return occupied slot with date', () => {
      saveSystem.save('quicksave', { savedAt: '2024-06-15T12:00:00.000Z' })
      const slots = saveSystem.listSlots()
      expect(slots[0].empty).toBe(false)
      expect(slots[0].date).toBe('2024-06-15T12:00:00.000Z')
    })
  })

  describe('obfuscation', () => {
    it('should store data as non-JSON (obfuscated)', () => {
      saveSystem.save('quicksave', { score: 42 })
      const raw = mockStorage._store[STORAGE_KEY]
      // Should not be plain JSON
      expect(() => JSON.parse(raw)).toThrow()
    })

    it('should reject data with modified checksum', () => {
      saveSystem.save('quicksave', { score: 100 })
      // Corrupt the stored data slightly
      const raw = mockStorage._store[STORAGE_KEY]
      mockStorage._store[STORAGE_KEY] = raw.slice(0, -2) + 'XX'
      expect(saveSystem.load()).toBeNull()
    })
  })

  describe('buildGameState()', () => {
    it('should extract correct data from scene', () => {
      const scene = {
        player: { hp: 8, speed: 160, weapon: 'piedra', x: 100, y: 200 },
        allyGroup: { getChildren: () => [] },
        globalCounter: { molotovs: 2 },
        currentMapKey: 'map_level1',
        mapManager: { getEntryPoint: () => ({ x: 192, y: 1080 }) },
        totalTime: 90,
        spawnSystem: { difficultyLevel: 1 },
        scoreSystem: { getTotal: () => 50 }
      }
      const state = saveSystem.buildGameState(scene)
      expect(state.player.hp).toBe(8)
      expect(state.inventory.molotovs).toBe(2)
      expect(state.map.key).toBe('map_level1')
      expect(state.difficulty.totalTime).toBe(90)
      expect(state.score).toBe(50)
    })

    it('should serialize allies with offsets', () => {
      const scene = {
        player: { hp: 10, speed: 160, weapon: 'piedra', x: 100, y: 200 },
        allyGroup: {
          getChildren: () => [
            { active: true, isDead: false, type: 'estandar', hp: 8, x: 140, y: 240 }
          ]
        },
        globalCounter: { molotovs: 0 },
        currentMapKey: 'map_level1',
        mapManager: { getEntryPoint: () => ({ x: 192, y: 1080 }) },
        totalTime: 0,
        spawnSystem: { difficultyLevel: 0 },
        scoreSystem: { getTotal: () => 0 }
      }
      const state = saveSystem.buildGameState(scene)
      expect(state.allies[0]).toEqual({ type: 'estandar', hp: 8, offsetX: 40, offsetY: 40 })
    })
  })

  describe('restoreGameState()', () => {
    it('should restore player and scene state', () => {
      const player = { hp: 10, speed: 160, weapon: 'piedra', x: 0, y: 0, isAlive: true, setPosition: vi.fn() }
      const scene = {
        player,
        globalCounter: { molotovs: 0 },
        mapManager: { loadMap: vi.fn() },
        spawnSystem: { difficultyLevel: 0, intervalMs: 10000, intervalSequence: [10000, 30000, 20000] },
        scoreSystem: { score: 0 },
        totalTime: 0,
        currentMapKey: 'map_level1'
      }
      const state = {
        player: { hp: 5, speed: 240, weapon: 'molotov', x: 500, y: 300 },
        inventory: { molotovs: 7 },
        map: { key: 'map_lastarria' },
        difficulty: { totalTime: 200, spawnLevel: 2 },
        score: 300
      }
      saveSystem.restoreGameState(scene, state)
      expect(player.hp).toBe(5)
      expect(player.weapon).toBe('molotov')
      expect(player.setPosition).toHaveBeenCalledWith(500, 300)
      expect(scene.globalCounter.molotovs).toBe(7)
      expect(scene.currentMapKey).toBe('map_lastarria')
      expect(scene.scoreSystem.score).toBe(300)
      expect(EventBus.emit).toHaveBeenCalledWith('molotov:changed', { count: 7 })
      expect(EventBus.emit).toHaveBeenCalledWith('score:changed', { score: 300, delta: 0 })
    })

    it('should handle null state gracefully', () => {
      expect(() => saveSystem.restoreGameState({}, null)).not.toThrow()
    })
  })
})
