import Powerup from '../entities/Powerup.js'

const SPAWN_INTERVAL = 15000
const MIN_SPAWN_DISTANCE = 300

/**
 * Weight tables for powerup type selection.
 * Higher weight = more likely to spawn.
 */
const WEIGHTS_NORMAL = {
  manzana: 40,
  maruchan: 10,
  botellita: 25,
  energetica: 10
}

const WEIGHTS_DANGER = {
  manzana: 30,
  maruchan: 20,
  botellita: 15,
  energetica: 30
}

/**
 * PowerupSpawnSystem — Generates powerups on the map at regular intervals
 * using weighted random selection based on player danger state.
 */
export default class PowerupSpawnSystem {
  /**
   * @param {Phaser.Scene} scene
   * @param {Phaser.Physics.Arcade.StaticGroup} powerupGroup
   */
  constructor (scene, powerupGroup) {
    this.scene = scene
    this.powerupGroup = powerupGroup
    this._timeSinceLastSpawn = 0
  }

  /**
   * Main update — called every frame from GameScene.
   * @param {number} delta - ms since last frame
   * @param {number} playerHp - current player HP
   * @param {number} enemyCount - number of active enemies
   */
  update (delta, playerHp, enemyCount) {
    this._timeSinceLastSpawn += delta

    if (this._timeSinceLastSpawn >= SPAWN_INTERVAL) {
      this._timeSinceLastSpawn = 0
      const mapKey = this.scene.currentMapKey
      const playerPos = this.scene.player
        ? { x: this.scene.player.x, y: this.scene.player.y }
        : { x: 0, y: 0 }
      this.spawnPowerup(mapKey, playerPos, playerHp, enemyCount)
    }
  }

  /**
   * Spawn a single powerup on the map.
   * @param {string} mapKey
   * @param {{ x: number, y: number }} playerPos
   * @param {number} [playerHp=10]
   * @param {number} [enemyCount=0]
   */
  spawnPowerup (mapKey, playerPos, playerHp = 10, enemyCount = 0) {
    const point = this.selectSpawnPoint(mapKey, playerPos, MIN_SPAWN_DISTANCE)
    if (!point) return null

    const type = this.selectType(playerHp, enemyCount)
    const powerup = new Powerup(this.scene, point.x, point.y, type)

    if (this.powerupGroup) {
      this.powerupGroup.add(powerup)
    }

    return powerup
  }

  /**
   * Select a powerup type using weighted random selection.
   * Uses danger weights when player HP < 3 or enemies >= 5.
   * @param {number} playerHp
   * @param {number} enemyCount
   * @returns {string}
   */
  selectType (playerHp, enemyCount) {
    const inDanger = playerHp < 3 || enemyCount >= 5
    const weights = inDanger ? WEIGHTS_DANGER : WEIGHTS_NORMAL

    const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0)
    let roll = Math.random() * totalWeight

    for (const [type, weight] of Object.entries(weights)) {
      roll -= weight
      if (roll <= 0) return type
    }

    // Fallback (should not reach here)
    return 'manzana'
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

    const points = this.scene.mapManager.getPowerupPoints(mapKey)
    const valid = points.filter(p => {
      const dx = p.x - playerPos.x
      const dy = p.y - playerPos.y
      return Math.sqrt(dx * dx + dy * dy) >= minDistance
    })

    if (valid.length === 0) return null

    return valid[Math.floor(Math.random() * valid.length)]
  }
}

export { SPAWN_INTERVAL, MIN_SPAWN_DISTANCE, WEIGHTS_NORMAL, WEIGHTS_DANGER }
