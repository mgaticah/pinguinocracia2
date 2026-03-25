import Ally from './Ally.js'

/**
 * AliadoRápido — Fast ally type.
 * 8 HP, speed × 1.2 (192).
 */
export default class AliadoRapido extends Ally {
  constructor (scene, x, y) {
    super(scene, x, y, 'aliadoRapido', {
      hp: 8,
      speed: 192,
      type: 'rapido',
      attackCooldown: 1500
    })
  }
}
