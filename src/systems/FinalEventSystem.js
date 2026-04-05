import EventBus from '../EventBus.js'
import PoliciaEstandar from '../entities/PoliciaEstandar.js'
import PoliciaEspecial from '../entities/PoliciaEspecial.js'
import CamionLanzaAgua from '../entities/CamionLanzaAgua.js'
import CamionLanzaGas from '../entities/CamionLanzaGas.js'

/**
 * Enemy types used during the final event — all types spawn simultaneously.
 */
const ALL_ENEMY_TYPES = ['estandar', 'especial', 'agua', 'gas']

/**
 * Squad compositions for the final event — larger squads than normal maps.
 * Normal maps use squads of ~4 enemies; final event uses 5–8.
 */
const FINAL_SQUAD_COMPOSITIONS = [
  [{ type: 'estandar', count: 5 }, { type: 'especial', count: 2 }],
  [{ type: 'estandar', count: 3 }, { type: 'especial', count: 2 }, { type: 'agua', count: 1 }, { type: 'gas', count: 1 }],
  [{ type: 'estandar', count: 4 }, { type: 'agua', count: 1 }, { type: 'gas', count: 1 }],
  [{ type: 'especial', count: 3 }, { type: 'agua', count: 2 }, { type: 'gas', count: 1 }],
  [{ type: 'estandar', count: 2 }, { type: 'especial', count: 3 }, { type: 'gas', count: 2 }]
]

/** Default duration in seconds */
const DEFAULT_DURATION = 90

/** Min/max configurable duration in seconds */
const MIN_DURATION = 60
const MAX_DURATION = 120

/** Spawn interval range in ms (faster than normal SpawnSystem's minimum of 5000ms) */
const SPAWN_INTERVAL_MIN = 3000
const SPAWN_INTERVAL_MAX = 5000

/**
 * FinalEventSystem — manages the timed final event at Plaza Italia.
 *
 * When started, it counts down a configurable timer (60–120s) and spawns
 * large squads of ALL enemy types from multiple spawn points at a fast rate.
 * Emits victory when the timer reaches 0.
 */
export default class FinalEventSystem {
  /**
   * @param {Phaser.Scene} scene - The GameScene instance
   */
  constructor (scene) {
    this.scene = scene
    this.active = false
    this.remaining = 0
    this._timeSinceLastSpawn = 0
    this._currentSpawnInterval = this._randomSpawnInterval()
  }

  /**
   * Start the final event countdown.
   * @param {number} [duration=90] - Duration in seconds (clamped to 60–120)
   */
  start (duration = DEFAULT_DURATION) {
    const clamped = Math.max(MIN_DURATION, Math.min(MAX_DURATION, duration))
    this.remaining = clamped
    this.active = true
    this._timeSinceLastSpawn = 0
    this._currentSpawnInterval = this._randomSpawnInterval()

    EventBus.emit('finalevent:started', { duration: clamped })
  }

  /**
   * Main update — called every frame while the event is active.
   * @param {number} delta - ms since last frame
   */
  update (delta) {
    if (!this.active) return

    const deltaSec = delta / 1000
    this.remaining -= deltaSec

    if (this.remaining <= 0) {
      this.remaining = 0
      this._victory()
      return
    }

    // Emit tick for HUD timer
    EventBus.emit('finalevent:tick', { remaining: this.remaining })

    // Spawn logic
    this._timeSinceLastSpawn += delta
    if (this._timeSinceLastSpawn >= this._currentSpawnInterval) {
      this._timeSinceLastSpawn = 0
      this._currentSpawnInterval = this._randomSpawnInterval()
      this._spawnFinalSquad()
    }
  }

  /**
   * Stop the final event (e.g. on game over or manual stop).
   */
  stop () {
    this.active = false
    this.remaining = 0
  }

  /**
   * Emit victory event with score data.
   * @private
   */
  _victory () {
    this.active = false
    const score = this.scene.scoreSystem ? this.scene.scoreSystem.getTotal() : 0
    EventBus.emit('victory', { score })
  }

  /**
   * Spawn a large squad from a random spawn point.
   * Uses all enemy types and larger squad sizes than normal.
   * @private
   */
  _spawnFinalSquad () {
    if (!this.scene.spawnSystem) return

    const playerPos = this.scene.player
      ? { x: this.scene.player.x, y: this.scene.player.y }
      : { x: 0, y: 0 }

    const composition = this._getRandomComposition()

    // Spawn from multiple points simultaneously — pick up to 2 spawn points
    const mapKey = this.scene.currentMapKey || 'map_plaza_italia'
    const point1 = this.scene.spawnSystem.selectSpawnPoint(mapKey, playerPos, 300)
    const point2 = this.scene.spawnSystem.selectSpawnPoint(mapKey, playerPos, 300)

    const points = [point1, point2].filter(Boolean)
    if (points.length === 0) return

    // Split composition across available spawn points
    for (let i = 0; i < composition.length; i++) {
      const point = points[i % points.length]
      const entry = composition[i]
      this._spawnEnemiesAt(point, entry)
    }
  }

  /**
   * Spawn enemies of a given type/count at a point.
   * @private
   */
  _spawnEnemiesAt (point, entry) {
    if (!this.scene.spawnSystem) return

    const ENEMY_CLASSES = this._getEnemyClasses()
    const EnemyClass = ENEMY_CLASSES[entry.type]
    if (!EnemyClass) return

    for (let i = 0; i < entry.count; i++) {
      const offsetX = (Math.random() - 0.5) * 60
      const offsetY = (Math.random() - 0.5) * 60
      const enemy = new EnemyClass(this.scene, point.x + offsetX, point.y + offsetY)
      if (this.scene.enemyGroup) {
        this.scene.enemyGroup.add(enemy)
      }
    }
  }

  /**
   * Enemy class map keyed by type string.
   * @private
   */
  _getEnemyClasses () {
    return {
      estandar: PoliciaEstandar,
      especial: PoliciaEspecial,
      agua: CamionLanzaAgua,
      gas: CamionLanzaGas
    }
  }

  /**
   * Pick a random final squad composition.
   * @returns {Array<{ type: string, count: number }>}
   * @private
   */
  _getRandomComposition () {
    const idx = Math.floor(Math.random() * FINAL_SQUAD_COMPOSITIONS.length)
    return FINAL_SQUAD_COMPOSITIONS[idx]
  }

  /**
   * Generate a random spawn interval between SPAWN_INTERVAL_MIN and SPAWN_INTERVAL_MAX.
   * @returns {number} ms
   * @private
   */
  _randomSpawnInterval () {
    return SPAWN_INTERVAL_MIN + Math.random() * (SPAWN_INTERVAL_MAX - SPAWN_INTERVAL_MIN)
  }
}

export {
  ALL_ENEMY_TYPES,
  FINAL_SQUAD_COMPOSITIONS,
  DEFAULT_DURATION,
  MIN_DURATION,
  MAX_DURATION,
  SPAWN_INTERVAL_MIN,
  SPAWN_INTERVAL_MAX
}
