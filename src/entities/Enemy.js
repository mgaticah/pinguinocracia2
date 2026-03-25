import Phaser from 'phaser'
import EventBus from '../EventBus.js'
import EasyStar from 'easystarjs'

const TILE_SIZE = 48
const PATH_RECALC_INTERVAL = 500 // ms between path recalculations
const SEPARATION_RADIUS = 40
const SEPARATION_FORCE = 60

/**
 * Enemy — Base class for all enemy types.
 * Uses EasyStar.js A* pathfinding with straight-line fallback.
 */
export default class Enemy extends Phaser.Physics.Arcade.Sprite {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x
   * @param {number} y
   * @param {string} texture
   * @param {object} config - { hp, speed, damage, attackCooldown, type }
   */
  constructor (scene, x, y, texture, config = {}) {
    super(scene, x, y, texture)

    scene.add.existing(this)
    scene.physics.add.existing(this)

    // Scale up sprite for visibility
    if (this.setScale) this.setScale(2)

    this.hp = config.hp ?? 10
    this.maxHp = this.hp
    this.speed = config.speed ?? 120
    this.damage = config.damage ?? 1
    this.attackCooldown = config.attackCooldown ?? 1000
    this.enemyType = config.type ?? 'estandar'
    this.isDead = false
    this.target = null

    // Pathfinding state
    this._path = []
    this._pathIndex = 0
    this._pathTimer = 0
    this._lastAttackTime = 0
    this._lastDirection = 'down'

    // Points table for scoring
    this._pointsTable = {
      estandar: 10,
      montado: 20,
      agua: 50,
      gas: 40
    }

    // Set up EasyStar instance
    this._easystar = null
    this._initPathfinding()
  }

  /**
   * Initialize EasyStar.js pathfinding from the scene's MapManager grid.
   */
  _initPathfinding () {
    const grid = this._getWalkableGrid()
    if (!grid || grid.length === 0) return

    this._easystar = new EasyStar.js()
    this._easystar.setGrid(grid)
    this._easystar.setAcceptableTiles([0])
    this._easystar.enableDiagonals()
    this._easystar.enableCornerCutting()
  }

  /**
   * Get the walkable grid from the scene's MapManager.
   * @returns {number[][]|null}
   */
  _getWalkableGrid () {
    if (this.scene && this.scene.mapManager) {
      return this.scene.mapManager.getWalkableGrid()
    }
    return null
  }

  /**
   * Find the nearest alive target from an array of potential targets.
   * @param {Array} targets - Array of entities with x, y, isAlive/hp properties
   * @returns {object|null} The nearest alive target
   */
  findNearestTarget (targets) {
    if (!targets || targets.length === 0) return null

    let nearest = null
    let minDist = Infinity

    for (const t of targets) {
      // Skip dead targets
      const alive = t.isAlive !== undefined ? t.isAlive : (t.hp > 0)
      if (!alive) continue
      if (!t.active) continue

      const dx = t.x - this.x
      const dy = t.y - this.y
      const dist = dx * dx + dy * dy

      if (dist < minDist) {
        minDist = dist
        nearest = t
      }
    }

    return nearest
  }

  /**
   * Reduce HP by amount. If HP reaches 0, call die().
   * @param {number} amount
   */
  takeDamage (amount) {
    if (this.isDead || amount <= 0) return

    this.hp = Math.max(0, this.hp - amount)

    if (this.hp <= 0) {
      this.die()
    }
  }

  /**
   * Play death animation, emit enemy:killed event, then destroy.
   */
  die () {
    if (this.isDead) return
    this.isDead = true

    this.setVelocity(0, 0)

    const points = this._pointsTable[this.enemyType] ?? 10
    EventBus.emit('enemy:killed', { type: this.enemyType, points })

    // Play death animation if available, then destroy
    const deathKey = `${this.texture.key}_death`
    if (this.scene && this.scene.anims && this.scene.anims.exists(deathKey)) {
      this.play(deathKey)
      this.once('animationcomplete', () => {
        this.destroy()
      })
    } else {
      // Simple fade-out fallback
      if (this.scene && this.scene.tweens) {
        this.scene.tweens.add({
          targets: this,
          alpha: 0,
          duration: 300,
          onComplete: () => {
            this.destroy()
          }
        })
      } else {
        this.destroy()
      }
    }
  }

  /**
   * Main update loop — move toward target using pathfinding or straight line.
   * @param {number} delta - ms since last frame
   */
  update (delta) {
    if (this.isDead || !this.active) return

    // Build targets list from scene
    const targets = this._getTargets()
    this.target = this.findNearestTarget(targets)

    if (!this.target) {
      this.setVelocity(0, 0)
      return
    }

    // Recalculate path periodically
    this._pathTimer += delta
    if (this._pathTimer >= PATH_RECALC_INTERVAL) {
      this._pathTimer = 0
      this._requestPath()
    }

    // Move toward target
    this._moveTowardTarget(delta)

    // Apply separation from other enemies
    this._applySeparation()
  }

  /**
   * Gather potential targets (Player + Allies) from the scene.
   * @returns {Array}
   */
  _getTargets () {
    const targets = []
    if (this.scene && this.scene.player && this.scene.player.isAlive) {
      targets.push(this.scene.player)
    }
    if (this.scene && this.scene.allyGroup) {
      const allies = this.scene.allyGroup.getChildren()
      for (const ally of allies) {
        if (ally.active && ally.hp > 0) {
          targets.push(ally)
        }
      }
    }
    return targets
  }

  /**
   * Request a new path from EasyStar.
   */
  _requestPath () {
    if (!this._easystar || !this.target) return

    const startCol = Math.floor(this.x / TILE_SIZE)
    const startRow = Math.floor(this.y / TILE_SIZE)
    const endCol = Math.floor(this.target.x / TILE_SIZE)
    const endRow = Math.floor(this.target.y / TILE_SIZE)

    const grid = this._getWalkableGrid()
    if (!grid || grid.length === 0) return

    const maxRow = grid.length - 1
    const maxCol = grid[0].length - 1

    // Clamp to grid bounds
    const sr = Math.max(0, Math.min(maxRow, startRow))
    const sc = Math.max(0, Math.min(maxCol, startCol))
    const er = Math.max(0, Math.min(maxRow, endRow))
    const ec = Math.max(0, Math.min(maxCol, endCol))

    this._easystar.findPath(sc, sr, ec, er, (path) => {
      if (path && path.length > 1) {
        this._path = path
        this._pathIndex = 1 // skip current tile
      } else {
        // No path found — will use straight line fallback
        this._path = []
        this._pathIndex = 0
      }
    })

    this._easystar.calculate()
  }

  /**
   * Move toward the current target using path waypoints or straight line fallback.
   */
  _moveTowardTarget () {
    if (!this.target) return

    let targetX, targetY

    if (this._path.length > 0 && this._pathIndex < this._path.length) {
      // Follow A* path waypoint
      const waypoint = this._path[this._pathIndex]
      targetX = waypoint.x * TILE_SIZE + TILE_SIZE / 2
      targetY = waypoint.y * TILE_SIZE + TILE_SIZE / 2

      // Check if we reached the waypoint
      const dx = targetX - this.x
      const dy = targetY - this.y
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist < 8) {
        this._pathIndex++
        if (this._pathIndex >= this._path.length) {
          // Path complete, move straight to target
          targetX = this.target.x
          targetY = this.target.y
        } else {
          const next = this._path[this._pathIndex]
          targetX = next.x * TILE_SIZE + TILE_SIZE / 2
          targetY = next.y * TILE_SIZE + TILE_SIZE / 2
        }
      }
    } else {
      // Straight line fallback
      targetX = this.target.x
      targetY = this.target.y
    }

    const dx = targetX - this.x
    const dy = targetY - this.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist > 4) {
      this.setVelocity(
        (dx / dist) * this.speed,
        (dy / dist) * this.speed
      )
    } else {
      this.setVelocity(0, 0)
    }

    // Direction-based animation
    const vx = this.body?.velocity?.x ?? 0
    const vy = this.body?.velocity?.y ?? 0
    const textureKey = this.texture.key

    if (Math.abs(vx) > 1 || Math.abs(vy) > 1) {
      if (Math.abs(vy) >= Math.abs(vx)) {
        this._lastDirection = vy < 0 ? 'up' : 'down'
      } else {
        this._lastDirection = vx < 0 ? 'left' : 'right'
      }
      const walkKey = `${textureKey}_walk_${this._lastDirection}`
      if (this.scene?.anims?.exists(walkKey)) {
        this.play(walkKey, true)
      }
    } else {
      const idleKey = `${textureKey}_idle_${this._lastDirection}`
      if (this.scene?.anims?.exists(idleKey)) {
        this.play(idleKey, true)
      }
    }
  }

  /**
   * Simple separation steering to avoid overlapping with other enemies.
   */
  _applySeparation () {
    if (!this.scene || !this.scene.enemyGroup) return

    const enemies = this.scene.enemyGroup.getChildren()
    let sepX = 0
    let sepY = 0

    for (const other of enemies) {
      if (other === this || !other.active || other.isDead) continue

      const dx = this.x - other.x
      const dy = this.y - other.y
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist > 0 && dist < SEPARATION_RADIUS) {
        sepX += (dx / dist) * (SEPARATION_RADIUS - dist)
        sepY += (dy / dist) * (SEPARATION_RADIUS - dist)
      }
    }

    if (sepX !== 0 || sepY !== 0) {
      const mag = Math.sqrt(sepX * sepX + sepY * sepY)
      this.setVelocity(
        (this.body?.velocity?.x ?? 0) + (sepX / mag) * SEPARATION_FORCE,
        (this.body?.velocity?.y ?? 0) + (sepY / mag) * SEPARATION_FORCE
      )
    }
  }

  /**
   * Check if enough time has passed since last attack.
   * @returns {boolean}
   */
  canAttack () {
    const now = Date.now()
    if (now - this._lastAttackTime >= this.attackCooldown) {
      this._lastAttackTime = now
      return true
    }
    return false
  }
}
