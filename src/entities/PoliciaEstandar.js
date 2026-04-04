import Enemy from './Enemy.js'
import EventBus from '../EventBus.js'

const BASE_SPEED = 120
const DETECTION_RANGE = 480   // 10 cuerpos (10 × 48px)
const MELEE_RANGE = 48        // 1 cuerpo
const CHASE_SPEED_MULT = 1.10 // +10% al detectar escolar
const AGGRO_SPEED_MULT = 1.15 // +15% si le lanzan piedras
const AGGRO_DURATION = 5000   // aggro por piedra dura 5s
const PATROL_SPEED = BASE_SPEED * 0.7

/**
 * States: 'patrol' → 'chase' → 'attack'
 * - patrol: camina de lado a lado o arriba/abajo
 * - chase: detectó escolar a ≤10 cuerpos, persigue con pathfinding
 * - attack: a ≤1 cuerpo, golpe melee con bastón
 */
export default class PoliciaEstandar extends Enemy {
  constructor (scene, x, y) {
    super(scene, x, y, 'policiaEstandar', {
      hp: 10,
      speed: PATROL_SPEED,
      damage: 1,
      attackCooldown: 1000,
      type: 'estandar'
    })

    // State machine
    this._state = 'patrol'
    this._baseSpeed = BASE_SPEED
    this._isAttacking = false

    // Patrol config — patrol toward center of map from spawn point
    this._patrolAxis = Math.random() < 0.5 ? 'horizontal' : 'vertical'
    this._patrolDirection = 1
    this._patrolTimer = 0
    this._patrolFlipInterval = 9000 + Math.random() * 12000

    // Start patrol direction toward map center
    if (this.scene?.mapManager?.getMapDimensions) {
      const { width, height } = this.scene.mapManager.getMapDimensions()
      if (this._patrolAxis === 'horizontal') {
        this._patrolDirection = x < width / 2 ? 1 : -1
      } else {
        this._patrolDirection = y < height / 2 ? 1 : -1
      }
    } // flip every 3-7s

    // Aggro from projectiles
    this._isAggroed = false
    this._aggroTimer = 0

    // Listen for projectile events to increase aggro
    this._onProjectileFired = (data) => {
      if (!this.isDead && data) {
        const dx = (data.x || 0) - this.x
        const dy = (data.y || 0) - this.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        // Only aggro if the shot was within detection range
        if (dist <= DETECTION_RANGE) {
          this._isAggroed = true
          this._aggroTimer = AGGRO_DURATION
        }
      }
    }
    EventBus.on('projectile:fired', this._onProjectileFired)
  }

  /**
   * Main update — state machine: patrol → chase → attack.
   * Overrides Enemy.update() completely for custom behavior.
   */
  update (delta) {
    if (this.isDead || !this.active) return

    // Occlusion: only skip pathfinding/AI, but keep patrol movement
    // so enemies don't pile up at edges
    const occluded = this._isOccluded()

    // Decrement aggro timer
    if (this._aggroTimer > 0) {
      this._aggroTimer -= delta
      if (this._aggroTimer <= 0) {
        this._isAggroed = false
        this._aggroTimer = 0
      }
    }

    // Find nearest target (player or ally)
    const targets = this._getTargets()
    const nearest = this.findNearestTarget(targets)
    this.target = nearest

    // Calculate distance to nearest target
    let distToTarget = Infinity
    if (nearest) {
      const dx = nearest.x - this.x
      const dy = nearest.y - this.y
      distToTarget = Math.sqrt(dx * dx + dy * dy)
    }

    // State transitions
    if (occluded) {
      // When occluded: just patrol, skip expensive pathfinding
      this._state = 'patrol'
      if (this.visible !== false && this.setVisible) this.setVisible(false)
    } else {
      if (this.visible === false && this.setVisible) this.setVisible(true)
      // Don't change state while attack animation is playing
      if (this._isAttacking) {
        this._state = 'attack'
      } else if (nearest && distToTarget <= MELEE_RANGE) {
        this._state = 'attack'
      } else if (nearest && distToTarget <= DETECTION_RANGE) {
        this._state = 'chase'
      } else {
        this._state = 'patrol'
      }
    }

    // Execute current state
    switch (this._state) {
      case 'patrol':
        this._doPatrol(delta)
        break
      case 'chase':
        this._doChase(delta)
        break
      case 'attack':
        this._doAttack()
        break
    }

    // Apply separation from other enemies
    this._applySeparation()
  }

  /**
   * Patrol: walk back and forth across the map.
   */
  _doPatrol (delta) {
    this.speed = PATROL_SPEED
    this._patrolTimer += delta

    // Flip direction periodically
    if (this._patrolTimer >= this._patrolFlipInterval) {
      this._patrolTimer = 0
      this._patrolDirection *= -1
      this._patrolFlipInterval = 9000 + Math.random() * 12000
    }

    if (this._patrolAxis === 'horizontal') {
      this.setVelocity(PATROL_SPEED * this._patrolDirection, 0)
      this._lastDirection = this._patrolDirection > 0 ? 'right' : 'left'
    } else {
      this.setVelocity(0, PATROL_SPEED * this._patrolDirection)
      this._lastDirection = this._patrolDirection > 0 ? 'down' : 'up'
    }

    // Play walk animation
    const walkKey = `policiaEstandar_walk_${this._lastDirection}`
    if (this.scene?.anims?.exists(walkKey)) {
      this.play(walkKey, true)
    }

    // Flip at map edges and clamp position
    if (this.scene?.mapManager) {
      const { width, height } = this.scene.mapManager.getMapDimensions()
      const margin = 96
      if (this.x <= margin) {
        this.x = margin
        if (this._patrolAxis === 'horizontal') this._patrolDirection = 1
      }
      if (this.x >= width - margin) {
        this.x = width - margin
        if (this._patrolAxis === 'horizontal') this._patrolDirection = -1
      }
      if (this.y <= margin) {
        this.y = margin
        if (this._patrolAxis === 'vertical') this._patrolDirection = 1
      }
      if (this.y >= height - margin) {
        this.y = height - margin
        if (this._patrolAxis === 'vertical') this._patrolDirection = -1
      }
    }
  }

  /**
   * Chase: pursue target with pathfinding at increased speed.
   */
  _doChase (delta) {
    // Speed depends on aggro state
    this.speed = this._isAggroed
      ? this._baseSpeed * AGGRO_SPEED_MULT
      : this._baseSpeed * CHASE_SPEED_MULT

    // Use pathfinding from Enemy base class
    this._pathTimer += delta
    if (this._pathTimer >= 500) {
      this._pathTimer = 0
      this._requestPath()
    }

    this._moveTowardTarget()
  }

  /**
   * Attack: melee strike when within 1 body length.
   */
  _doAttack () {
    this.setVelocity(0, 0)

    if (!this.target) return

    // Don't interrupt an ongoing attack animation
    if (this._isAttacking) return

    // Face the target
    const dx = this.target.x - this.x
    const dy = this.target.y - this.y
    if (Math.abs(dy) >= Math.abs(dx)) {
      this._lastDirection = dy < 0 ? 'up' : 'down'
    } else {
      this._lastDirection = dx < 0 ? 'left' : 'right'
    }

    if (this.canAttack()) {
      this._isAttacking = true

      // Play baton strike animation (wind-up → strike → return)
      const attackKey = `policiaEstandar_attack_${this._lastDirection}`
      if (this.scene?.anims?.exists(attackKey)) {
        this.play(attackKey)

        // Deal damage on the strike frame (frame index 2 = impact)
        const onFrame = (anim, frame) => {
          if (frame.index === 2 && this.target?.takeDamage) {
            this.target.takeDamage(this.damage, this.x, this.y)
          }
        }
        this.on('animationupdate', onFrame)

        this.once('animationcomplete', () => {
          this._isAttacking = false
          this.off('animationupdate', onFrame)
        })
      } else {
        // Fallback: no animation, apply damage directly
        this._isAttacking = false
        if (this.target.takeDamage) {
          this.target.takeDamage(this.damage, this.x, this.y)
        }
      }
    } else {
      // Idle while waiting for cooldown
      const idleKey = `policiaEstandar_idle_${this._lastDirection}`
      if (this.scene?.anims?.exists(idleKey)) {
        this.play(idleKey, true)
      }
    }
  }

  /**
   * Clean up EventBus listener on destroy.
   */
  destroy () {
    EventBus.off('projectile:fired', this._onProjectileFired)
    super.destroy()
  }
}
