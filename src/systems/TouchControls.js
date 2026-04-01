/**
 * TouchControls — Virtual joystick + attack button for mobile.
 * Only visible on touch-capable devices. Repositions on screen resize/rotate.
 */
export default class TouchControls {
  constructor (scene) {
    this.scene = scene
    this.direction = { x: 0, y: 0 }
    this.attackPressed = false
    this._enabled = false
    this._dragPointer = null
    this._joystickRadius = 50
    this._elements = []

    if (scene.sys?.game?.device?.input?.touch) {
      this._enabled = true
      this._create()
      // Reposition on resize/rotate
      scene.scale.on('resize', () => this._reposition())
    }
  }

  _getLayout () {
    const w = this.scene.scale.width
    const h = this.scene.scale.height
    return {
      joystick: { x: 120, y: h * 0.7 },
      attack: { x: w - 100, y: h * 0.7 },
      weapon: { x: w - 100, y: h * 0.7 - 90 },
      zoneW: w,
      zoneH: h
    }
  }

  _create () {
    const lay = this._getLayout()

    // Joystick base
    this._joyBase = this.scene.add.graphics().setScrollFactor(0).setDepth(200)
    // Joystick thumb
    this._joyThumb = this.scene.add.graphics().setScrollFactor(0).setDepth(201)
    this._joyThumb.fillStyle(0x1a3a6b, 0.6)
    this._joyThumb.fillCircle(0, 0, 25)

    // Attack button
    this._atkGfx = this.scene.add.graphics().setScrollFactor(0).setDepth(200)
    this._atkLabel = this.scene.add.text(0, 0, '⚔', {
      fontSize: '32px', color: '#ffffff'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201)

    // Weapon toggle button
    this._wpnGfx = this.scene.add.graphics().setScrollFactor(0).setDepth(200)
    this._wpnLabel = this.scene.add.text(0, 0, 'Q', {
      fontSize: '20px', fontFamily: 'monospace', color: '#ffffff'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201)

    // Draw and position
    this._reposition()

    // Input — use scene-wide pointer events for reliability
    this.scene.input.addPointer(1) // support 2 simultaneous touches

    this.scene.input.on('pointerdown', (pointer) => {
      const lay = this._getLayout()
      // Left half = joystick
      if (pointer.x < lay.zoneW / 2) {
        this._dragPointer = pointer.id
        this._updateJoystick(pointer.x, pointer.y)
      } else {
        // Right half — check weapon button first
        const dw = pointer.x - lay.weapon.x
        const dh = pointer.y - lay.weapon.y
        if (Math.sqrt(dw * dw + dh * dh) <= 40) {
          if (this.scene.player) this.scene.player.switchWeapon()
        } else {
          this.attackPressed = true
        }
      }
    })

    this.scene.input.on('pointermove', (pointer) => {
      if (pointer.id === this._dragPointer && pointer.isDown) {
        this._updateJoystick(pointer.x, pointer.y)
      }
    })

    this.scene.input.on('pointerup', (pointer) => {
      if (pointer.id === this._dragPointer) {
        this._dragPointer = null
        this.direction = { x: 0, y: 0 }
        const lay = this._getLayout()
        this._joyThumb.setPosition(lay.joystick.x, lay.joystick.y)
      }
      // Release attack on any pointer up on right side
      if (pointer.x >= this._getLayout().zoneW / 2) {
        this.attackPressed = false
      }
    })
  }

  _reposition () {
    const lay = this._getLayout()
    const R = this._joystickRadius

    // Redraw joystick base
    this._joyBase.clear()
    this._joyBase.fillStyle(0x1a3a6b, 0.3)
    this._joyBase.fillCircle(lay.joystick.x, lay.joystick.y, R)
    this._joyBase.lineStyle(2, 0x1a3a6b, 0.5)
    this._joyBase.strokeCircle(lay.joystick.x, lay.joystick.y, R)

    // Reset thumb position
    this._joyThumb.setPosition(lay.joystick.x, lay.joystick.y)

    // Redraw attack button
    this._atkGfx.clear()
    this._atkGfx.fillStyle(0xcc2222, 0.4)
    this._atkGfx.fillCircle(lay.attack.x, lay.attack.y, 40)
    this._atkGfx.lineStyle(2, 0xcc2222, 0.6)
    this._atkGfx.strokeCircle(lay.attack.x, lay.attack.y, 40)
    this._atkLabel.setPosition(lay.attack.x, lay.attack.y)

    // Redraw weapon button
    this._wpnGfx.clear()
    this._wpnGfx.fillStyle(0x1a3a6b, 0.4)
    this._wpnGfx.fillCircle(lay.weapon.x, lay.weapon.y, 30)
    this._wpnLabel.setPosition(lay.weapon.x, lay.weapon.y)
  }

  _updateJoystick (px, py) {
    const lay = this._getLayout()
    const ox = lay.joystick.x
    const oy = lay.joystick.y
    const dx = px - ox
    const dy = py - oy
    const dist = Math.sqrt(dx * dx + dy * dy)
    const maxDist = this._joystickRadius

    if (dist > maxDist) {
      this._joyThumb.setPosition(ox + (dx / dist) * maxDist, oy + (dy / dist) * maxDist)
      this.direction = { x: dx / dist, y: dy / dist }
    } else if (dist > 10) {
      this._joyThumb.setPosition(px, py)
      this.direction = { x: dx / dist, y: dy / dist }
    } else {
      this.direction = { x: 0, y: 0 }
    }
  }

  get isEnabled () {
    return this._enabled
  }
}
