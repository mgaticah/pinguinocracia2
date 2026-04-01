/**
 * TouchControls — Virtual joystick + attack button for mobile.
 * Only visible on touch-capable devices.
 */
export default class TouchControls {
  constructor (scene) {
    this.scene = scene
    this._joystickBase = null
    this._joystickThumb = null
    this._attackBtn = null
    this._weaponBtn = null
    this._dragPointer = null
    this._joystickOrigin = { x: 0, y: 0 }
    this.direction = { x: 0, y: 0 }
    this.attackPressed = false
    this._enabled = false

    if (scene.sys?.game?.device?.input?.touch) {
      this._enabled = true
      this._create()
    }
  }

  _create () {
    const { width, height } = this.scene.cameras.main
    const JOYSTICK_X = 120
    const JOYSTICK_Y = height - 120
    const JOYSTICK_RADIUS = 50
    const THUMB_RADIUS = 25

    // Joystick base (semi-transparent circle)
    this._joystickBase = this.scene.add.graphics()
    this._joystickBase.fillStyle(0x1a3a6b, 0.3)
    this._joystickBase.fillCircle(JOYSTICK_X, JOYSTICK_Y, JOYSTICK_RADIUS)
    this._joystickBase.lineStyle(2, 0x1a3a6b, 0.5)
    this._joystickBase.strokeCircle(JOYSTICK_X, JOYSTICK_Y, JOYSTICK_RADIUS)
    this._joystickBase.setScrollFactor(0)
    this._joystickBase.setDepth(200)

    // Joystick thumb
    this._joystickThumb = this.scene.add.graphics()
    this._joystickThumb.fillStyle(0x1a3a6b, 0.6)
    this._joystickThumb.fillCircle(0, 0, THUMB_RADIUS)
    this._joystickThumb.setPosition(JOYSTICK_X, JOYSTICK_Y)
    this._joystickThumb.setScrollFactor(0)
    this._joystickThumb.setDepth(201)

    this._joystickOrigin = { x: JOYSTICK_X, y: JOYSTICK_Y }
    this._joystickRadius = JOYSTICK_RADIUS

    // Attack button (right side)
    const ATK_X = width - 100
    const ATK_Y = height - 120
    this._attackBtn = this.scene.add.graphics()
    this._attackBtn.fillStyle(0xcc2222, 0.4)
    this._attackBtn.fillCircle(ATK_X, ATK_Y, 40)
    this._attackBtn.lineStyle(2, 0xcc2222, 0.6)
    this._attackBtn.strokeCircle(ATK_X, ATK_Y, 40)
    this._attackBtn.setScrollFactor(0)
    this._attackBtn.setDepth(200)

    const atkLabel = this.scene.add.text(ATK_X, ATK_Y, '⚔', {
      fontSize: '32px', color: '#ffffff'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201)

    // Weapon toggle button (above attack)
    const WPN_X = width - 100
    const WPN_Y = height - 210
    this._weaponBtn = this.scene.add.graphics()
    this._weaponBtn.fillStyle(0x1a3a6b, 0.4)
    this._weaponBtn.fillCircle(WPN_X, WPN_Y, 30)
    this._weaponBtn.setScrollFactor(0)
    this._weaponBtn.setDepth(200)

    const wpnLabel = this.scene.add.text(WPN_X, WPN_Y, 'Q', {
      fontSize: '20px', fontFamily: 'monospace', color: '#ffffff'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201)

    // Touch zones
    const leftZone = this.scene.add.zone(width / 4, height / 2, width / 2, height)
      .setScrollFactor(0).setDepth(199).setInteractive()
    const rightZone = this.scene.add.zone(width * 3 / 4, height / 2, width / 2, height)
      .setScrollFactor(0).setDepth(199).setInteractive()

    // Joystick drag on left half
    leftZone.on('pointerdown', (pointer) => {
      this._dragPointer = pointer.id
      this._updateJoystick(pointer.x, pointer.y)
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
        this._joystickThumb.setPosition(this._joystickOrigin.x, this._joystickOrigin.y)
      }
    })

    // Attack on right half tap
    rightZone.on('pointerdown', (pointer) => {
      // Check if it's the attack button area
      const dxAtk = pointer.x - ATK_X
      const dyAtk = pointer.y - ATK_Y
      if (Math.sqrt(dxAtk * dxAtk + dyAtk * dyAtk) <= 50) {
        this.attackPressed = true
        return
      }
      // Check weapon toggle
      const dxWpn = pointer.x - WPN_X
      const dyWpn = pointer.y - WPN_Y
      if (Math.sqrt(dxWpn * dxWpn + dyWpn * dyWpn) <= 40) {
        if (this.scene.player) this.scene.player.switchWeapon()
        return
      }
      // Tap anywhere on right = attack
      this.attackPressed = true
    })

    rightZone.on('pointerup', () => {
      this.attackPressed = false
    })
  }

  _updateJoystick (px, py) {
    const dx = px - this._joystickOrigin.x
    const dy = py - this._joystickOrigin.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    const maxDist = this._joystickRadius

    if (dist > maxDist) {
      // Clamp to radius
      this._joystickThumb.setPosition(
        this._joystickOrigin.x + (dx / dist) * maxDist,
        this._joystickOrigin.y + (dy / dist) * maxDist
      )
      this.direction = { x: dx / dist, y: dy / dist }
    } else if (dist > 10) {
      // Dead zone of 10px
      this._joystickThumb.setPosition(px, py)
      this.direction = { x: dx / dist, y: dy / dist }
    } else {
      this.direction = { x: 0, y: 0 }
    }
  }

  get isEnabled () {
    return this._enabled
  }
}
