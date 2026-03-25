import EventBus from '../EventBus.js'

const SLOTS = ['slot1', 'slot2', 'slot3', 'quicksave']
const STORAGE_PREFIX = 'pinguinocracia2_'

/**
 * SaveSystem — Manages save/load of game state to localStorage.
 * Supports 4 slots: slot1, slot2, slot3, quicksave.
 */
export default class SaveSystem {
  constructor () {
    this.SLOTS = SLOTS
  }

  /**
   * Save a gameState to the given slot in localStorage.
   * @param {string} slotId - One of SLOTS
   * @param {object} gameState - Serializable game state
   * @returns {boolean} true if saved successfully, false on error
   */
  save (slotId, gameState) {
    if (!SLOTS.includes(slotId)) return false

    try {
      const data = JSON.stringify(gameState)
      localStorage.setItem(`${STORAGE_PREFIX}${slotId}`, data)
      return true
    } catch (_e) {
      return false
    }
  }

  /**
   * Load a gameState from the given slot.
   * @param {string} slotId - One of SLOTS
   * @returns {object|null} The parsed game state, or null if empty/corrupted
   */
  load (slotId) {
    if (!SLOTS.includes(slotId)) return null

    try {
      const raw = localStorage.getItem(`${STORAGE_PREFIX}${slotId}`)
      if (raw === null) return null
      return JSON.parse(raw)
    } catch (_e) {
      // Corrupted JSON — mark slot as invalid by removing it
      try {
        localStorage.removeItem(`${STORAGE_PREFIX}${slotId}`)
      } catch (_ignored) {}
      return null
    }
  }

  /**
   * List all slots with their status.
   * @returns {Array<{ slotId: string, date: string|null, empty: boolean }>}
   */
  listSlots () {
    return SLOTS.map(slotId => {
      const state = this.load(slotId)
      if (state && state.savedAt) {
        return { slotId, date: state.savedAt, empty: false }
      }
      return { slotId, date: null, empty: true }
    })
  }

  /**
   * Build a serializable GameState from the current scene.
   * @param {object} scene - The GameScene instance
   * @returns {object} GameState
   */
  buildGameState (scene) {
    const player = scene.player || {}
    const allies = []

    if (scene.allyGroup) {
      const allyChildren = scene.allyGroup.getChildren
        ? scene.allyGroup.getChildren()
        : []
      for (const ally of allyChildren) {
        if (!ally.active || ally.isDead) continue
        allies.push({
          type: ally.type || 'estandar',
          hp: ally.hp ?? 10,
          offsetX: ally.x - (player.x || 0),
          offsetY: ally.y - (player.y || 0)
        })
      }
    }

    // Gather active energetica effect info
    let energeticaEffect = { active: false, remaining: 0 }
    if (scene.effectSystem && scene.effectSystem.activeEffects) {
      const playerEffect = scene.effectSystem.activeEffects.get(player)
      if (playerEffect && playerEffect.type === 'energetica') {
        energeticaEffect = { active: true, remaining: playerEffect.remaining }
      }
    }

    // Determine active enemy types from spawn system
    const activeEnemyTypes = []
    const totalTime = scene.totalTime || 0
    if (totalTime >= 60) activeEnemyTypes.push('estandar')
    if (totalTime >= 120) activeEnemyTypes.push('montado')
    if (totalTime >= 240) activeEnemyTypes.push('agua')
    if (totalTime >= 360) activeEnemyTypes.push('gas')

    return {
      version: '1.0',
      savedAt: new Date().toISOString(),
      player: {
        hp: player.hp ?? 10,
        speed: player.speed ?? 160,
        weapon: player.weapon || 'piedra',
        x: player.x ?? 0,
        y: player.y ?? 0
      },
      allies,
      inventory: {
        molotovs: scene.globalCounter ? scene.globalCounter.molotovs : 0
      },
      map: {
        key: scene.currentMapKey || 'map_barros_arana',
        entryPoint: scene.mapManager
          ? scene.mapManager.getEntryPoint(scene.currentMapKey) || { x: 192, y: 1080 }
          : { x: 192, y: 1080 },
        unlockedExits: []
      },
      difficulty: {
        totalTime,
        spawnLevel: scene.spawnSystem ? scene.spawnSystem.difficultyLevel : 0,
        activeEnemyTypes
      },
      activeEffects: {
        energetica: energeticaEffect
      },
      score: scene.scoreSystem ? scene.scoreSystem.getTotal() : 0
    }
  }

  /**
   * Restore a GameState into the scene.
   * @param {object} scene - The GameScene instance
   * @param {object} state - A previously saved GameState
   */
  restoreGameState (scene, state) {
    if (!state) return

    // Restore player
    if (scene.player && state.player) {
      scene.player.hp = state.player.hp
      scene.player.speed = state.player.speed
      scene.player.weapon = state.player.weapon
      if (scene.player.setPosition) {
        scene.player.setPosition(state.player.x, state.player.y)
      } else {
        scene.player.x = state.player.x
        scene.player.y = state.player.y
      }
      scene.player.isAlive = state.player.hp > 0
    }

    // Restore inventory
    if (scene.globalCounter && state.inventory) {
      scene.globalCounter.molotovs = state.inventory.molotovs
      EventBus.emit('molotov:changed', { count: state.inventory.molotovs })
    }

    // Restore map
    if (state.map && state.map.key) {
      scene.currentMapKey = state.map.key
      if (scene.mapManager && scene.mapManager.loadMap) {
        scene.mapManager.loadMap(state.map.key, scene)
      }
    }

    // Restore difficulty
    if (state.difficulty) {
      scene.totalTime = state.difficulty.totalTime || 0
      if (scene.spawnSystem) {
        scene.spawnSystem.difficultyLevel = state.difficulty.spawnLevel || 0
        const seq = scene.spawnSystem.intervalSequence
        if (seq) {
          scene.spawnSystem.intervalMs = seq[scene.spawnSystem.difficultyLevel] || seq[0]
        }
      }
    }

    // Restore effects
    if (state.activeEffects && state.activeEffects.energetica && state.activeEffects.energetica.active) {
      if (scene.effectSystem && scene.player) {
        scene.effectSystem.applyEffect(scene.player, 'energetica', state.activeEffects.energetica.remaining)
      }
    }

    // Restore score
    if (scene.scoreSystem && state.score !== undefined) {
      scene.scoreSystem.score = state.score
      EventBus.emit('score:changed', { score: state.score, delta: 0 })
    }

    // Restore allies
    if (state.allies && scene.allyGroup) {
      // Clear existing allies
      if (scene.allyGroup.clear) {
        scene.allyGroup.clear(true, true)
      }

      const playerX = state.player ? state.player.x : 0
      const playerY = state.player ? state.player.y : 0

      for (const allyData of state.allies) {
        const x = playerX + (allyData.offsetX || 0)
        const y = playerY + (allyData.offsetY || 0)

        let ally = null
        if (scene._createAllyByType) {
          ally = scene._createAllyByType(allyData.type, x, y)
        }

        if (ally) {
          ally.hp = allyData.hp
          if (scene.allyGroup.add) {
            scene.allyGroup.add(ally)
          }
        }
      }
    }
  }
}

export { SLOTS, STORAGE_PREFIX }
