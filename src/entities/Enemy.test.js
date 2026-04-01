import { describe, it, expect, vi, beforeEach } from 'vitest'

// Lightweight Phaser mock for Node environment
vi.mock('phaser', () => {
  class Sprite {
    constructor (scene, x, y, texture) {
      this.scene = scene
      this.x = x
      this.y = y
      this.texture = { key: texture }
      this._vx = 0
      this._vy = 0
      this.active = true
      this.body = { velocity: { x: 0, y: 0 } }
    }

    setVelocity (vx, vy) {
      this._vx = vx
      this._vy = vy
      if (this.body) {
        this.body.velocity.x = vx
        this.body.velocity.y = vy
      }
    }

    play (key) { this._currentAnim = key }
    once (event, cb) { this._onceCallbacks = this._onceCallbacks || {}; this._onceCallbacks[event] = cb }
    destroy () { this.active = false }
  }

  return {
    default: {
      Scene: class {},
      AUTO: 0,
      Events: { EventEmitter: class {} },
      Physics: { Arcade: { Sprite } }
    },
    Physics: { Arcade: { Sprite } }
  }
})

vi.mock('../EventBus.js', () => ({
  default: { emit: vi.fn(), on: vi.fn(), off: vi.fn() }
}))

vi.mock('easystarjs', () => {
  return {
    default: {
      js: class {
        setGrid () {}
        setAcceptableTiles () {}
        enableDiagonals () {}
        enableCornerCutting () {}
        findPath (sx, sy, ex, ey, cb) { this._cb = cb }
        calculate () { if (this._cb) this._cb(null) }
      }
    }
  }
})

function createMockScene (opts = {}) {
  return {
    add: {
      existing: vi.fn(),
      graphics: vi.fn(() => ({
        lineStyle: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        strokePath: vi.fn(),
        fillStyle: vi.fn(),
        fillCircle: vi.fn(),
        clear: vi.fn(),
        setDepth: vi.fn(),
        destroy: vi.fn()
      }))
    },
    physics: { add: { existing: vi.fn() } },
    anims: { exists: vi.fn(() => false), create: vi.fn() },
    time: { delayedCall: vi.fn() },
    tweens: {
      add: vi.fn((config) => { if (config.onComplete) config.onComplete() })
    },
    cameras: { main: { setAlpha: vi.fn() } },
    mapManager: opts.mapManager || null,
    player: opts.player || null,
    enemyGroup: opts.enemyGroup || { getChildren: () => [] },
    allyGroup: opts.allyGroup || { getChildren: () => [] }
  }
}

function createMockTarget (x, y, hp = 10) {
  return { x, y, hp, isAlive: hp > 0, active: true, setVelocity: vi.fn(), takeDamage: vi.fn(), speed: 160 }
}

describe('Enemy (base class)', () => {
  let Enemy, EventBus

  beforeEach(async () => {
    vi.clearAllMocks()
    const mod = await import('./Enemy.js')
    Enemy = mod.default
    const ebMod = await import('../EventBus.js')
    EventBus = ebMod.default
  })

  describe('constructor', () => {
    it('should initialize with default config', () => {
      const scene = createMockScene()
      const enemy = new Enemy(scene, 100, 200, 'policiaEstandar')
      expect(enemy.hp).toBe(10)
      expect(enemy.maxHp).toBe(10)
      expect(enemy.speed).toBe(120)
      expect(enemy.damage).toBe(1)
      expect(enemy.attackCooldown).toBe(1000)
      expect(enemy.enemyType).toBe('estandar')
      expect(enemy.isDead).toBe(false)
    })

    it('should initialize with custom config', () => {
      const scene = createMockScene()
      const enemy = new Enemy(scene, 0, 0, 'test', {
        hp: 30, speed: 60, damage: 5, attackCooldown: 2000, type: 'agua'
      })
      expect(enemy.hp).toBe(30)
      expect(enemy.maxHp).toBe(30)
      expect(enemy.speed).toBe(60)
      expect(enemy.damage).toBe(5)
      expect(enemy.enemyType).toBe('agua')
    })

    it('should add itself to scene display and physics', () => {
      const scene = createMockScene()
      const enemy = new Enemy(scene, 50, 50, 'test')
      expect(scene.add.existing).toHaveBeenCalledWith(enemy)
      expect(scene.physics.add.existing).toHaveBeenCalledWith(enemy)
    })
  })

  describe('findNearestTarget()', () => {
    it('should return the nearest alive target', () => {
      const scene = createMockScene()
      const enemy = new Enemy(scene, 100, 100, 'test')

      const far = createMockTarget(500, 500)
      const near = createMockTarget(120, 120)
      const result = enemy.findNearestTarget([far, near])
      expect(result).toBe(near)
    })

    it('should skip dead targets', () => {
      const scene = createMockScene()
      const enemy = new Enemy(scene, 100, 100, 'test')

      const dead = createMockTarget(110, 110, 0)
      dead.isAlive = false
      const alive = createMockTarget(500, 500)
      const result = enemy.findNearestTarget([dead, alive])
      expect(result).toBe(alive)
    })

    it('should skip inactive targets', () => {
      const scene = createMockScene()
      const enemy = new Enemy(scene, 100, 100, 'test')

      const inactive = createMockTarget(110, 110)
      inactive.active = false
      const active = createMockTarget(500, 500)
      const result = enemy.findNearestTarget([inactive, active])
      expect(result).toBe(active)
    })

    it('should return null for empty array', () => {
      const scene = createMockScene()
      const enemy = new Enemy(scene, 100, 100, 'test')
      expect(enemy.findNearestTarget([])).toBeNull()
    })

    it('should return null for null input', () => {
      const scene = createMockScene()
      const enemy = new Enemy(scene, 100, 100, 'test')
      expect(enemy.findNearestTarget(null)).toBeNull()
    })

    it('should return null when all targets are dead', () => {
      const scene = createMockScene()
      const enemy = new Enemy(scene, 100, 100, 'test')

      const d1 = createMockTarget(110, 110, 0)
      d1.isAlive = false
      const d2 = createMockTarget(120, 120, 0)
      d2.isAlive = false
      expect(enemy.findNearestTarget([d1, d2])).toBeNull()
    })
  })

  describe('takeDamage()', () => {
    it('should reduce HP by the given amount', () => {
      const scene = createMockScene()
      const enemy = new Enemy(scene, 0, 0, 'test', { hp: 10 })
      enemy.takeDamage(3)
      expect(enemy.hp).toBe(7)
    })

    it('should not reduce HP below 0', () => {
      const scene = createMockScene()
      const enemy = new Enemy(scene, 0, 0, 'test', { hp: 5 })
      enemy.takeDamage(10)
      expect(enemy.hp).toBe(0)
    })

    it('should call die() when HP reaches 0', () => {
      const scene = createMockScene()
      const enemy = new Enemy(scene, 0, 0, 'test', { hp: 3 })
      enemy.takeDamage(3)
      expect(enemy.isDead).toBe(true)
    })

    it('should ignore 0 or negative damage', () => {
      const scene = createMockScene()
      const enemy = new Enemy(scene, 0, 0, 'test', { hp: 10 })
      enemy.takeDamage(0)
      expect(enemy.hp).toBe(10)
      enemy.takeDamage(-5)
      expect(enemy.hp).toBe(10)
    })

    it('should not take damage when already dead', () => {
      const scene = createMockScene()
      const enemy = new Enemy(scene, 0, 0, 'test', { hp: 10 })
      enemy.isDead = true
      enemy.takeDamage(5)
      expect(enemy.hp).toBe(10)
    })
  })

  describe('die()', () => {
    it('should set isDead to true', () => {
      const scene = createMockScene()
      const enemy = new Enemy(scene, 0, 0, 'test', { type: 'estandar' })
      enemy.die()
      expect(enemy.isDead).toBe(true)
    })

    it('should emit enemy:killed with correct type and points', () => {
      const scene = createMockScene()
      const enemy = new Enemy(scene, 0, 0, 'test', { type: 'montado' })
      enemy.die()
      expect(EventBus.emit).toHaveBeenCalledWith('enemy:killed', { type: 'montado', points: 20 })
    })

    it('should emit correct points for each enemy type', () => {
      const pointsMap = { estandar: 10, montado: 20, agua: 50, gas: 40 }
      for (const [type, points] of Object.entries(pointsMap)) {
        vi.clearAllMocks()
        const scene = createMockScene()
        const enemy = new Enemy(scene, 0, 0, 'test', { type })
        enemy.die()
        expect(EventBus.emit).toHaveBeenCalledWith('enemy:killed', { type, points })
      }
    })

    it('should not die twice', () => {
      const scene = createMockScene()
      const enemy = new Enemy(scene, 0, 0, 'test', { type: 'estandar' })
      enemy.die()
      vi.clearAllMocks()
      enemy.die()
      expect(EventBus.emit).not.toHaveBeenCalled()
    })

    it('should set velocity to 0', () => {
      const scene = createMockScene()
      const enemy = new Enemy(scene, 0, 0, 'test')
      enemy.setVelocity(100, 100)
      enemy.die()
      expect(enemy._vx).toBe(0)
      expect(enemy._vy).toBe(0)
    })
  })

  describe('canAttack()', () => {
    it('should allow first attack immediately', () => {
      const scene = createMockScene()
      const enemy = new Enemy(scene, 0, 0, 'test', { attackCooldown: 1000 })
      expect(enemy.canAttack()).toBe(true)
    })

    it('should block attack during cooldown', () => {
      const scene = createMockScene()
      const enemy = new Enemy(scene, 0, 0, 'test', { attackCooldown: 1000 })
      enemy.canAttack() // first attack
      expect(enemy.canAttack()).toBe(false) // still in cooldown
    })
  })

  describe('pathfinding initialization', () => {
    it('should initialize EasyStar when grid is available', () => {
      const mapManager = {
        getWalkableGrid: () => [[0, 0], [0, 0]]
      }
      const scene = createMockScene({ mapManager })
      const enemy = new Enemy(scene, 0, 0, 'test')
      expect(enemy._easystar).not.toBeNull()
    })

    it('should handle missing mapManager gracefully', () => {
      const scene = createMockScene()
      const enemy = new Enemy(scene, 0, 0, 'test')
      // Should not throw, _easystar will be null
      expect(enemy._easystar).toBeNull()
    })
  })
})

describe('PoliciaEstandar', () => {
  let PoliciaEstandar

  beforeEach(async () => {
    vi.clearAllMocks()
    const mod = await import('./PoliciaEstandar.js')
    PoliciaEstandar = mod.default
  })

  it('should initialize with correct stats', () => {
    const scene = createMockScene()
    const p = new PoliciaEstandar(scene, 100, 200)
    expect(p.hp).toBe(10)
    expect(p.maxHp).toBe(10)
    expect(p.speed).toBe(120 * 0.7) // PATROL_SPEED = BASE_SPEED * 0.7
    expect(p.damage).toBe(1)
    expect(p.attackCooldown).toBe(1000)
    expect(p.enemyType).toBe('estandar')
  })

  it('should deal melee damage when in range', () => {
    const target = createMockTarget(110, 200)
    const scene = createMockScene({
      player: target,
      enemyGroup: { getChildren: () => [] }
    })
    const p = new PoliciaEstandar(scene, 100, 200)
    p.target = target

    // Simulate update — target is within melee range (10px away)
    p.update(16)

    expect(target.takeDamage).toHaveBeenCalledWith(1)
  })

  it('should not attack when out of range', () => {
    const target = createMockTarget(500, 500)
    const scene = createMockScene({
      player: target,
      enemyGroup: { getChildren: () => [] }
    })
    const p = new PoliciaEstandar(scene, 100, 200)

    p.update(16)

    expect(target.takeDamage).not.toHaveBeenCalled()
  })
})

describe('PoliciaMontado', () => {
  let PoliciaMontado

  beforeEach(async () => {
    vi.clearAllMocks()
    const mod = await import('./PoliciaMontado.js')
    PoliciaMontado = mod.default
  })

  it('should initialize with correct stats', () => {
    const scene = createMockScene()
    const p = new PoliciaMontado(scene, 100, 200)
    expect(p.hp).toBe(15)
    expect(p.maxHp).toBe(15)
    expect(p.speed).toBe(144)
    expect(p.damage).toBe(2)
    expect(p.attackCooldown).toBe(1500)
    expect(p.enemyType).toBe('montado')
  })

  it('should have speed 1.2x base', () => {
    const scene = createMockScene()
    const p = new PoliciaMontado(scene, 0, 0)
    expect(p.speed).toBe(120 * 1.2)
  })

  it('should deal charge damage and push on impact', () => {
    const target = createMockTarget(130, 200)
    const scene = createMockScene({
      player: target,
      enemyGroup: { getChildren: () => [] }
    })
    const p = new PoliciaMontado(scene, 100, 200)
    p.target = target

    p.update(16)

    expect(target.takeDamage).toHaveBeenCalledWith(2)
    expect(target.setVelocity).toHaveBeenCalled()
  })
})

describe('CamionLanzaAgua', () => {
  let CamionLanzaAgua

  beforeEach(async () => {
    vi.clearAllMocks()
    const mod = await import('./CamionLanzaAgua.js')
    CamionLanzaAgua = mod.default
  })

  it('should initialize with correct stats', () => {
    const scene = createMockScene()
    const c = new CamionLanzaAgua(scene, 100, 200)
    expect(c.hp).toBe(30)
    expect(c.maxHp).toBe(30)
    expect(c.speed).toBe(60)
    expect(c.enemyType).toBe('agua')
  })

  it('should move toward target', () => {
    const target = createMockTarget(400, 200)
    const scene = createMockScene({
      player: target,
      enemyGroup: { getChildren: () => [] }
    })
    const c = new CamionLanzaAgua(scene, 100, 200)

    c.update(16)

    // Should have positive x velocity (moving right toward target)
    expect(c._vx).toBeGreaterThan(0)
  })
})

describe('CamionLanzaGas', () => {
  let CamionLanzaGas

  beforeEach(async () => {
    vi.clearAllMocks()
    const mod = await import('./CamionLanzaGas.js')
    CamionLanzaGas = mod.default
  })

  it('should initialize with correct stats', () => {
    const scene = createMockScene()
    const c = new CamionLanzaGas(scene, 100, 200)
    expect(c.hp).toBe(25)
    expect(c.maxHp).toBe(25)
    expect(c.speed).toBe(60)
    expect(c.enemyType).toBe('gas')
  })

  it('should move toward target', () => {
    const target = createMockTarget(400, 200)
    const scene = createMockScene({
      player: target,
      enemyGroup: { getChildren: () => [] }
    })
    const c = new CamionLanzaGas(scene, 100, 200)

    c.update(16)

    expect(c._vx).toBeGreaterThan(0)
  })

  it('should clean up gas zones on destroy', () => {
    const scene = createMockScene()
    const c = new CamionLanzaGas(scene, 100, 200)
    const mockGraphics = { destroy: vi.fn() }
    c._gasZones = [{ graphics: mockGraphics, remaining: 5000, damageTimer: 0, x: 0, y: 0, radius: 80 }]

    c.destroy()

    expect(mockGraphics.destroy).toHaveBeenCalled()
    expect(c._gasZones).toHaveLength(0)
  })
})
