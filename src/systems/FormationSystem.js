const FORMATION_RADIUS = 60

/**
 * FormationSystem — Positions allies around the Player in a circular formation.
 */
export default class FormationSystem {
  constructor () {
    this.positions = []
  }

  /**
   * Get the offset position for an ally at a given index.
   * Uses circular arrangement evenly spaced around the player.
   * @param {number} index - Ally index (0-based)
   * @param {number} total - Total number of allies
   * @returns {{ x: number, y: number }} Offset relative to player
   */
  getPosition (index, total) {
    if (total <= 0) return { x: 0, y: 0 }

    const angle = (2 * Math.PI * index) / total
    return {
      x: Math.cos(angle) * FORMATION_RADIUS,
      y: Math.sin(angle) * FORMATION_RADIUS
    }
  }

  /**
   * Update formation offsets for all active allies.
   * @param {Array} allies - Array of Ally sprites
   * @param {object} player - Player sprite
   */
  update (allies, player) {
    if (!allies || !player) return

    const activeAllies = allies.filter(a => a.active && !a.isDead)
    const total = activeAllies.length

    for (let i = 0; i < total; i++) {
      const offset = this.getPosition(i, total)
      activeAllies[i]._formationOffset = offset
    }

    this.positions = activeAllies.map((_, i) => this.getPosition(i, total))
  }
}
