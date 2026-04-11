import EventBus from '../EventBus.js'

const STORAGE_KEY = 'pinguinocracia2_save'
const OBFUSCATION_KEY = 'P1ngu1n0cr4c14' // XOR key for obfuscation

/**
 * SaveSystem — Single-slot save/load with obfuscation.
 * Data is XOR-encrypted + base64 encoded + checksum validated.
 */
export default class SaveSystem {
  constructor () {
    this.SLOTS = ['quicksave'] // single slot
  }

  /**
   * Save game state to localStorage (obfuscated).
   * @param {string} _slotId - ignored, single slot
   * @param {object} gameState
   * @returns {boolean}
   */
  save (_slotId, gameState) {
    try {
      const json = JSON.stringify(gameState)
      const checksum = this._checksum(json)
      const payload = JSON.stringify({ d: json, c: checksum })
      const encoded = this._xorEncode(payload)
      localStorage.setItem(STORAGE_KEY, encoded)
      return true
    } catch (_) {
      return false
    }
  }

  /**
   * Load game state from localStorage (validates checksum).
   * @param {string} _slotId - ignored, single slot
   * @returns {object|null}
   */
  load (_slotId) {
    try {
      const encoded = localStorage.getItem(STORAGE_KEY)
      if (!encoded) return null

      const payload = this._xorDecode(encoded)
      const { d, c } = JSON.parse(payload)

      // Validate checksum — reject tampered data
      if (this._checksum(d) !== c) {
        console.warn('[SaveSystem] Checksum mismatch — save data may be tampered')
        return null
      }

      return JSON.parse(d)
    } catch (_) {
      return null
    }
  }

  /**
   * Check if a save exists.
   * @returns {boolean}
   */
  hasSave () {
    return localStorage.getItem(STORAGE_KEY) !== null
  }

  /**
   * Delete the save.
   */
  deleteSave () {
    localStorage.removeItem(STORAGE_KEY)
  }

  /**
   * List slots (single slot compat).
   */
  listSlots () {
    const state = this.load()
    return [{
      slotId: 'quicksave',
      date: state?.savedAt || null,
      empty: !state
    }]
  }

  /**
   * XOR encode string → base64.
   */
  _xorEncode (str) {
    let result = ''
    for (let i = 0; i < str.length; i++) {
      result += String.fromCharCode(
        str.charCodeAt(i) ^ OBFUSCATION_KEY.charCodeAt(i % OBFUSCATION_KEY.length)
      )
    }
    return btoa(unescape(encodeURIComponent(result)))
  }

  /**
   * Base64 → XOR decode string.
   */
  _xorDecode (encoded) {
    const decoded = decodeURIComponent(escape(atob(encoded)))
    let result = ''
    for (let i = 0; i < decoded.length; i++) {
      result += String.fromCharCode(
        decoded.charCodeAt(i) ^ OBFUSCATION_KEY.charCodeAt(i % OBFUSCATION_KEY.length)
      )
    }
    return result
  }

  /**
   * Simple checksum (sum of char codes mod large prime).
   */
  _checksum (str) {
    let sum = 0
    for (let i = 0; i < str.length; i++) {
      sum = (sum * 31 + str.charCodeAt(i)) >>> 0
    }
    return sum.toString(36)
  }

  /**
   * Build a serializable GameState from the current scene.
   * @param {object} scene - The GameScene instance
   * @returns {object}
   */
  buildGameState (scene) {
    const player = scene.player || {}
    const allies = []

    if (scene.allyGroup?.getChildren) {
      for (const ally of scene.allyGroup.getChildren()) {
        if (!ally.active || ally.isDead) continue
        allies.push({
          type: ally.type || 'estandar',
          hp: ally.hp ?? 10,
          offsetX: ally.x - (player.x || 0),
          offsetY: ally.y - (player.y || 0)
        })
      }
    }

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
        molotovs: scene.globalCounter?.molotovs || 0
      },
      map: {
        key: scene.currentMapKey || 'map_level1',
        entryPoint: scene.mapManager?.getEntryPoint(scene.currentMapKey) || { x: 192, y: 1080 }
      },
      difficulty: {
        totalTime: scene.totalTime || 0,
        spawnLevel: scene.spawnSystem?.difficultyLevel || 0
      },
      score: scene.scoreSystem?.getTotal() || 0
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
      }
      scene.player.isAlive = state.player.hp > 0
    }

    // Restore inventory
    if (scene.globalCounter && state.inventory) {
      scene.globalCounter.molotovs = state.inventory.molotovs
      EventBus.emit('molotov:changed', { count: state.inventory.molotovs })
    }

    // Restore map
    if (state.map?.key) {
      scene.currentMapKey = state.map.key
      if (scene.mapManager?.loadMap) {
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

    // Restore score
    if (scene.scoreSystem && state.score !== undefined) {
      scene.scoreSystem.score = state.score
      EventBus.emit('score:changed', { score: state.score, delta: 0 })
    }

    // Emit HP sync
    if (scene.player) {
      EventBus.emit('player:healed', { amount: 0, hp: scene.player.hp })
    }
  }
}

export { STORAGE_KEY }
