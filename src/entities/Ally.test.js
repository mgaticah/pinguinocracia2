import { describe, it, expect, vi, beforeEach } from 'vitest'

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

    play () {}
    once () {}
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

vi.mock('./Projectile.js', () => {
  return {
    default: class MockProjectile {
      constructor (scene, x, y, type, targetX, targetY) {
        this.scene = scene
        this.x = x
        this.y = y
        this.type = type
        this.damage = type === 'molotov' ? 5 : 1
        this.active = true
      }

      destroy () { this.active = false }
    }
  }
})

function createMockScene (opts = {}) {
  return {
    add: { existing: vi.fn() },
    physics: { add: { existing: vi.fn() } },
    anims: { exists: vi.fn(() => false), create: vi.fn() },
    tweens: {
      add: vi.fn((config) => { if (config.onComplete) config.onComplete() })
    },
    time: { delayedCall: vi.fn() },
    player: opts.player || null,
    enemyGroup: opts.enemyGroup || { getChildren: () => [] },
    allyGroup: opts.allyGroup || { getChildren: () => [] },
    globalCounter: opts.globalCounter || { molotovs: 0 },
    projectileGroup: opts.projectileGroup || { add: vi.fn() },
    mapManager: opts.mapManager || { getExitZones: () => [] },
    currentMapKey: opts.currentMapKey || 'map_level1'
  }
}

function createMockEnemy (x, y, hp = 10) {
  return { x, y, hp, isDead: false, active: true }
}

describe('Ally (base class)', () => {
  let Ally, EventBus

  beforeEach(async () => {
    vi.clearAllMocks()
    const mod = await import('./Ally.js')
    Ally = mod.default
    const ebMod = await import('../EventBus.js')
    EventBus = ebMod.default
  })

  describe('constructor', () => {
    it('should initialize with default config', () => {
      const scene = createMockScene()
      const ally = new Ally(scene, 100, 200, 'aliadoEstandar')
      expect(ally.hp).toBe(10)
      expect(ally.maxHp).toBe(10)
      expect(ally.speed).toBe(160)
      expect(ally.type).toBe('estandar')
      expect(ally.attackCooldown).toBe(1500)
      expect(ally.attackRange).toBe(150)
      expect(ally.isDead).toBe(false)
    })

    it('should initialize with custom config', () => {
      const scene = createMockScene()
      const ally = new Ally(scene, 0, 0, 'test', {
        hp: 8, speed: 192, type: 'rapido', attackCooldown: 1000
      })
      expect(ally.hp).toBe(8)
      expect(ally.maxHp).toBe(8)
      expect(ally.speed).toBe(192)
      expect(ally.type).toBe('rapido')
    })

    it('should add itself to scene display and physics', () => {
      const scene = createMockScene()
      const ally = new Ally(scene, 50, 50, 'test')
      expect(scene.add.existing).toHaveBeenCalledWith(ally)
      expect(scene.physics.add.existing).toHaveBeenCalledWith(ally)
    })
  })

  describe('takeDamage()', () => {
    it('should reduce HP by the given amount', () => {
      const scene = createMockScene()
      const ally = new Ally(scene, 0, 0, 'test', { hp: 10 })
      ally.takeDamage(3)
      expect(ally.hp).toBe(7)
    })

    it('should not reduce HP below 0', () => {
      const scene = createMockScene()
      const ally = new Ally(scene, 0, 0, 'test', { hp: 5 })
      ally.takeDamage(10)
      expect(ally.hp).toBe(0)
    })

    it('should call die() when HP reaches 0', () => {
      const scene = createMockScene()
      const ally = new Ally(scene, 0, 0, 'test', { hp: 3 })
      ally.takeDamage(3)
      expect(ally.isDead).toBe(true)
    })

    it('should ignore 0 or negative damage', () => {
      const scene = createMockScene()
      const ally = new Ally(scene, 0, 0, 'test', { hp: 10 })
      ally.takeDamage(0)
      expect(ally.hp).toBe(10)
      ally.takeDamage(-5)
      expect(ally.hp).toBe(10)
    })

    it('should not take damage when already dead', () => {
      const scene = createMockScene()
      const ally = new Ally(scene, 0, 0, 'test', { hp: 10 })
      ally.isDead = true
      ally.takeDamage(5)
      expect(ally.hp).toBe(10)
    })
  })

  describe('die()', () => {
    it('should set isDead to true', () => {
      const scene = createMockScene()
      const ally = new Ally(scene, 0, 0, 'test')
      ally.die()
      expect(ally.isDead).toBe(true)
    })

    it('should emit ally:died event', () => {
      const scene = createMockScene()
      const ally = new Ally(scene, 0, 0, 'test')
      ally.die()
      expect(EventBus.emit).toHaveBeenCalledWith('ally:died', { ally })
    })

    it('should not die twice', () => {
      const scene = createMockScene()
      const ally = new Ally(scene, 0, 0, 'test')
      ally.die()
      vi.clearAllMocks()
      ally.die()
      expect(EventBus.emit).not.toHaveBeenCalled()
    })

    it('should set velocity to 0', () => {
      const scene = createMockScene()
      const ally = new Ally(scene, 0, 0, 'test')
      ally.setVelocity(100, 100)
      ally.die()
      expect(ally._vx).toBe(0)
      expect(ally._vy).toBe(0)
    })
  })

  describe('heal()', () => {
    it('should increase HP by the given amount', () => {
      const scene = createMockScene()
      const ally = new Ally(scene, 0, 0, 'test', { hp: 10 })
      ally.hp = 5
      ally.heal(3)
      expect(ally.hp).toBe(8)
    })

    it('should not exceed maxHp', () => {
      const scene = createMockScene()
      const ally = new Ally(scene, 0, 0, 'test', { hp: 10 })
      ally.hp = 9
      ally.heal(5)
      expect(ally.hp).toBe(10)
    })

    it('should ignore 0 or negative heal', () => {
      const scene = createMockScene()
      const ally = new Ally(scene, 0, 0, 'test', { hp: 10 })
      ally.hp = 5
      ally.heal(0)
      expect(ally.hp).toBe(5)
      ally.heal(-3)
      expect(ally.hp).toBe(5)
    })

    it('should not heal when dead', () => {
      const scene = createMockScene()
      const ally = new Ally(scene, 0, 0, 'test', { hp: 10 })
      ally.hp = 0
      ally.isDead = true
      ally.heal(5)
      expect(ally.hp).toBe(0)
    })
  })

  describe('followPlayer()', () => {
    it('should move toward player + offset', () => {
      const scene = createMockScene()
      const ally = new Ally(scene, 0, 0, 'test')
      const player = { x: 200, y: 200 }
      ally.followPlayer(player, { x: 50, y: 0 })
      expect(ally._vx).toBeGreaterThan(0)
      expect(ally._vy).toBeGreaterThan(0)
    })

    it('should stop when close to target', () => {
      const scene = createMockScene()
      const ally = new Ally(scene, 200, 200, 'test')
      const player = { x: 200, y: 200 }
      ally.followPlayer(player, { x: 0, y: 0 })
      expect(ally._vx).toBe(0)
      expect(ally._vy).toBe(0)
    })
  })

  describe('attackNearestEnemy()', () => {
    it('should move toward enemy when out of close range', () => {
      const scene = createMockScene()
      const ally = new Ally(scene, 0, 0, 'test')
      const enemy = createMockEnemy(300, 0)
      ally.attackNearestEnemy(enemy)
      expect(ally._vx).toBeGreaterThan(0)
    })

    it('should fire a projectile (piedra) when no molotovs', () => {
      const scene = createMockScene({ globalCounter: { molotovs: 0 } })
      const ally = new Ally(scene, 0, 0, 'test')
      const enemy = createMockEnemy(100, 0)
      ally.attackNearestEnemy(enemy)
      expect(scene.projectileGroup.add).toHaveBeenCalled()
    })

    it('should fire molotov when globalCounter has molotovs', () => {
      const gc = { molotovs: 3 }
      const scene = createMockScene({ globalCounter: gc })
      const ally = new Ally(scene, 0, 0, 'test')
      const enemy = createMockEnemy(100, 0)
      ally.attackNearestEnemy(enemy)
      expect(gc.molotovs).toBe(2)
      expect(EventBus.emit).toHaveBeenCalledWith('molotov:changed', { count: 2 })
    })
  })

  describe('update()', () => {
    it('should not update when dead', () => {
      const scene = createMockScene()
      const ally = new Ally(scene, 0, 0, 'test')
      ally.isDead = true
      ally.update(16)
      expect(ally._vx).toBe(0)
    })

    it('should advance toward goal when no enemies in range', () => {
      const player = { x: 200, y: 200, isAlive: true }
      const scene = createMockScene({
        player,
        mapManager: { getExitZones: () => [{ x: 3792, y: 960, width: 48, height: 192 }] }
      })
      const ally = new Ally(scene, 100, 100, 'test')
      ally.update(16)
      // Should be moving (either toward goal or player)
      expect(Math.abs(ally._vx) + Math.abs(ally._vy)).toBeGreaterThan(0)
    })

    it('should attack enemy when in range', () => {
      const enemy = createMockEnemy(50, 0)
      const scene = createMockScene({
        player: { x: 100, y: 0, isAlive: true },
        enemyGroup: { getChildren: () => [enemy] }
      })
      const ally = new Ally(scene, 0, 0, 'test')
      ally.update(16)
      // Should have fired a projectile
      expect(scene.projectileGroup.add).toHaveBeenCalled()
    })

    it('should regroup when too far from player (>10 cuerpos) and player is moving', () => {
      const player = { x: 0, y: 0, isAlive: true, body: { velocity: { x: 50, y: 0 } } }
      const scene = createMockScene({ player })
      // Place ally 600px away (>480px = 10 cuerpos)
      const ally = new Ally(scene, 600, 0, 'test')
      ally.update(16)
      // Should be moving back toward player (negative vx)
      expect(ally._vx).toBeLessThan(0)
    })

    it('should wait when too far from player and player is stopped', () => {
      const player = { x: 0, y: 0, isAlive: true, body: { velocity: { x: 0, y: 0 } } }
      const scene = createMockScene({ player })
      const ally = new Ally(scene, 600, 0, 'test')
      ally.update(16)
      // Should be waiting (not moving)
      expect(ally._waiting).toBe(true)
      expect(ally._vx).toBe(0)
    })
  })
})

describe('AliadoEstandar', () => {
  let AliadoEstandar

  beforeEach(async () => {
    vi.clearAllMocks()
    const mod = await import('./AliadoEstandar.js')
    AliadoEstandar = mod.default
  })

  it('should initialize with correct stats', () => {
    const scene = createMockScene()
    const a = new AliadoEstandar(scene, 100, 200)
    expect(a.hp).toBe(10)
    expect(a.maxHp).toBe(10)
    expect(a.speed).toBe(160)
    expect(a.type).toBe('estandar')
    expect(a.attackCooldown).toBe(1500)
  })
})

describe('AliadoRapido', () => {
  let AliadoRapido

  beforeEach(async () => {
    vi.clearAllMocks()
    const mod = await import('./AliadoRapido.js')
    AliadoRapido = mod.default
  })

  it('should initialize with correct stats', () => {
    const scene = createMockScene()
    const a = new AliadoRapido(scene, 100, 200)
    expect(a.hp).toBe(8)
    expect(a.maxHp).toBe(8)
    expect(a.speed).toBe(220)
    expect(a.type).toBe('rapido')
  })

  it('should have high speed for evasion', () => {
    const scene = createMockScene()
    const a = new AliadoRapido(scene, 0, 0)
    expect(a.speed).toBe(220)
  })
})

describe('AliadoPunk', () => {
  let AliadoPunk, EventBus

  beforeEach(async () => {
    vi.clearAllMocks()
    const mod = await import('./AliadoPunk.js')
    AliadoPunk = mod.default
    const ebMod = await import('../EventBus.js')
    EventBus = ebMod.default
  })

  it('should initialize with correct stats', () => {
    const scene = createMockScene()
    const a = new AliadoPunk(scene, 100, 200)
    expect(a.hp).toBe(12)
    expect(a.maxHp).toBe(12)
    expect(a.speed).toBe(144)
    expect(a.type).toBe('punk')
    expect(a.attackCooldown).toBe(800)
  })

  it('should have speed 0.9x base', () => {
    const scene = createMockScene()
    const a = new AliadoPunk(scene, 0, 0)
    expect(a.speed).toBe(144)
  })

  it('should add 3 molotovs to global counter on spawn', () => {
    const gc = { molotovs: 2 }
    const scene = createMockScene({ globalCounter: gc })
    const a = new AliadoPunk(scene, 0, 0)
    expect(gc.molotovs).toBe(5)
    expect(EventBus.emit).toHaveBeenCalledWith('molotov:changed', { count: 5 })
  })

  it('should have higher attack frequency than standard', () => {
    const scene = createMockScene()
    const punk = new AliadoPunk(scene, 0, 0)
    expect(punk.attackCooldown).toBeLessThan(1500)
  })
})
