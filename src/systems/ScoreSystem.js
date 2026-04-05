import EventBus from '../EventBus.js'

/**
 * Points awarded per enemy type when killed.
 */
export const POINTS_TABLE = {
  estandar: 10,
  especial: 20,
  agua: 50,
  gas: 40
}

/** Bonus points per surviving ally */
export const ALLY_BONUS_PER_ALLY = 5

/** Bonus points per second survived */
export const TIME_BONUS_PER_SECOND = 1

/** Bonus points per powerup collected */
export const POWERUP_BONUS = 5

export default class ScoreSystem {
  constructor () {
    this.score = 0
    this.pointsTable = { ...POINTS_TABLE }

    // Auto-listen to enemy:killed events on EventBus
    this._onEnemyKilled = (data) => {
      if (data && data.type) {
        this.addKill(data.type)
      }
    }
    EventBus.on('enemy:killed', this._onEnemyKilled)
  }

  /**
   * Add points for killing an enemy of the given type.
   * Emits `score:changed` on EventBus.
   * @param {string} enemyType - key in pointsTable
   */
  addKill (enemyType) {
    const points = this.pointsTable[enemyType] || 0
    this.score += points
    EventBus.emit('score:changed', { score: this.score, delta: points })
  }

  /**
   * Add bonus points for surviving allies.
   * @param {number} allyCount - number of surviving allies
   */
  addAllyBonus (allyCount) {
    const points = allyCount * ALLY_BONUS_PER_ALLY
    this.score += points
    EventBus.emit('score:changed', { score: this.score, delta: points })
  }

  /**
   * Add bonus points based on survival time.
   * @param {number} seconds - seconds survived
   */
  addTimeBonus (seconds) {
    const points = Math.floor(seconds) * TIME_BONUS_PER_SECOND
    this.score += points
    EventBus.emit('score:changed', { score: this.score, delta: points })
  }

  /**
   * Add bonus points for collecting a powerup.
   */
  addPowerupBonus () {
    this.score += POWERUP_BONUS
    EventBus.emit('score:changed', { score: this.score, delta: POWERUP_BONUS })
  }

  /**
   * Returns the current total score.
   * @returns {number}
   */
  getTotal () {
    return this.score
  }

  /**
   * Clean up EventBus listener.
   */
  destroy () {
    EventBus.off('enemy:killed', this._onEnemyKilled)
  }
}
