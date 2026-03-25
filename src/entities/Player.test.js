import { describe, it, expect, vi, beforeEach } from 'vitest'

// Lightweight Phaser mock for Node environment
vi.mock('phaser', () => {
  class Sprite {
    constructor (scene, x, y, texture) {
      this.scene = scene
      this.x = x
      this.y = y
      this.texture = texture
      this._vx = 0
      this._vy = 0
      this._currentAnim = null
    }

    setVelocity (vx, vy) {
      this._vx = vx
      this._vy = vy
    }

    play (key, ignoreIfPlaying) {
      this._currentAnim = key
    }
  }

  class Scene {
    constructor (key) {
      this.key = key
    }
  }

  return {
    default: {
      Scene,
      AUTO: 0,
      Events: { EventEmitter: class {} },
      Physics: {
        Arcade: {
          Sprite
        }
      }
    },
    Scene,
    Physics: {
      Arcade: {
        Sprite
      }
    }
  }
})

vi.mock('../EventBus.js', () => ({
  default: {
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn()
  }
}))

vi.mock('./Projectile.js', () => {
  return {
    default: class MockProjectile {
      constructor (scene, x, y, type, targetX, targetY) {
        this.scene = scene
        this.x = x
        this.y = y
        this.type = type
        this.targetX = targetX
        this.targetY = targetY
        this.damage = type === 'molotov' ? 5 : 1
        this.active = true
      }
    }
  }
})

function createMockScene () {
  return {
    add: { existing: vi.fn() },
    physics: { add: { existing: vi.fn() } },
    input: {
      keyboard: {
        addKeys: vi.fn(() => ({
          W: { isDown: false },
          A: { isDown: false },
          S: { isDown: false },
          D: { isDown: false }
        }))
      }
    },
    anims: {
      exists: vi.fn(() => false),
      create: vi.fn()
    },
    time: {
      delayedCall: vi.fn()
    }
  }
}

describe('Player', () => {
  let Player, EventBus, player, mockScene

  beforeEach(async () => {
    vi.clearAllMocks()
    const mod = await import('./Player.js')
    Player = mod.default
    const ebMod = await import('../EventBus.js')
    EventBus = ebMod.default

    mockScene = createMockScene()
    player = new Player(mockScene, 100, 200)
  })

  describe('constructor', () => {
    it('should initialize with correct default stats', () => {
      expect(player.hp).toBe(10)
      expect(player.maxHp).toBe(10)
      expect(player.speed).toBe(160)
      expect(player.weapon).toBe('piedra')
      expect(player.isAlive).toBe(true)
    })

    it('should add itself to scene display and physics', () => {
      expect(mockScene.add.existing).toHaveBeenCalledWith(player)
      expect(mockScene.physics.add.existing).toHaveBeenCalledWith(player)
    })

    it('should register WASD keys', () => {
      expect(mockScene.input.keyboard.addKeys).toHaveBeenCalledWith('W,A,S,D')
    })

    it('should create 8 animation fallbacks (4 walk + 4 idle)', () => {
      // anims.exists returns false, so all 8 should be created
      expect(mockScene.anims.create).toHaveBeenCalledTimes(8)
    })
  })

  describe('move()', () => {
    it('should set zero velocity when no keys pressed', () => {
      const keys = { W: { isDown: false }, A: { isDown: false }, S: { isDown: false }, D: { isDown: false } }
      player.move(keys)
      expect(player._vx).toBe(0)
      expect(player._vy).toBe(0)
    })

    it('should move right at full speed when D pressed', () => {
      const keys = { W: { isDown: false }, A: { isDown: false }, S: { isDown: false }, D: { isDown: true } }
      player.move(keys)
      expect(player._vx).toBe(160)
      expect(player._vy).toBe(0)
    })

    it('should move left at full speed when A pressed', () => {
      const keys = { W: { isDown: false }, A: { isDown: true }, S: { isDown: false }, D: { isDown: false } }
      player.move(keys)
      expect(player._vx).toBe(-160)
      expect(player._vy).toBe(0)
    })

    it('should move up at full speed when W pressed', () => {
      const keys = { W: { isDown: true }, A: { isDown: false }, S: { isDown: false }, D: { isDown: false } }
      player.move(keys)
      expect(player._vx).toBe(0)
      expect(player._vy).toBe(-160)
    })

    it('should move down at full speed when S pressed', () => {
      const keys = { W: { isDown: false }, A: { isDown: false }, S: { isDown: true }, D: { isDown: false } }
      player.move(keys)
      expect(player._vx).toBe(0)
      expect(player._vy).toBe(160)
    })

    it('should normalize diagonal movement (W+D)', () => {
      const keys = { W: { isDown: true }, A: { isDown: false }, S: { isDown: false }, D: { isDown: true } }
      player.move(keys)
      const expected = 160 * Math.SQRT1_2
      expect(player._vx).toBeCloseTo(expected, 5)
      expect(player._vy).toBeCloseTo(-expected, 5)
      // Magnitude should equal speed
      const magnitude = Math.sqrt(player._vx ** 2 + player._vy ** 2)
      expect(magnitude).toBeCloseTo(160, 5)
    })

    it('should normalize diagonal movement (S+A)', () => {
      const keys = { W: { isDown: false }, A: { isDown: true }, S: { isDown: true }, D: { isDown: false } }
      player.move(keys)
      const expected = 160 * Math.SQRT1_2
      expect(player._vx).toBeCloseTo(-expected, 5)
      expect(player._vy).toBeCloseTo(expected, 5)
      const magnitude = Math.sqrt(player._vx ** 2 + player._vy ** 2)
      expect(magnitude).toBeCloseTo(160, 5)
    })

    it('should play walk animation when moving', () => {
      const keys = { W: { isDown: false }, A: { isDown: false }, S: { isDown: true }, D: { isDown: false } }
      player.move(keys)
      expect(player._currentAnim).toBe('player_walk_down')
    })

    it('should play idle animation when stopped', () => {
      // Move down first to set last direction
      player.move({ W: { isDown: false }, A: { isDown: false }, S: { isDown: true }, D: { isDown: false } })
      // Then stop
      player.move({ W: { isDown: false }, A: { isDown: false }, S: { isDown: false }, D: { isDown: false } })
      expect(player._currentAnim).toBe('player_idle_down')
    })

    it('should play correct walk animation for each direction', () => {
      const cases = [
        { keys: { W: { isDown: true }, A: { isDown: false }, S: { isDown: false }, D: { isDown: false } }, expected: 'player_walk_up' },
        { keys: { W: { isDown: false }, A: { isDown: true }, S: { isDown: false }, D: { isDown: false } }, expected: 'player_walk_left' },
        { keys: { W: { isDown: false }, A: { isDown: false }, S: { isDown: false }, D: { isDown: true } }, expected: 'player_walk_right' }
      ]
      for (const c of cases) {
        player.move(c.keys)
        expect(player._currentAnim).toBe(c.expected)
      }
    })

    it('should not move when player is dead', () => {
      player.isAlive = false
      const keys = { W: { isDown: true }, A: { isDown: false }, S: { isDown: false }, D: { isDown: false } }
      player.move(keys)
      expect(player._vx).toBe(0)
      expect(player._vy).toBe(0)
    })

    it('should cancel out opposing directions (W+S)', () => {
      const keys = { W: { isDown: true }, A: { isDown: false }, S: { isDown: true }, D: { isDown: false } }
      player.move(keys)
      expect(player._vx).toBe(0)
      expect(player._vy).toBe(0)
    })
  })

  describe('takeDamage()', () => {
    it('should reduce HP by the given amount', () => {
      player.takeDamage(3)
      expect(player.hp).toBe(7)
    })

    it('should not reduce HP below 0', () => {
      player.takeDamage(15)
      expect(player.hp).toBe(0)
    })

    it('should emit player:damaged on EventBus', () => {
      player.takeDamage(2)
      expect(EventBus.emit).toHaveBeenCalledWith('player:damaged', { amount: 2, hp: 8 })
    })

    it('should emit gameover when HP reaches 0', () => {
      player.takeDamage(10)
      expect(EventBus.emit).toHaveBeenCalledWith('gameover')
      expect(player.isAlive).toBe(false)
    })

    it('should set velocity to 0 on death', () => {
      player._vx = 100
      player.takeDamage(10)
      expect(player._vx).toBe(0)
      expect(player._vy).toBe(0)
    })

    it('should ignore damage of 0 or negative', () => {
      player.takeDamage(0)
      expect(player.hp).toBe(10)
      player.takeDamage(-5)
      expect(player.hp).toBe(10)
      expect(EventBus.emit).not.toHaveBeenCalled()
    })

    it('should not take damage when already dead', () => {
      player.isAlive = false
      player.takeDamage(5)
      expect(player.hp).toBe(10)
      expect(EventBus.emit).not.toHaveBeenCalled()
    })
  })

  describe('heal()', () => {
    it('should restore HP by the given amount', () => {
      player.hp = 5
      player.heal(3)
      expect(player.hp).toBe(8)
    })

    it('should not exceed maxHp', () => {
      player.hp = 8
      player.heal(5)
      expect(player.hp).toBe(10)
    })

    it('should emit player:healed on EventBus', () => {
      player.hp = 5
      player.heal(2)
      expect(EventBus.emit).toHaveBeenCalledWith('player:healed', { amount: 2, hp: 7 })
    })

    it('should ignore heal of 0 or negative', () => {
      player.hp = 5
      player.heal(0)
      expect(player.hp).toBe(5)
      player.heal(-3)
      expect(player.hp).toBe(5)
      expect(EventBus.emit).not.toHaveBeenCalled()
    })

    it('should not heal when dead', () => {
      player.isAlive = false
      player.hp = 0
      player.heal(5)
      expect(player.hp).toBe(0)
      expect(EventBus.emit).not.toHaveBeenCalled()
    })
  })

  describe('switchWeapon()', () => {
    it('should toggle from piedra to molotov', () => {
      player.switchWeapon()
      expect(player.weapon).toBe('molotov')
    })

    it('should toggle from molotov back to piedra', () => {
      player.weapon = 'molotov'
      player.switchWeapon()
      expect(player.weapon).toBe('piedra')
    })

    it('should emit weapon:changed on EventBus', () => {
      player.switchWeapon()
      expect(EventBus.emit).toHaveBeenCalledWith('weapon:changed', { weapon: 'molotov' })
    })
  })

  describe('applySpeedBoost()', () => {
    it('should multiply speed by the given multiplier', () => {
      player.applySpeedBoost(1.5, 6000)
      expect(player.speed).toBe(240)
    })

    it('should schedule speed reset via scene timer', () => {
      player.applySpeedBoost(1.5, 6000)
      expect(mockScene.time.delayedCall).toHaveBeenCalledWith(6000, expect.any(Function))

      // Simulate timer callback
      const callback = mockScene.time.delayedCall.mock.calls[0][1]
      callback()
      expect(player.speed).toBe(160)
    })
  })

  describe('shoot()', () => {
    beforeEach(() => {
      player.globalCounter = { molotovs: 3 }
      player.projectileGroup = { add: vi.fn() }
    })

    it('should create a piedra projectile with infinite ammo', () => {
      player.weapon = 'piedra'
      const proj = player.shoot(500, 600)
      expect(proj).not.toBeNull()
      expect(proj.type).toBe('piedra')
      expect(proj.damage).toBe(1)
    })

    it('should add projectile to projectileGroup', () => {
      const proj = player.shoot(500, 600)
      expect(player.projectileGroup.add).toHaveBeenCalledWith(proj)
    })

    it('should create a molotov projectile when counter > 0', () => {
      player.weapon = 'molotov'
      const proj = player.shoot(500, 600)
      expect(proj).not.toBeNull()
      expect(proj.type).toBe('molotov')
      expect(proj.damage).toBe(5)
    })

    it('should decrement globalCounter.molotovs when firing molotov', () => {
      player.weapon = 'molotov'
      player.shoot(500, 600)
      expect(player.globalCounter.molotovs).toBe(2)
    })

    it('should emit molotov:changed when firing molotov', () => {
      player.weapon = 'molotov'
      player.shoot(500, 600)
      expect(EventBus.emit).toHaveBeenCalledWith('molotov:changed', { count: 2 })
    })

    it('should return null when firing molotov with counter=0', () => {
      player.weapon = 'molotov'
      player.globalCounter.molotovs = 0
      const proj = player.shoot(500, 600)
      expect(proj).toBeNull()
    })

    it('should not decrement counter when molotov cannot fire', () => {
      player.weapon = 'molotov'
      player.globalCounter.molotovs = 0
      player.shoot(500, 600)
      expect(player.globalCounter.molotovs).toBe(0)
    })

    it('should return null when firing molotov without globalCounter', () => {
      player.weapon = 'molotov'
      player.globalCounter = null
      const proj = player.shoot(500, 600)
      expect(proj).toBeNull()
    })

    it('should not fire when player is dead', () => {
      player.isAlive = false
      const proj = player.shoot(500, 600)
      expect(proj).toBeNull()
    })

    it('should not require ammo for piedra', () => {
      player.weapon = 'piedra'
      player.globalCounter.molotovs = 0
      const proj = player.shoot(500, 600)
      expect(proj).not.toBeNull()
      expect(proj.type).toBe('piedra')
    })

    it('should work without projectileGroup set', () => {
      player.projectileGroup = null
      const proj = player.shoot(500, 600)
      expect(proj).not.toBeNull()
    })
  })
})
