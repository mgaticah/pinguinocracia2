import Ally from './Ally.js'

/**
 * AliadoEstándar — Standard ally type.
 * 10 HP, base speed (160).
 */
export default class AliadoEstandar extends Ally {
  constructor (scene, x, y) {
    super(scene, x, y, 'aliadoEstandar', {
      hp: 10,
      speed: 160,
      type: 'estandar',
      attackCooldown: 1500
    })
  }
}
