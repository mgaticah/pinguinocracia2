import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('phaser', () => ({
  default: {
    Scene: class {},
    AUTO: 0,
    Events: { EventEmitter: class {} },
    Physics: { Arcade: { Sprite: class {} } }
  }
}))

vi.mock('../EventBus.js', () => ({
  default: {
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn()
  }
}))

import SaveSystem, { SLOTS, STORAGE_PREFIX } from './SaveSystem.js'
import EventBus from '../EventBus.js'

// Mock localStorage
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
  let saveSystem
  let mockStorage

  beforeEach(() => {
    vi.clearAllMocks()
    mockStorage = createMockLocalStorage()
    Object.defineProperty(globalThis, 'localStorage', { value: mockStorage, writable: true, configurable: true })
    saveSystem = new SaveSystem()
  })

  afterEach(() => {
    delete globalThis.localStorage
  })

  describe('SLOTS', () => {
    it('should have exactly 4 slots', () => {
      expect(saveSystem.SLOTS).toEqual(['slot1', 'slot2', 'slot3', 'quicksave'])
    })
  })

  describe('save()', () => {
    it('should save gameState to localStorage as JSON', () => {
      const state = { version: '1.0', savedAt: '2024-01-01T00:00:00.000Z', score: 100 }
      const result = saveSystem.save('slot1', state)
      expect(result).toBe(true)
      expect(mockStorage.setItem).toHaveBeenCalledWith(
        'pinguinocracia2_slot1',
        JSON.stringify(state)
      )
    })

    it('should return false for invalid slotId', () => {
      const result = saveSystem.save('invalid', { score: 0 })
      expect(result).toBe(false)
    })

    it('should return false when localStorage throws (quota exceeded)', () => {
      mockStorage.setItem.mockImplementation(() => { throw new Error('QuotaExceededError') })
      const result = saveSystem.save('slot1', { score: 0 })
      expect(result).toBe(false)
    })
  })

  describe('load()', () => {
    it('should load and parse gameState from localStorage', () => {
      const state = { version: '1.0', savedAt: '2024-01-01T00:00:00.000Z', score: 42 }
      mockStorage._store['pinguinocracia2_slot2'] = JSON.stringify(state)
      const loaded = saveSystem.load('slot2')
      expect(loaded).toEqual(state)
    })

    it('should return null for empty slot', () => {
      const loaded = saveSystem.load('slot1')
      expect(loaded).toBeNull()
    })

    it('should return null for corrupted JSON data', () => {
      mockStorage._store['pinguinocracia2_slot3'] = '{corrupted data!!!'
      const loaded = saveSystem.load('slot3')
      expect(loaded).toBeNull()
    })

    it('should remove corrupted slot from localStorage', () => {
      mockStorage._store['pinguinocracia2_quicksave'] = 'not json'
      saveSystem.load('quicksave')
      expect(mockStorage.removeItem).toHaveBeenCalledWith('pinguinocracia2_quicksave')
    })

    it('should return null for invalid slotId', () => {
      const loaded = saveSystem.load('badslot')
      expect(loaded).toBeNull()
    })
  })

  describe('listSlots()', () => {
    it('should return all 4 slots with empty status when nothing saved', () => {
      const slots = saveSystem.listSlots()
      expect(slots).toHaveLength(4)
      for (const slot of slots) {
        expect(slot.empty).toBe(true)
        expect(slot.date).toBeNull()
      }
    })

    it('should show occupied slot with date', () => {
      const state = { version: '1.0', savedAt: '2024-06-15T12:00:00.000Z', score: 50 }
      mockStorage._store['pinguinocracia2_slot1'] = JSON.stringify(state)
      const slots = saveSystem.listSlots()
      const slot1 = slots.find(s => s.slotId === 'slot1')
      expect(slot1.empty).toBe(false)
      expect(slot1.date).toBe('2024-06-15T12:00:00.000Z')
    })

    it('should show mix of empty and occupied slots', () => {
      mockStorage._store['pinguinocracia2_slot2'] = JSON.stringify({ savedAt: '2024-01-01T00:00:00.000Z' })
      mockStorage._store['pinguinocracia2_quicksave'] = JSON.stringify({ savedAt: '2024-02-01T00:00:00.000Z' })
      const slots = saveSystem.listSlots()
      expect(slots.find(s => s.slotId === 'slot1').empty).toBe(true)
      expect(slots.find(s => s.slotId === 'slot2').empty).toBe(false)
      expect(slots.find(s => s.slotId === 'slot3').empty).toBe(true)
      expect(slots.find(s => s.slotId === 'quicksave').empty).toBe(false)
    })
  })

  describe('save/load round-trip', () => {
    it('should produce identical state after save then load', () => {
      const state = {
        version: '1.0',
        savedAt: '2024-01-01T00:00:00.000Z',
        player: { hp: 7, speed: 160, weapon: 'molotov', x: 500, y: 300 },
        allies: [{ type: 'punk', hp: 10, offsetX: 40, offsetY: 40 }],
        inventory: { molotovs: 3 },
        map: { key: 'map_lastarria', entryPoint: { x: 192, y: 1080 }, unlockedExits: [] },
        difficulty: { totalTime: 180, spawnLevel: 3, activeEnemyTypes: ['estandar', 'especial'] },
        activeEffects: { energetica: { active: true, remaining: 4.5 } },
        score: 250
      }
      saveSystem.save('slot1', state)
      const loaded = saveSystem.load('slot1')
      expect(loaded).toEqual(state)
    })
  })

  describe('buildGameState()', () => {
    it('should extract correct player data from scene', () => {
      const scene = {
        player: { hp: 8, speed: 160, weapon: 'piedra', x: 100, y: 200, isAlive: true },
        allyGroup: { getChildren: () => [] },
        globalCounter: { molotovs: 2 },
        currentMapKey: 'map_barros_arana',
        mapManager: { getEntryPoint: () => ({ x: 192, y: 1080 }) },
        totalTime: 90,
        spawnSystem: { difficultyLevel: 1 },
        effectSystem: { activeEffects: new Map() },
        scoreSystem: { getTotal: () => 50 }
      }
      const state = saveSystem.buildGameState(scene)
      expect(state.version).toBe('1.0')
      expect(state.player.hp).toBe(8)
      expect(state.player.weapon).toBe('piedra')
      expect(state.player.x).toBe(100)
      expect(state.player.y).toBe(200)
      expect(state.inventory.molotovs).toBe(2)
      expect(state.map.key).toBe('map_barros_arana')
      expect(state.difficulty.totalTime).toBe(90)
      expect(state.difficulty.spawnLevel).toBe(1)
      expect(state.score).toBe(50)
      expect(state.savedAt).toBeDefined()
    })

    it('should serialize allies with offsets relative to player', () => {
      const scene = {
        player: { hp: 10, speed: 160, weapon: 'piedra', x: 100, y: 200 },
        allyGroup: {
          getChildren: () => [
            { active: true, isDead: false, type: 'estandar', hp: 8, x: 140, y: 240 },
            { active: true, isDead: false, type: 'rapido', hp: 6, x: 60, y: 160 }
          ]
        },
        globalCounter: { molotovs: 0 },
        currentMapKey: 'map_barros_arana',
        mapManager: { getEntryPoint: () => ({ x: 192, y: 1080 }) },
        totalTime: 0,
        spawnSystem: { difficultyLevel: 0 },
        effectSystem: { activeEffects: new Map() },
        scoreSystem: { getTotal: () => 0 }
      }
      const state = saveSystem.buildGameState(scene)
      expect(state.allies).toHaveLength(2)
      expect(state.allies[0]).toEqual({ type: 'estandar', hp: 8, offsetX: 40, offsetY: 40 })
      expect(state.allies[1]).toEqual({ type: 'rapido', hp: 6, offsetX: -40, offsetY: -40 })
    })

    it('should skip dead allies', () => {
      const scene = {
        player: { hp: 10, speed: 160, weapon: 'piedra', x: 0, y: 0 },
        allyGroup: {
          getChildren: () => [
            { active: true, isDead: true, type: 'estandar', hp: 0, x: 40, y: 40 },
            { active: false, isDead: false, type: 'rapido', hp: 8, x: 60, y: 60 }
          ]
        },
        globalCounter: { molotovs: 0 },
        currentMapKey: 'map_barros_arana',
        mapManager: { getEntryPoint: () => ({ x: 192, y: 1080 }) },
        totalTime: 0,
        spawnSystem: { difficultyLevel: 0 },
        effectSystem: { activeEffects: new Map() },
        scoreSystem: { getTotal: () => 0 }
      }
      const state = saveSystem.buildGameState(scene)
      expect(state.allies).toHaveLength(0)
    })

    it('should capture energetica effect when active', () => {
      const player = { hp: 10, speed: 240, weapon: 'piedra', x: 0, y: 0 }
      const effects = new Map()
      effects.set(player, { type: 'energetica', remaining: 3.5, originalSpeed: 160 })
      const scene = {
        player,
        allyGroup: { getChildren: () => [] },
        globalCounter: { molotovs: 0 },
        currentMapKey: 'map_barros_arana',
        mapManager: { getEntryPoint: () => ({ x: 192, y: 1080 }) },
        totalTime: 0,
        spawnSystem: { difficultyLevel: 0 },
        effectSystem: { activeEffects: effects },
        scoreSystem: { getTotal: () => 0 }
      }
      const state = saveSystem.buildGameState(scene)
      expect(state.activeEffects.energetica.active).toBe(true)
      expect(state.activeEffects.energetica.remaining).toBe(3.5)
    })
  })

  describe('restoreGameState()', () => {
    it('should restore player state', () => {
      const player = { hp: 10, speed: 160, weapon: 'piedra', x: 0, y: 0, isAlive: true, setPosition: vi.fn() }
      const scene = {
        player,
        globalCounter: { molotovs: 0 },
        allyGroup: { clear: vi.fn(), add: vi.fn(), getChildren: vi.fn(() => []) },
        mapManager: { loadMap: vi.fn() },
        spawnSystem: { difficultyLevel: 0, intervalMs: 60000, intervalSequence: [60000, 45000, 30000, 20000, 15000, 10000, 5000] },
        effectSystem: { applyEffect: vi.fn(), activeEffects: new Map() },
        scoreSystem: { score: 0 },
        totalTime: 0,
        currentMapKey: 'map_barros_arana'
      }
      const state = {
        player: { hp: 5, speed: 240, weapon: 'molotov', x: 500, y: 300 },
        allies: [],
        inventory: { molotovs: 7 },
        map: { key: 'map_lastarria', entryPoint: { x: 192, y: 1080 }, unlockedExits: [] },
        difficulty: { totalTime: 200, spawnLevel: 4, activeEnemyTypes: ['estandar', 'especial', 'agua'] },
        activeEffects: { energetica: { active: false, remaining: 0 } },
        score: 300
      }
      saveSystem.restoreGameState(scene, state)
      expect(player.hp).toBe(5)
      expect(player.speed).toBe(240)
      expect(player.weapon).toBe('molotov')
      expect(player.setPosition).toHaveBeenCalledWith(500, 300)
      expect(player.isAlive).toBe(true)
      expect(scene.globalCounter.molotovs).toBe(7)
      expect(scene.currentMapKey).toBe('map_lastarria')
      expect(scene.totalTime).toBe(200)
      expect(scene.spawnSystem.difficultyLevel).toBe(4)
      expect(scene.scoreSystem.score).toBe(300)
    })

    it('should restore energetica effect when active', () => {
      const player = { hp: 10, speed: 160, weapon: 'piedra', x: 0, y: 0, isAlive: true, setPosition: vi.fn() }
      const scene = {
        player,
        globalCounter: { molotovs: 0 },
        allyGroup: { clear: vi.fn(), add: vi.fn(), getChildren: vi.fn(() => []) },
        mapManager: { loadMap: vi.fn() },
        spawnSystem: { difficultyLevel: 0, intervalMs: 60000, intervalSequence: [60000, 45000, 30000, 20000, 15000, 10000, 5000] },
        effectSystem: { applyEffect: vi.fn(), activeEffects: new Map() },
        scoreSystem: { score: 0 },
        totalTime: 0,
        currentMapKey: 'map_barros_arana'
      }
      const state = {
        player: { hp: 10, speed: 160, weapon: 'piedra', x: 0, y: 0 },
        allies: [],
        inventory: { molotovs: 0 },
        map: { key: 'map_barros_arana', entryPoint: { x: 192, y: 1080 }, unlockedExits: [] },
        difficulty: { totalTime: 0, spawnLevel: 0, activeEnemyTypes: [] },
        activeEffects: { energetica: { active: true, remaining: 4.2 } },
        score: 0
      }
      saveSystem.restoreGameState(scene, state)
      expect(scene.effectSystem.applyEffect).toHaveBeenCalledWith(player, 'energetica', 4.2)
    })

    it('should emit score:changed and molotov:changed events', () => {
      const player = { hp: 10, speed: 160, weapon: 'piedra', x: 0, y: 0, isAlive: true, setPosition: vi.fn() }
      const scene = {
        player,
        globalCounter: { molotovs: 0 },
        allyGroup: { clear: vi.fn(), add: vi.fn(), getChildren: vi.fn(() => []) },
        mapManager: { loadMap: vi.fn() },
        spawnSystem: { difficultyLevel: 0, intervalMs: 60000, intervalSequence: [60000, 45000, 30000, 20000, 15000, 10000, 5000] },
        effectSystem: { applyEffect: vi.fn(), activeEffects: new Map() },
        scoreSystem: { score: 0 },
        totalTime: 0,
        currentMapKey: 'map_barros_arana'
      }
      const state = {
        player: { hp: 10, speed: 160, weapon: 'piedra', x: 0, y: 0 },
        allies: [],
        inventory: { molotovs: 5 },
        map: { key: 'map_barros_arana', entryPoint: { x: 192, y: 1080 }, unlockedExits: [] },
        difficulty: { totalTime: 0, spawnLevel: 0, activeEnemyTypes: [] },
        activeEffects: { energetica: { active: false, remaining: 0 } },
        score: 100
      }
      saveSystem.restoreGameState(scene, state)
      expect(EventBus.emit).toHaveBeenCalledWith('molotov:changed', { count: 5 })
      expect(EventBus.emit).toHaveBeenCalledWith('score:changed', { score: 100, delta: 0 })
    })

    it('should handle null state gracefully', () => {
      const scene = { player: { hp: 10 } }
      expect(() => saveSystem.restoreGameState(scene, null)).not.toThrow()
    })
  })
})
