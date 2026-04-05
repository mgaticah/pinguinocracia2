import PoliciaEstandar from '../entities/PoliciaEstandar.js'
import PoliciaEspecial from '../entities/PoliciaEspecial.js'
import CamionLanzaAgua from '../entities/CamionLanzaAgua.js'
import CamionLanzaGas from '../entities/CamionLanzaGas.js'

const MIN_SPAWN_DISTANCE = 300

const INTERVAL_SEQUENCE = [10000, 30000, 20000, 15000, 10000, 7000, 5000]

/**
 * Squad compositions — each is an array of { type, count }.
 * Filtered at runtime so only time-enabled types are spawned.
 */
const SQUAD_COMPOSITIONS = [
  [{ type: 'estandar', count: 4 }],
  [{ type: 'estandar', count: 3 }, { type: 'especial', count: 1 }],
  [{ type: 'estandar', count: 2 }, { type: 'especial', count: 1 }, { type: 'agua', count: 1 }],
  [{ type: 'agua', count: 1 }, { type: 'especial', count: 3 }]
]

/**
 * Returns the set of enemy types enabled at a given totalTime (seconds).
 */
export function getEnabledTypes (totalTime) {
  const types = new Set(['estandar'])
  if (totalTime >= 120) types.add('especial')
  if (totalTime >= 240) types.add('agua')
  if (totalTime >= 360) types.add('gas')
  return types
}

/**
 * SpawnSystem — generates enemy squads at progressive intervals.
 */
export default class SpawnSystem {
  /**
   * @param {Phaser.Scene} scene - The GameScene instance
   */
  constructor (scene) {
    this.scene = scene
    this.intervalSequence = INTERVAL_SEQUENCE
    this.difficultyLevel = 0
    this.intervalMs = this.intervalSequence[0]
    this._timeSinceLastSpawn = 0
    this._firstSpawnDone = false
    this._capWarned = false
  }

  /**
   * Main update — called every frame from GameScene.
   * @param {number} delta - ms since last frame
   * @param {number} totalTime - seconds elapsed since game start
   * @param {number} allyCount - number of active allies
   */
  update (delta, totalTime, allyCount = 0) {
    // First spawn immediately
    if (totalTime < 0) return

    // Cap active enemies to prevent performance issues
    const activeEnemies = this.scene.enemyGroup
      ? this.scene.enemyGroup.getChildren().filter(e => e.active).length
      : 0
    if (activeEnemies >= 30) {
      if (!this._capWarned) {
        console.log(`[SpawnSystem] Enemy cap reached (${activeEnemies}/30), pausing spawns`)
        this._capWarned = true
      }
      return
    }
    this._capWarned = false

    this._timeSinceLastSpawn += delta

    if (!this._firstSpawnDone) {
      this._firstSpawnDone = true
      this._timeSinceLastSpawn = this.intervalMs // trigger immediate spawn
    }

    if (this._timeSinceLastSpawn >= this.intervalMs) {
      this._timeSinceLastSpawn = 0
      this.spawnSquad(this.scene.currentMapKey, { x: this.scene.player.x, y: this.scene.player.y })
      this.escalateDifficulty(this.scene.currentMapKey, allyCount)
    }
  }

  /**
   * Spawn a squad of enemies at a valid spawn point.
   * @param {string} mapKey
   * @param {{ x: number, y: number }} playerPos
   */
  spawnSquad (mapKey, playerPos) {
    const totalTime = this.scene.totalTime || 0
    const composition = this.getSquadComposition(this.difficultyLevel, totalTime)

    const VEHICLE_TYPES = new Set(['agua', 'gas'])
    const footUnits = composition.filter(e => !VEHICLE_TYPES.has(e.type))
    const vehicleUnits = composition.filter(e => VEHICLE_TYPES.has(e.type))

    const ENEMY_CLASSES = {
      estandar: PoliciaEstandar,
      especial: PoliciaEspecial,
      agua: CamionLanzaAgua,
      gas: CamionLanzaGas
    }

    // Spawn foot enemies from foot spawn points (blue zones)
    if (footUnits.length > 0) {
      const footPoint = this.selectSpawnPoint(mapKey, playerPos, MIN_SPAWN_DISTANCE)
      if (footPoint) {
        for (const entry of footUnits) {
          const EnemyClass = ENEMY_CLASSES[entry.type]
          if (!EnemyClass) continue
          for (let i = 0; i < entry.count; i++) {
            const offsetX = (Math.random() - 0.5) * 60
            const offsetY = (Math.random() - 0.5) * 60
            const enemy = new EnemyClass(this.scene, footPoint.x + offsetX, footPoint.y + offsetY)
            if (this.scene.enemyGroup) {
              this.scene.enemyGroup.add(enemy)
            }
          }
        }
        console.log(`[SpawnSystem] Spawned foot squad at (${Math.round(footPoint.x)}, ${Math.round(footPoint.y)}): ${footUnits.map(u => `${u.count}×${u.type}`).join(', ')}`)
      }
    }

    // Spawn vehicles from vehicle spawn points (orange zones)
    if (vehicleUnits.length > 0) {
      const vehiclePoint = this.selectVehicleSpawnPoint(mapKey, playerPos, MIN_SPAWN_DISTANCE)
      if (vehiclePoint) {
        for (const entry of vehicleUnits) {
          const EnemyClass = ENEMY_CLASSES[entry.type]
          if (!EnemyClass) continue
          for (let i = 0; i < entry.count; i++) {
            const offsetX = (Math.random() - 0.5) * 80
            const offsetY = (Math.random() - 0.5) * 80
            const enemy = new EnemyClass(this.scene, vehiclePoint.x + offsetX, vehiclePoint.y + offsetY)
            if (this.scene.enemyGroup) {
              this.scene.enemyGroup.add(enemy)
            }
          }
        }
        console.log(`[SpawnSystem] Spawned vehicle squad at (${Math.round(vehiclePoint.x)}, ${Math.round(vehiclePoint.y)}): ${vehicleUnits.map(u => `${u.count}×${u.type}`).join(', ')}`)
      }
    }
  }

  /**
   * Pick a squad composition valid for the current difficulty and time.
   * Filters out types not yet enabled by totalTime.
   * @param {number} difficultyLevel
   * @param {number} totalTime - seconds
   * @returns {Array<{ type: string, count: number }>}
   */
  getSquadComposition (difficultyLevel, totalTime) {
    const enabled = getEnabledTypes(totalTime)

    // Filter compositions to those whose types are all enabled
    const valid = SQUAD_COMPOSITIONS.filter(comp =>
      comp.every(entry => enabled.has(entry.type))
    )

    if (valid.length === 0) {
      return [{ type: 'estandar', count: 4 }]
    }

    // Pick a random valid composition
    const idx = Math.floor(Math.random() * valid.length)
    return valid[idx]
  }

  /**
   * Select a spawn point at least minDistance from the player.
   * @param {string} mapKey
   * @param {{ x: number, y: number }} playerPos
   * @param {number} minDistance
   * @returns {{ x: number, y: number } | null}
   */
  selectSpawnPoint (mapKey, playerPos, minDistance) {
    if (!this.scene.mapManager) return null

    const points = this.scene.mapManager.getSpawnPoints(mapKey)
    const valid = points.filter(p => {
      const dx = p.x - playerPos.x
      const dy = p.y - playerPos.y
      return Math.sqrt(dx * dx + dy * dy) >= minDistance
    })

    if (valid.length === 0) return null

    return valid[Math.floor(Math.random() * valid.length)]
  }

  /**
   * Select a vehicle spawn point at least minDistance from the player.
   * @param {string} mapKey
   * @param {{ x: number, y: number }} playerPos
   * @param {number} minDistance
   * @returns {{ x: number, y: number } | null}
   */
  selectVehicleSpawnPoint (mapKey, playerPos, minDistance) {
    if (!this.scene.mapManager) return null

    const points = this.scene.mapManager.getVehicleSpawnPoints(mapKey)
    const valid = points.filter(p => {
      const dx = p.x - playerPos.x
      const dy = p.y - playerPos.y
      return Math.sqrt(dx * dx + dy * dy) >= minDistance
    })

    if (valid.length === 0) return null

    return valid[Math.floor(Math.random() * valid.length)]
  }

  /**
   * Increase difficulty level (and thus reduce spawn interval).
   * Called after each spawn.
   * @param {string} mapKey
   * @param {number} allyCount
   */
  escalateDifficulty (mapKey, allyCount) {
    const maxLevel = this.intervalSequence.length - 1

    if (this.difficultyLevel < maxLevel) {
      this.difficultyLevel++
      this.intervalMs = this.intervalSequence[this.difficultyLevel]
    }
  }
}

export { SQUAD_COMPOSITIONS, INTERVAL_SEQUENCE, MIN_SPAWN_DISTANCE }
