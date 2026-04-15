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
    // Controls live in the bottom 35% of the screen
    const controlsTop = Math.floor(h * 0.65)
    const controlsH = h - controlsTop
    const controlsMidY = controlsTop + controlsH / 2
    return {
      joystick: { x: 120, y: controlsMidY },
      attack: { x: w - 100, y: controlsMidY },
      weapon: { x: w - 100, y: controlsMidY - 70 },
      pause: { x: w - 50, y: controlsTop + 30 },
      save: { x: w - 120, y: controlsTop + 30 },
      controlsTop,
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
    this._joyThumb.fillStyle(0x88aadd, 0.8)
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

    // Pause button (top-right)
    this._pauseGfx = this.scene.add.graphics().setScrollFactor(0).setDepth(200)
    this._pauseLabel = this.scene.add.text(0, 0, '⏸', {
      fontSize: '28px', color: '#ffffff'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201)

    // Save button (top-right, left of pause)
    this._saveGfx = this.scene.add.graphics().setScrollFactor(0).setDepth(200)
    this._saveLabel = this.scene.add.text(0, 0, '💾', {
      fontSize: '24px', color: '#ffffff'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201)

    // Draw and position
    this._reposition()

    // Input — use scene-wide pointer events for reliability
    this.scene.input.addPointer(1) // support 2 simultaneous touches

    this.scene.input.on('pointerdown', (pointer) => {
      const lay = this._getLayout()

      // Check pause button (top-right)
      const dpause = Math.sqrt((pointer.x - lay.pause.x) ** 2 + (pointer.y - lay.pause.y) ** 2)
      if (dpause <= 30) {
        if (this.scene._pauseGame) this.scene._pauseGame()
        return
      }

      // Check save button (top-right)
      const dsave = Math.sqrt((pointer.x - lay.save.x) ** 2 + (pointer.y - lay.save.y) ** 2)
      if (dsave <= 30) {
        if (this.scene._quicksave) this.scene._quicksave()
        return
      }

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
    this._joyBase.fillStyle(0x4466aa, 0.4)
    this._joyBase.fillCircle(lay.joystick.x, lay.joystick.y, R)
    this._joyBase.lineStyle(2, 0x88aadd, 0.8)
    this._joyBase.strokeCircle(lay.joystick.x, lay.joystick.y, R)

    // Reset thumb position
    this._joyThumb.setPosition(lay.joystick.x, lay.joystick.y)

    // Redraw attack button
    this._atkGfx.clear()
    this._atkGfx.fillStyle(0xcc2222, 0.6)
    this._atkGfx.fillCircle(lay.attack.x, lay.attack.y, 40)
    this._atkGfx.lineStyle(2, 0xff4444, 0.9)
    this._atkGfx.strokeCircle(lay.attack.x, lay.attack.y, 40)
    this._atkLabel.setPosition(lay.attack.x, lay.attack.y)

    // Redraw weapon button
    this._wpnGfx.clear()
    this._wpnGfx.fillStyle(0x4466aa, 0.5)
    this._wpnGfx.fillCircle(lay.weapon.x, lay.weapon.y, 30)
    this._wpnGfx.lineStyle(2, 0x88aadd, 0.8)
    this._wpnGfx.strokeCircle(lay.weapon.x, lay.weapon.y, 30)
    this._wpnLabel.setPosition(lay.weapon.x, lay.weapon.y)

    // Redraw pause button
    this._pauseGfx.clear()
    this._pauseGfx.fillStyle(0x555555, 0.6)
    this._pauseGfx.fillCircle(lay.pause.x, lay.pause.y, 25)
    this._pauseGfx.lineStyle(2, 0xffffff, 0.7)
    this._pauseGfx.strokeCircle(lay.pause.x, lay.pause.y, 25)
    this._pauseLabel.setPosition(lay.pause.x, lay.pause.y)

    // Redraw save button
    this._saveGfx.clear()
    this._saveGfx.fillStyle(0x555555, 0.6)
    this._saveGfx.fillCircle(lay.save.x, lay.save.y, 25)
    this._saveGfx.lineStyle(2, 0xffffff, 0.7)
    this._saveGfx.strokeCircle(lay.save.x, lay.save.y, 25)
    this._saveLabel.setPosition(lay.save.x, lay.save.y)
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

  destroy () {
    if (this.scene?.scale) {
      this.scene.scale.off('resize')
    }
  }
}
