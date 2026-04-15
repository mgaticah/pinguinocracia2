import Enemy from './Enemy.js'

const ATTACK_RANGE = 192 // 4 cuerpos (2 orca + 3 chorro - overlap)
const CONE_HALF_ANGLE = Math.PI / 6 // 30 degree cone
const PUSH_FORCE = 150
const SLOW_MULTIPLIER = 0.5
const SLOW_DURATION = 1500
const CHORRO_COOLDOWN = 5000

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

    // Vehicles use 96×96 frames — no extra scale (already 2 cuerpos)
    if (this.setScale) this.setScale(1)

    // Body covers center mass for projectile hits
    if (this.body?.setSize) {
      this.body.setSize(48, 40)
      this.body.setOffset(24, 28)
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
        // Deal water damage
        if (t.takeDamage) {
          t.takeDamage(2, this.x, this.y)
        }

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
   * Show a directional water jet that grows from 1→2→3 cuerpos then shrinks back.
   * Total duration ~1.5s: grow 0.6s, hold 0.3s, shrink 0.6s.
   */
  _showChorroEffect () {
    if (!this.scene?.add?.sprite) return

    const dir = this._lastDirection || 'right'
    const animKey = `efecChorro_${dir}`
    const edgeOffset = 48 // orca edge from center

    // Direction unit vectors
    const dirVec = {
      up: { x: 0, y: -1 },
      down: { x: 0, y: 1 },
      left: { x: -1, y: 0 },
      right: { x: 1, y: 0 }
    }
    const d = dirVec[dir] || dirVec.right

    // Create sprite at orca edge, starting small
    const startX = this.x + d.x * edgeOffset
    const startY = this.y + d.y * edgeOffset
    const sprite = this.scene.add.sprite(startX, startY, 'efecChorro')
    sprite.setDepth(5)
    sprite.setScale(0.5) // start small (≈1 cuerpo)

    try {
      if (this.scene.anims?.exists(animKey)) sprite.play(animKey)
      else if (this.scene.anims?.exists('efecChorro')) sprite.play('efecChorro')
    } catch (_) {}

    if (!this.scene.tweens) {
      if (this.scene.time) this.scene.time.delayedCall(1500, () => { if (sprite?.destroy) sprite.destroy() })
      return
    }

    // Phase 1: grow from 1 cuerpo to 3 cuerpos (0.6s)
    this.scene.tweens.add({
      targets: sprite,
      scaleX: 2,
      scaleY: 2,
      x: this.x + d.x * (edgeOffset + 72),
      y: this.y + d.y * (edgeOffset + 72),
      duration: 600,
      ease: 'Quad.easeOut',
      onComplete: () => {
        // Phase 2: hold at max (0.3s), then shrink (0.6s)
        if (!this.scene?.tweens) { if (sprite?.destroy) sprite.destroy(); return }
        this.scene.tweens.add({
          targets: sprite,
          scaleX: 0.5,
          scaleY: 0.5,
          x: startX,
          y: startY,
          alpha: 0,
          delay: 300,
          duration: 600,
          ease: 'Quad.easeIn',
          onComplete: () => { if (sprite?.destroy) sprite.destroy() }
        })
      }
    })
  }
}
