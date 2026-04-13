import Enemy from './Enemy.js'

const ATTACK_RANGE = 250
const CONE_HALF_ANGLE = Math.PI / 6 // 30 degree cone
const PUSH_FORCE = 150
const SLOW_MULTIPLIER = 0.5
const SLOW_DURATION = 1500
const CHORRO_COOLDOWN = 2000

/**
 * CamiónLanzaAgua — Water cannon truck.
 * 30 HP, slow speed, frontal cone ChorroDAgua that pushes and slows targets.
 * Uses simplified steering instead of full A* pathfinding.
 */
export default class CamionLanzaAgua extends Enemy {
  constructor (scene, x, y) {
    super(scene, x, y, 'camionAgua', {
      hp: 30,
      speed: 60,
      damage: 0,
      attackCooldown: CHORRO_COOLDOWN,
      type: 'agua'
    })

    // Vehicles use 96×96 frames — adjust body for larger sprite
    if (this.body?.setSize) {
      this.body.setSize(48, 32)
      this.body.setOffset(24, 56)
    }

    this._role = 'blocker'
    this._chorroActive = false
    this._chorroGraphics = null
    this._facingAngle = 0
    this._lastDirection = 'down'
  }

  update (delta) {
    // Use simplified steering for vehicles instead of full A*
    if (this.isDead || !this.active) return

    // Occlusion: hide visually only
    if (this._isOccluded()) {
      if (this.visible !== false && this.setVisible) this.setVisible(false)
    } else {
      if (this.visible === false && this.setVisible) this.setVisible(true)
    }

    const targets = this._getTargets()
    this.target = this.findNearestTarget(targets)

    if (!this.target) {
      this.setVelocity(0, 0)
      return
    }

    // Simple steering toward target
    const dx = this.target.x - this.x
    const dy = this.target.y - this.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    this._facingAngle = Math.atan2(dy, dx)

    if (dist > ATTACK_RANGE * 0.8) {
      // Move toward target
      if (dist > 0) {
        this.setVelocity(
          (dx / dist) * this.speed,
          (dy / dist) * this.speed
        )
      }
    } else {
      // In range — slow down and attack
      this.setVelocity(
        (dx / dist) * this.speed * 0.3,
        (dy / dist) * this.speed * 0.3
      )
    }

    // Direction-based animation for vehicle
    const vx = this.body?.velocity?.x ?? 0
    const vy = this.body?.velocity?.y ?? 0
    const textureKey = this.texture.key

    if (Math.abs(vx) > 1 || Math.abs(vy) > 1) {
      if (Math.abs(vy) >= Math.abs(vx)) {
        this._lastDirection = vy < 0 ? 'up' : 'down'
      } else {
        this._lastDirection = vx < 0 ? 'left' : 'right'
      }
      const moveKey = `${textureKey}_move_${this._lastDirection}`
      if (this.scene?.anims?.exists(moveKey)) {
        this.play(moveKey, true)
      }
    }

    // Apply separation from other enemies
    this._applySeparation()

    // Fire ChorroDAgua
    if (dist <= ATTACK_RANGE && this.canAttack()) {
      this._fireChorro()
    }
  }

  /**
   * Fire the water cannon in a frontal cone, pushing and slowing targets.
   */
  _fireChorro () {
    if (!this.scene) return

    // Find all targets in the cone
    const allTargets = this._getTargets()

    for (const t of allTargets) {
      if (!t.active) continue

      const dx = t.x - this.x
      const dy = t.y - this.y
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist > ATTACK_RANGE || dist === 0) continue

      // Check if target is within the cone angle
      const angleToTarget = Math.atan2(dy, dx)
      let angleDiff = angleToTarget - this._facingAngle
      // Normalize to [-PI, PI]
      while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI
      while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI

      if (Math.abs(angleDiff) <= CONE_HALF_ANGLE) {
        // Push target away
        if (t.setVelocity) {
          t.setVelocity(
            (dx / dist) * PUSH_FORCE,
            (dy / dist) * PUSH_FORCE
          )
        }

        // Slow target
        if (t.speed !== undefined) {
          const originalSpeed = t._baseSpeed ?? t.speed
          t._baseSpeed = originalSpeed
          t.speed = originalSpeed * SLOW_MULTIPLIER

          if (this.scene.time) {
            this.scene.time.delayedCall(SLOW_DURATION, () => {
              if (t.active && t._baseSpeed !== undefined) {
                t.speed = t._baseSpeed
                delete t._baseSpeed
              }
            })
          }
        }
      }
    }

    // Visual effect for the water jet
    this._showChorroEffect()
  }

  /**
   * Show a directional water jet sprite effect.
   */
  _showChorroEffect () {
    if (!this.scene || !this.scene.add) return

    const dir = this._lastDirection || 'right'
    const animKey = `efecChorro_${dir}`

    // Offset the effect in the facing direction
    const offsets = {
      up: { x: 0, y: -80 },
      down: { x: 0, y: 80 },
      left: { x: -80, y: 0 },
      right: { x: 80, y: 0 }
    }
    const off = offsets[dir] || offsets.right

    const sprite = this.scene.add.sprite(this.x + off.x, this.y + off.y, 'efecChorro')
    sprite.setDepth(5)
    sprite.setScale(2)

    try {
      if (this.scene.anims?.exists(animKey)) {
        sprite.play(animKey)
      } else if (this.scene.anims?.exists('efecChorro')) {
        sprite.play('efecChorro')
      }
    } catch (e) {
      // Animation frames may not exist for placeholder textures
    }

    // Fade out and destroy
    if (this.scene.tweens) {
      this.scene.tweens.add({
        targets: sprite,
        alpha: 0,
        duration: 500,
        onComplete: () => sprite.destroy()
      })
    } else if (this.scene.time) {
      this.scene.time.delayedCall(500, () => sprite.destroy())
    }
  }
}
