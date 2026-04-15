import Enemy from './Enemy.js'

const ATTACK_RANGE = 200
const BODY_SIZE = 48          // 1 cuerpo
const GAS_DAMAGE_PER_SEC = 1
const GAS_DURATION = 3000     // 3 seconds area effect
const GAS_COOLDOWN = 5000     // 5 seconds between shots
const VISIBILITY_REDUCTION = 0.5

/**
 * MorsaLanzaGas — Walrus that launches gas clouds.
 * 25 HP, slow speed. Gas is launched toward target, travels 1 cuerpo,
 * then expands from 1×1 → 2×2 → 3×3 cuerpos over 3s, then fades.
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

    // Vehicles: no extra scale (96×96 = 2 cuerpos)
    if (this.setScale) this.setScale(1)

    if (this.body?.setSize) {
      this.body.setSize(48, 40)
      this.body.setOffset(24, 28)
    }

    this._gasZones = []
    this._lastDirection = 'down'
  }

  update (delta) {
    if (this.isDead || !this.active) return

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

    const dx = this.target.x - this.x
    const dy = this.target.y - this.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist > ATTACK_RANGE * 0.9) {
      if (dist > 0) {
        this.setVelocity((dx / dist) * this.speed, (dy / dist) * this.speed)
      }
    } else {
      this.setVelocity((dx / dist) * this.speed * 0.2, (dy / dist) * this.speed * 0.2)
    }

    // Animation
    const vx = this.body?.velocity?.x ?? 0
    const vy = this.body?.velocity?.y ?? 0
    if (Math.abs(vx) > 1 || Math.abs(vy) > 1) {
      this._lastDirection = Math.abs(vy) >= Math.abs(vx)
        ? (vy < 0 ? 'up' : 'down')
        : (vx < 0 ? 'left' : 'right')
      const moveKey = `${this.texture.key}_move_${this._lastDirection}`
      if (this.scene?.anims?.exists(moveKey)) this.play(moveKey, true)
    }

    this._applySeparation()

    if (dist <= ATTACK_RANGE && this.canAttack()) {
      this._fireGas()
    }

    this._updateGasZones(delta)
  }

  /**
   * Launch gas cloud: travels 1 cuerpo from morsa edge in facing direction,
   * then becomes an expanding area effect.
   */
  _fireGas () {
    if (!this.scene) return

    const dirVec = {
      up: { x: 0, y: -1 },
      down: { x: 0, y: 1 },
      left: { x: -1, y: 0 },
      right: { x: 1, y: 0 }
    }
    const d = dirVec[this._lastDirection] || dirVec.down

    // Launch point: morsa edge (48px) + 1 cuerpo travel (48px)
    const launchX = this.x + d.x * BODY_SIZE
    const landX = this.x + d.x * (BODY_SIZE * 2)
    const launchY = this.y + d.y * BODY_SIZE
    const landY = this.y + d.y * (BODY_SIZE * 2)

    const zone = {
      x: landX,
      y: landY,
      phase: 'travel',    // travel → expand → fade
      elapsed: 0,
      damageTimer: 0,
      radius: BODY_SIZE / 2,
      graphics: null,
      sprite: null
    }

    // Visual: use efecGas sprite if available, else graphics
    if (this.scene.add?.sprite && this.scene.anims?.exists('efecGas')) {
      const spr = this.scene.add.sprite(launchX, launchY, 'efecGas')
      spr.setDepth(4)
      spr.setScale(0.5)
      spr.play('efecGas')
      zone.sprite = spr

      // Animate travel: move from launch to land point
      if (this.scene.tweens) {
        this.scene.tweens.add({
          targets: spr,
          x: landX,
          y: landY,
          duration: 300,
          onComplete: () => { zone.phase = 'expand' }
        })
      } else {
        spr.setPosition(landX, landY)
        zone.phase = 'expand'
      }
    } else if (this.scene.add?.graphics) {
      const g = this.scene.add.graphics()
      g.setDepth(4)
      zone.graphics = g
      zone.phase = 'expand'
    }

    this._gasZones.push(zone)
  }

  /**
   * Update gas zones: expand 1→2→3 cuerpos over duration, apply damage, then fade.
   */
  _updateGasZones (delta) {
    if (!this.scene) return

    const allTargets = this._getTargets()

    for (let i = this._gasZones.length - 1; i >= 0; i--) {
      const zone = this._gasZones[i]

      if (zone.phase === 'travel') continue // still flying

      zone.elapsed += delta
      zone.damageTimer += delta

      // Expansion: 0→1s = 1 cuerpo, 1→2s = 2 cuerpos, 2→3s = 3 cuerpos
      const progress = Math.min(1, zone.elapsed / GAS_DURATION)
      const sizeMult = 1 + progress * 2 // 1→3
      zone.radius = (BODY_SIZE / 2) * sizeMult

      // Update visual
      if (zone.sprite) {
        zone.sprite.setScale(sizeMult * 0.5)
        zone.sprite.setPosition(zone.x, zone.y)
        // Fade in last 500ms
        if (zone.elapsed > GAS_DURATION - 500) {
          zone.sprite.setAlpha(Math.max(0, (GAS_DURATION - zone.elapsed) / 500))
        }
      } else if (zone.graphics) {
        const alpha = zone.elapsed > GAS_DURATION - 500
          ? Math.max(0.05, (GAS_DURATION - zone.elapsed) / 500) * 0.3
          : 0.3
        zone.graphics.clear()
        zone.graphics.fillStyle(0x88aa44, alpha)
        zone.graphics.fillCircle(zone.x, zone.y, zone.radius)
      }

      // Damage every second
      if (zone.damageTimer >= 1000) {
        zone.damageTimer = 0
        for (const t of allTargets) {
          if (!t.active) continue
          const dx = t.x - zone.x
          const dy = t.y - zone.y
          if (dx * dx + dy * dy <= zone.radius * zone.radius) {
            if (t.takeDamage) t.takeDamage(GAS_DAMAGE_PER_SEC)
            // Reduce player visibility
            if (t === this.scene.player && this.scene.cameras?.main?.setAlpha) {
              this.scene.cameras.main.setAlpha(VISIBILITY_REDUCTION)
              if (this.scene.time) {
                this.scene.time.delayedCall(1500, () => {
                  if (this.scene?.cameras?.main?.setAlpha) this.scene.cameras.main.setAlpha(1)
                })
              }
            }
          }
        }
      }

      // Expired
      if (zone.elapsed >= GAS_DURATION) {
        if (zone.sprite?.destroy) zone.sprite.destroy()
        if (zone.graphics?.destroy) zone.graphics.destroy()
        this._gasZones.splice(i, 1)
      }
    }
  }

  destroy () {
    for (const zone of this._gasZones) {
      if (zone.sprite?.destroy) zone.sprite.destroy()
      if (zone.graphics?.destroy) zone.graphics.destroy()
    }
    this._gasZones = []
    super.destroy()
  }
}
