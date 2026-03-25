import Ally from './Ally.js'
import EventBus from '../EventBus.js'

/**
 * AliadoPunk — Punk ally type.
 * 12 HP, speed × 0.9 (144), higher attack frequency, +3 molotovs on spawn.
 */
export default class AliadoPunk extends Ally {
  constructor (scene, x, y) {
    super(scene, x, y, 'aliadoPunk', {
      hp: 12,
      speed: 144,
      type: 'punk',
      attackCooldown: 800
    })

    // Add 3 molotovs to global counter on spawn
    if (this.scene && this.scene.globalCounter) {
      this.scene.globalCounter.molotovs += 3
      EventBus.emit('molotov:changed', { count: this.scene.globalCounter.molotovs })
    }
  }
}
