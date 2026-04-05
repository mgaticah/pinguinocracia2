import Enemy from './Enemy.js'

const ATTACK_RANGE = 200
const GAS_RADIUS = 80
const GAS_DAMAGE_PER_SEC = 1
const GAS_DURATION = 5000
const GAS_COOLDOWN = 3000
const VISIBILITY_REDUCTION = 0.5

/**
 * CamiónLanzaGas — Gas truck that creates ZonaDeGas areas.
 * 25 HP, slow speed, circular gas zones that deal gradual damage + reduce visibility.
 * Uses simplified steering instead of full A* pathfinding.
 */
export default class CamionLanzaGas extends Enemy {
  constructor (scene, x, y) {
    super(scene, x, y, 'camionGas', {
      hp: 25,
      speed: 60,
      damage: 0,
      attackCooldown: GAS_COOLDOWN,
      type: 'gas'
    })

    // Vehicles use 96×96 frames — adjust body for larger sprite
    if (this.body?.setSize) {
      this.body.setSize(48, 32)
      this.body.setOffset(24, 56)
    }

    this._gasZones = []
    this._lastDirection = 'down'
  }

  update (delta) {
    // Use simplified steering for vehicles
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

    if (dist > ATTACK_RANGE * 0.9) {
      // Move toward target
      if (dist > 0) {
        this.setVelocity(
          (dx / dist) * this.speed,
          (dy / dist) * this.speed
        )
      }
    } else {
      // In range — slow down
      this.setVelocity(
        (dx / dist) * this.speed * 0.2,
        (dy / dist) * this.speed * 0.2
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

    // Fire gas cloud
    if (dist <= ATTACK_RANGE && this.canAttack()) {
      this._fireGas()
    }

    // Update active gas zones
    this._updateGasZones(delta)
  }

  /**
   * Create a ZonaDeGas at the target's position.
   */
  _fireGas () {
    if (!this.scene || !this.target) return

    const gasX = this.target.x
    const gasY = this.target.y

    const zone = {
      x: gasX,
      y: gasY,
      radius: GAS_RADIUS,
      remaining: GAS_DURATION,
      graphics: null,
      damageTimer: 0
    }

    // Visual effect
    if (this.scene.add) {
      const g = this.scene.add.graphics()
      g.fillStyle(0x88aa44, 0.3)
      g.fillCircle(gasX, gasY, GAS_RADIUS)
      g.setDepth(4)
      zone.graphics = g
    }

    this._gasZones.push(zone)
  }

  /**
   * Update all active gas zones — apply damage and reduce visibility.
   * @param {number} delta
   */
  _updateGasZones (delta) {
    if (!this.scene) return

    const allTargets = this._getTargets()

    for (let i = this._gasZones.length - 1; i >= 0; i--) {
      const zone = this._gasZones[i]
      zone.remaining -= delta
      zone.damageTimer += delta

      if (zone.remaining <= 0) {
        // Zone expired
        if (zone.graphics) zone.graphics.destroy()
        this._gasZones.splice(i, 1)
        continue
      }

      // Apply damage every second to targets inside the zone
      if (zone.damageTimer >= 1000) {
        zone.damageTimer = 0

        for (const t of allTargets) {
          if (!t.active) continue

          const dx = t.x - zone.x
          const dy = t.y - zone.y
          const dist = Math.sqrt(dx * dx + dy * dy)

          if (dist <= zone.radius) {
            // Gradual damage
            if (t.takeDamage) {
              t.takeDamage(GAS_DAMAGE_PER_SEC)
            }

            // Reduce visibility (apply camera effect on player)
            if (t === this.scene.player && this.scene.cameras) {
              const cam = this.scene.cameras.main
              if (cam && cam.setAlpha) {
                cam.setAlpha(VISIBILITY_REDUCTION)
                if (this.scene.time) {
                  this.scene.time.delayedCall(1500, () => {
                    if (cam.setAlpha) cam.setAlpha(1)
                  })
                }
              }
            }
          }
        }
      }

      // Fade out the gas zone visual as it expires
      if (zone.graphics) {
        const alpha = Math.max(0.1, zone.remaining / GAS_DURATION) * 0.3
        zone.graphics.clear()
        zone.graphics.fillStyle(0x88aa44, alpha)
        zone.graphics.fillCircle(zone.x, zone.y, zone.radius)
      }
    }
  }

  /**
   * Clean up gas zones when this enemy is destroyed.
   */
  destroy () {
    for (const zone of this._gasZones) {
      if (zone.graphics) zone.graphics.destroy()
    }
    this._gasZones = []
    super.destroy()
  }
}
