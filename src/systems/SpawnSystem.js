import PoliciaEstandar from '../entities/PoliciaEstandar.js'
import PoliciaMontado from '../entities/PoliciaMontado.js'
import CamionLanzaAgua from '../entities/CamionLanzaAgua.js'
import CamionLanzaGas from '../entities/CamionLanzaGas.js'

const MIN_SPAWN_DISTANCE = 300

const INTERVAL_SEQUENCE = [20000, 45000, 30000, 20000, 15000, 10000, 5000]

/**
 * Squad compositions — each is an array of { type, count }.
 * Filtered at runtime so only time-enabled types are spawned.
 */
const SQUAD_COMPOSITIONS = [
  [{ type: 'estandar', count: 4 }],
  [{ type: 'estandar', count: 3 }, { type: 'montado', count: 1 }],
  [{ type: 'estandar', count: 2 }, { type: 'montado', count: 1 }, { type: 'agua', count: 1 }],
  [{ type: 'agua', count: 1 }, { type: 'montado', count: 3 }]
]

/**
 * Returns the set of enemy types enabled at a given totalTime (seconds).
 */
export function getEnabledTypes (totalTime) {
  const types = new Set(['estandar'])
  if (totalTime >= 120) types.add('montado')
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
    const point = this.selectSpawnPoint(mapKey, playerPos, MIN_SPAWN_DISTANCE)
    if (!point) return // no valid spawn point this cycle

    const totalTime = this.scene.totalTime || 0
    const composition = this.getSquadComposition(this.difficultyLevel, totalTime)

    const ENEMY_CLASSES = {
      estandar: PoliciaEstandar,
      montado: PoliciaMontado,
      agua: CamionLanzaAgua,
      gas: CamionLanzaGas
    }

    for (const entry of composition) {
      const EnemyClass = ENEMY_CLASSES[entry.type]
      if (!EnemyClass) continue

      for (let i = 0; i < entry.count; i++) {
        // Slight offset so enemies don't stack exactly
        const offsetX = (Math.random() - 0.5) * 60
        const offsetY = (Math.random() - 0.5) * 60
        const enemy = new EnemyClass(this.scene, point.x + offsetX, point.y + offsetY)
        if (this.scene.enemyGroup) {
          this.scene.enemyGroup.add(enemy)
        }
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
