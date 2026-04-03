import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('phaser', () => {
  class Sprite {
    constructor (scene, x, y, texture) {
      this.scene = scene
      this.x = x
      this.y = y
      this.texture = texture
      this.active = true
      this._vx = 0
      this._vy = 0
    }

    setVelocity (vx, vy) {
      this._vx = vx
      this._vy = vy
    }

    setCollideWorldBounds () {}
    play () {}
    destroy () { this.active = false }
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

vi.mock('../entities/Projectile.js', () => {
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

      destroy () { this.active = false }
    }
  }
})

vi.mock('../systems/MapManager.js', () => {
  return {
    default: class MockMapManager {
      constructor () {
        this._obstacleGroup = null
      }

      loadMap (key, scene) {
        // Create a mock obstacle group if physics is available
        if (scene && scene.physics && scene.physics.add) {
          this._obstacleGroup = { type: 'staticGroup' }
        }
        return { key }
      }

      getMapDimensions () {
        return { width: 3840, height: 2160 }
      }

      getEntryPoint (key) {
        return { x: 192, y: 1080 }
      }

      getObstacleLayer () {
        return this._obstacleGroup
      }

      getPowerupPoints () {
        return [{ x: 960, y: 540 }, { x: 1920, y: 1080 }]
      }

      getExitZones (key) {
        if (key === 'map_level1') {
          return [{ x: 3792, y: 960, width: 48, height: 192, targetMap: 'map_amunategui' }]
        }
        return []
      }
    }
  }
})

vi.mock('../systems/PowerupSpawnSystem.js', () => {
  return {
    default: class MockPowerupSpawnSystem {
      constructor () {}
      update () {}
      spawnPowerup () {}
    }
  }
})

vi.mock('../systems/FormationSystem.js', () => {
  return {
    default: class MockFormationSystem {
      constructor () { this.positions = [] }
      getPosition () { return { x: 0, y: 0 } }
      update () {}
    }
  }
})

vi.mock('../systems/SaveSystem.js', () => {
  return {
    default: class MockSaveSystem {
      constructor () {
        this.SLOTS = ['slot1', 'slot2', 'slot3', 'quicksave']
        this._savedStates = {}
      }

      save (slotId, gameState) {
        this._savedStates[slotId] = gameState
        return true
      }

      load (slotId) {
        return this._savedStates[slotId] || null
      }

      listSlots () {
        return this.SLOTS.map(slotId => ({
          slotId,
          date: this._savedStates[slotId] ? '2024-01-01T00:00:00.000Z' : null,
          empty: !this._savedStates[slotId]
        }))
      }

      buildGameState (scene) {
        return {
          version: '1.0',
          savedAt: '2024-01-01T00:00:00.000Z',
          player: { hp: scene.player?.hp || 10, speed: 160, weapon: 'piedra', x: 0, y: 0 },
          allies: [],
          inventory: { molotovs: 0 },
          map: { key: 'map_level1', entryPoint: { x: 192, y: 1080 }, unlockedExits: [] },
          difficulty: { totalTime: 0, spawnLevel: 0, activeEnemyTypes: [] },
          activeEffects: { energetica: { active: false, remaining: 0 } },
          score: 0
        }
      }

      restoreGameState (scene, state) {}
    }
  }
})

vi.mock('../systems/FinalEventSystem.js', () => {
  return {
    default: class MockFinalEventSystem {
      constructor () {
        this.active = false
        this.remaining = 0
      }

      start (duration) {
        this.active = true
        this.remaining = duration || 90
      }

      update () {}

      stop () {
        this.active = false
        this.remaining = 0
      }
    }
  }
})

vi.mock('../entities/AliadoEstandar.js', () => {
  return {
    default: class MockAliadoEstandar {
      constructor (scene, x, y) {
        this.scene = scene
        this.x = x
        this.y = y
        this.type = 'estandar'
        this.hp = 10
        this.maxHp = 10
        this.active = true
        this.isDead = false
      }

      setPosition (x, y) { this.x = x; this.y = y }
      setVelocity () {}
      destroy () { this.active = false }
    }
  }
})

vi.mock('../entities/AliadoRapido.js', () => {
  return {
    default: class MockAliadoRapido {
      constructor (scene, x, y) {
        this.scene = scene
        this.x = x
        this.y = y
        this.type = 'rapido'
        this.hp = 8
        this.maxHp = 8
        this.active = true
        this.isDead = false
      }

      setPosition (x, y) { this.x = x; this.y = y }
      setVelocity () {}
      destroy () { this.active = false }
    }
  }
})

vi.mock('../entities/AliadoPunk.js', () => {
  return {
    default: class MockAliadoPunk {
      constructor (scene, x, y) {
        this.scene = scene
        this.x = x
        this.y = y
        this.type = 'punk'
        this.hp = 12
        this.maxHp = 12
        this.active = true
        this.isDead = false
      }

      setPosition (x, y) { this.x = x; this.y = y }
      setVelocity () {}
      destroy () { this.active = false }
    }
  }
})

function createMockGameScene () {
  const keydownHandlers = {}
  const pointerHandlers = {}

  const cameraMock = {
    setBounds: vi.fn(),
    startFollow: vi.fn(),
    width: 1920,
    height: 1080
  }

  return {
    add: {
      existing: vi.fn(),
      rectangle: vi.fn(() => ({
        setDepth: vi.fn(),
        body: { setSize: vi.fn(), setOffset: vi.fn() }
      })),
      graphics: vi.fn(() => ({
        fillStyle: vi.fn(),
        fillRect: vi.fn(),
        lineStyle: vi.fn(),
        lineBetween: vi.fn(),
        setDepth: vi.fn()
      })),
      text: vi.fn(() => ({
        setOrigin: vi.fn(),
        setDepth: vi.fn(),
        setScrollFactor: vi.fn(),
        active: true,
        destroy: vi.fn()
      })),
      zone: vi.fn(() => ({
        targetMap: null
      }))
    },
    physics: {
      add: {
        existing: vi.fn(),
        group: vi.fn(() => ({
          add: vi.fn(),
          runChildUpdate: true,
          clear: vi.fn(),
          getChildren: vi.fn(() => [])
        })),
        staticGroup: vi.fn(() => ({
          add: vi.fn(),
          type: 'staticGroup',
          clear: vi.fn()
        })),
        overlap: vi.fn(),
        collider: vi.fn()
      },
      world: {
        setBounds: vi.fn()
      }
    },
    cameras: {
      main: cameraMock
    },
    input: {
      keyboard: {
        addKeys: vi.fn(() => ({
          W: { isDown: false },
          A: { isDown: false },
          S: { isDown: false },
          D: { isDown: false }
        })),
        on: vi.fn((event, handler) => {
          keydownHandlers[event] = handler
        })
      },
      on: vi.fn((event, handler) => {
        pointerHandlers[event] = handler
      })
    },
    anims: {
      exists: vi.fn(() => false),
      create: vi.fn()
    },
    time: {
      delayedCall: vi.fn((delay, callback) => {
        // Store callback for manual invocation in tests
        if (callback) callback._delayedCallback = callback
        return { remove: vi.fn() }
      })
    },
    scene: {
      launch: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      stop: vi.fn(),
      start: vi.fn()
    },
    events: {
      on: vi.fn()
    },
    _keydownHandlers: keydownHandlers,
    _pointerHandlers: pointerHandlers,
    _cameraMock: cameraMock
  }
}

describe('GameScene', () => {
  let GameScene, mockScene, gameScene

  beforeEach(async () => {
    vi.clearAllMocks()
    const mod = await import('./GameScene.js')
    GameScene = mod.default
    gameScene = new GameScene()

    // Inject mock scene methods
    mockScene = createMockGameScene()
    Object.assign(gameScene, mockScene)

    gameScene.create()
  })

  describe('create()', () => {
    it('should initialize globalCounter with molotovs=0', () => {
      expect(gameScene.globalCounter).toEqual({ molotovs: 0 })
    })

    it('should create projectileGroup, enemyGroup, and allyGroup', () => {
      expect(mockScene.physics.add.group).toHaveBeenCalledTimes(3)
    })

    it('should create a player and pass globalCounter reference', () => {
      expect(gameScene.player).toBeDefined()
      expect(gameScene.player.globalCounter).toBe(gameScene.globalCounter)
    })

    it('should pass projectileGroup reference to player', () => {
      expect(gameScene.player.projectileGroup).toBe(gameScene.projectileGroup)
    })

    it('should register Q key handler', () => {
      expect(mockScene.input.keyboard.on).toHaveBeenCalledWith('keydown-Q', expect.any(Function))
    })

    it('should register pointerdown handler', () => {
      expect(mockScene.input.on).toHaveBeenCalledWith('pointerdown', expect.any(Function))
    })

    it('should set up overlap between projectileGroup and enemyGroup', () => {
      expect(mockScene.physics.add.overlap).toHaveBeenCalled()
    })

    it('should instantiate MapManager and store it', () => {
      expect(gameScene.mapManager).toBeDefined()
    })

    it('should set currentMapKey to map_level1', () => {
      expect(gameScene.currentMapKey).toBe('map_level1')
    })

    it('should set physics world bounds to map dimensions', () => {
      expect(mockScene.physics.world.setBounds).toHaveBeenCalledWith(0, 0, 3840, 2160)
    })

    it('should set camera bounds to map dimensions', () => {
      expect(mockScene._cameraMock.setBounds).toHaveBeenCalledWith(0, 0, 3840, 2160)
    })

    it('should start camera follow on the player with smooth lerp', () => {
      expect(mockScene._cameraMock.startFollow).toHaveBeenCalledWith(
        gameScene.player, true, 0.1, 0.1
      )
    })

    it('should position player at the map entry point', () => {
      expect(gameScene.player.x).toBe(192)
      expect(gameScene.player.y).toBe(1080)
    })

    it('should set up collider between player and obstacle layer', () => {
      expect(mockScene.physics.add.collider).toHaveBeenCalled()
    })
  })

  describe('Q key weapon switching', () => {
    it('should call player.switchWeapon when Q is pressed', () => {
      const qHandler = mockScene._keydownHandlers['keydown-Q']
      expect(qHandler).toBeDefined()

      gameScene.player.switchWeapon = vi.fn()
      qHandler()
      expect(gameScene.player.switchWeapon).toHaveBeenCalled()
    })

    it('should not switch weapon when player is dead', () => {
      const qHandler = mockScene._keydownHandlers['keydown-Q']
      gameScene.player.isAlive = false
      gameScene.player.switchWeapon = vi.fn()
      qHandler()
      expect(gameScene.player.switchWeapon).not.toHaveBeenCalled()
    })
  })

  describe('pointer click shooting', () => {
    it('should call player.shoot on left click', () => {
      const pointerHandler = mockScene._pointerHandlers['pointerdown']
      expect(pointerHandler).toBeDefined()

      gameScene.player.shoot = vi.fn()
      pointerHandler({ leftButtonDown: () => true, worldX: 500, worldY: 600 })
      expect(gameScene.player.shoot).toHaveBeenCalledWith(500, 600)
    })

    it('should not shoot on right click', () => {
      const pointerHandler = mockScene._pointerHandlers['pointerdown']
      gameScene.player.shoot = vi.fn()
      pointerHandler({ leftButtonDown: () => false, worldX: 500, worldY: 600 })
      expect(gameScene.player.shoot).not.toHaveBeenCalled()
    })

    it('should not shoot when player is dead', () => {
      const pointerHandler = mockScene._pointerHandlers['pointerdown']
      gameScene.player.isAlive = false
      gameScene.player.shoot = vi.fn()
      pointerHandler({ leftButtonDown: () => true, worldX: 500, worldY: 600 })
      expect(gameScene.player.shoot).not.toHaveBeenCalled()
    })
  })

  describe('_onProjectileHitEnemy()', () => {
    it('should call enemy.takeDamage with projectile damage', () => {
      const enemy = { takeDamage: vi.fn() }
      const projectile = { damage: 5, destroy: vi.fn() }
      gameScene._onProjectileHitEnemy(projectile, enemy)
      expect(enemy.takeDamage).toHaveBeenCalledWith(5, undefined, undefined)
    })

    it('should destroy the projectile on hit', () => {
      const enemy = { takeDamage: vi.fn() }
      const projectile = { damage: 1, destroy: vi.fn() }
      gameScene._onProjectileHitEnemy(projectile, enemy)
      expect(projectile.destroy).toHaveBeenCalled()
    })

    it('should still destroy projectile if enemy has no takeDamage', () => {
      const enemy = {}
      const projectile = { damage: 1, destroy: vi.fn() }
      gameScene._onProjectileHitEnemy(projectile, enemy)
      expect(projectile.destroy).toHaveBeenCalled()
    })
  })

  describe('exit zones and map transition', () => {
    it('should initialize _isTransitioning to false', () => {
      expect(gameScene._isTransitioning).toBe(false)
    })

    it('should set up exit zone overlaps in create()', () => {
      // The mock MapManager returns 1 exit zone for map_level1
      // _setupExitZones is called in create(), which calls add.zone and physics.add.overlap
      expect(mockScene.add.zone).toHaveBeenCalled()
      expect(mockScene.physics.add.overlap).toHaveBeenCalled()
    })

    it('should emit map:transition event on _transitionToMap', async () => {
      const EventBusMod = (await import('../EventBus.js')).default
      gameScene._transitionToMap('map_amunategui')
      expect(EventBusMod.emit).toHaveBeenCalledWith('map:transition', { mapKey: 'map_amunategui' })
    })

    it('should set _isTransitioning to true during transition', () => {
      gameScene._transitionToMap('map_amunategui')
      expect(gameScene._isTransitioning).toBe(true)
    })

    it('should not trigger multiple transitions simultaneously', async () => {
      const EventBusMod = (await import('../EventBus.js')).default
      gameScene._transitionToMap('map_amunategui')
      EventBusMod.emit.mockClear()
      gameScene._transitionToMap('map_lastarria')
      expect(EventBusMod.emit).not.toHaveBeenCalledWith('map:transition', { mapKey: 'map_lastarria' })
    })
  })

  describe('_transitionToMap() delayed callback', () => {
    let delayedCallback

    beforeEach(() => {
      // Override time.delayedCall to capture and execute the callback
      gameScene.time.delayedCall = vi.fn((delay, cb) => {
        delayedCallback = cb
        return { remove: vi.fn() }
      })

      // Set up groups with clear and getChildren
      gameScene.enemyGroup = {
        clear: vi.fn(),
        getChildren: vi.fn(() => [])
      }
      gameScene.powerupGroup = {
        clear: vi.fn(),
        getChildren: vi.fn(() => [])
      }
      gameScene.projectileGroup = {
        clear: vi.fn(),
        getChildren: vi.fn(() => [])
      }
      gameScene.allyGroup = {
        add: vi.fn(),
        getChildren: vi.fn(() => []),
        clear: vi.fn()
      }

      // Set player position methods
      gameScene.player.setPosition = vi.fn((x, y) => {
        gameScene.player.x = x
        gameScene.player.y = y
      })

      // Trigger transition
      gameScene._transitionToMap('map_amunategui')
    })

    it('should use a 500ms delay', () => {
      expect(gameScene.time.delayedCall).toHaveBeenCalledWith(500, expect.any(Function))
    })

    it('should clear enemies on transition', () => {
      delayedCallback()
      expect(gameScene.enemyGroup.clear).toHaveBeenCalledWith(true, true)
    })

    it('should clear powerups on transition', () => {
      delayedCallback()
      expect(gameScene.powerupGroup.clear).toHaveBeenCalledWith(true, true)
    })

    it('should clear projectiles on transition', () => {
      delayedCallback()
      expect(gameScene.projectileGroup.clear).toHaveBeenCalledWith(true, true)
    })

    it('should update currentMapKey after transition', () => {
      delayedCallback()
      expect(gameScene.currentMapKey).toBe('map_amunategui')
    })

    it('should reposition player at new map entry point', () => {
      delayedCallback()
      expect(gameScene.player.setPosition).toHaveBeenCalledWith(192, 1080)
    })

    it('should preserve player HP across transition', () => {
      gameScene.player.hp = 7
      delayedCallback()
      expect(gameScene.player.hp).toBe(7)
    })

    it('should preserve globalCounter molotovs across transition', () => {
      gameScene.globalCounter.molotovs = 5
      delayedCallback()
      expect(gameScene.globalCounter.molotovs).toBe(5)
    })

    it('should preserve totalTime across transition', () => {
      gameScene.totalTime = 120
      delayedCallback()
      expect(gameScene.totalTime).toBe(120)
    })

    it('should preserve spawnSystem difficultyLevel across transition', () => {
      gameScene.spawnSystem.difficultyLevel = 3
      delayedCallback()
      expect(gameScene.spawnSystem.difficultyLevel).toBe(3)
    })

    it('should preserve scoreSystem score across transition', () => {
      gameScene.scoreSystem.score = 250
      delayedCallback()
      expect(gameScene.scoreSystem.score).toBe(250)
    })

    it('should reconfigure physics world bounds', () => {
      delayedCallback()
      expect(mockScene.physics.world.setBounds).toHaveBeenCalledWith(0, 0, 3840, 2160)
    })

    it('should reconfigure camera bounds', () => {
      delayedCallback()
      expect(mockScene._cameraMock.setBounds).toHaveBeenCalledWith(0, 0, 3840, 2160)
    })

    it('should set _isTransitioning back to false after completion', () => {
      delayedCallback()
      expect(gameScene._isTransitioning).toBe(false)
    })

    it('should call effectSystem.clearEffectsOnMapTransition for player', () => {
      gameScene.effectSystem.clearEffectsOnMapTransition = vi.fn()
      delayedCallback()
      expect(gameScene.effectSystem.clearEffectsOnMapTransition).toHaveBeenCalledWith(gameScene.player)
    })

    it('should grant a new ally on transition', () => {
      delayedCallback()
      expect(gameScene.allyGroup.add).toHaveBeenCalled()
    })
  })

  describe('_grantNewAlly()', () => {
    beforeEach(() => {
      gameScene.allyGroup = {
        add: vi.fn(),
        getChildren: vi.fn(() => [])
      }
    })

    it('should add a new ally to allyGroup', () => {
      gameScene._grantNewAlly()
      expect(gameScene.allyGroup.add).toHaveBeenCalled()
    })

    it('should emit ally:spawned event', async () => {
      const EventBusMod = (await import('../EventBus.js')).default
      gameScene._grantNewAlly()
      expect(EventBusMod.emit).toHaveBeenCalledWith('ally:spawned', expect.objectContaining({ type: expect.any(String) }))
    })

    it('should create AliadoPunk with 20% probability (roll < 0.2)', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.1)
      gameScene._grantNewAlly()
      const addedAlly = gameScene.allyGroup.add.mock.calls[0][0]
      expect(addedAlly.type).toBe('punk')
      Math.random.mockRestore()
    })

    it('should create AliadoEstandar when roll is between 0.2 and 0.6', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.4)
      gameScene._grantNewAlly()
      const addedAlly = gameScene.allyGroup.add.mock.calls[0][0]
      expect(addedAlly.type).toBe('estandar')
      Math.random.mockRestore()
    })

    it('should create AliadoRapido when roll is >= 0.6', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.8)
      gameScene._grantNewAlly()
      const addedAlly = gameScene.allyGroup.add.mock.calls[0][0]
      expect(addedAlly.type).toBe('rapido')
      Math.random.mockRestore()
    })
  })

  describe('SaveSystem integration', () => {
    it('should instantiate saveSystem in create()', () => {
      expect(gameScene.saveSystem).toBeDefined()
      expect(gameScene.saveSystem.SLOTS).toEqual(['slot1', 'slot2', 'slot3', 'quicksave'])
    })

    it('should register F5 key handler', () => {
      expect(mockScene.input.keyboard.on).toHaveBeenCalledWith('keydown-F5', expect.any(Function))
    })

    it('should register F9 key handler', () => {
      expect(mockScene.input.keyboard.on).toHaveBeenCalledWith('keydown-F9', expect.any(Function))
    })
  })

  describe('_quicksave()', () => {
    it('should call buildGameState and save to quicksave slot', () => {
      gameScene.saveSystem.buildGameState = vi.fn(() => ({ version: '1.0' }))
      gameScene.saveSystem.save = vi.fn(() => true)
      gameScene._quicksave()
      expect(gameScene.saveSystem.buildGameState).toHaveBeenCalledWith(gameScene)
      expect(gameScene.saveSystem.save).toHaveBeenCalledWith('quicksave', { version: '1.0' })
    })

    it('should show "Partida guardada" message on success', () => {
      gameScene.saveSystem.save = vi.fn(() => true)
      gameScene._quicksave()
      expect(mockScene.add.text).toHaveBeenCalledWith(
        expect.any(Number), expect.any(Number), 'Partida guardada', expect.any(Object)
      )
    })

    it('should show "No se pudo guardar" message on failure', () => {
      gameScene.saveSystem.save = vi.fn(() => false)
      gameScene._quicksave()
      expect(mockScene.add.text).toHaveBeenCalledWith(
        expect.any(Number), expect.any(Number), 'No se pudo guardar', expect.any(Object)
      )
    })
  })

  describe('_quickload()', () => {
    it('should show "No hay guardado rápido" when quicksave slot is empty', () => {
      gameScene.saveSystem.load = vi.fn(() => null)
      gameScene._quickload()
      expect(mockScene.add.text).toHaveBeenCalledWith(
        expect.any(Number), expect.any(Number), 'No hay guardado rápido', expect.any(Object)
      )
    })

    it('should call restoreGameState when quicksave slot has data', () => {
      const state = { version: '1.0', player: { hp: 5 } }
      gameScene.saveSystem.load = vi.fn(() => state)
      gameScene.saveSystem.restoreGameState = vi.fn()
      gameScene._quickload()
      expect(gameScene.saveSystem.restoreGameState).toHaveBeenCalledWith(gameScene, state)
    })

    it('should not show message when quicksave slot has data', () => {
      const state = { version: '1.0', player: { hp: 5 } }
      gameScene.saveSystem.load = vi.fn(() => state)
      gameScene.saveSystem.restoreGameState = vi.fn()
      mockScene.add.text.mockClear()
      gameScene._quickload()
      expect(mockScene.add.text).not.toHaveBeenCalledWith(
        expect.any(Number), expect.any(Number), 'No hay guardado rápido', expect.any(Object)
      )
    })
  })

  describe('F5 key handler', () => {
    it('should trigger quicksave when F5 is pressed', () => {
      const f5Handler = mockScene._keydownHandlers['keydown-F5']
      expect(f5Handler).toBeDefined()
      gameScene._quicksave = vi.fn()
      f5Handler({ preventDefault: vi.fn() })
      expect(gameScene._quicksave).toHaveBeenCalled()
    })
  })

  describe('F9 key handler', () => {
    it('should trigger quickload when F9 is pressed', () => {
      const f9Handler = mockScene._keydownHandlers['keydown-F9']
      expect(f9Handler).toBeDefined()
      gameScene._quickload = vi.fn()
      f9Handler({ preventDefault: vi.fn() })
      expect(gameScene._quickload).toHaveBeenCalled()
    })
  })

  describe('FinalEventSystem integration', () => {
    it('should instantiate finalEventSystem in create()', () => {
      expect(gameScene.finalEventSystem).toBeDefined()
      expect(gameScene.finalEventSystem.active).toBe(false)
    })

    it('should set up overlap between player and enemyGroup', () => {
      // Player ↔ enemyGroup overlap should be registered
      const overlapCalls = mockScene.physics.add.overlap.mock.calls
      const hasPlayerEnemyOverlap = overlapCalls.some(
        call => call[0] === gameScene.player && call[1] === gameScene.enemyGroup
      )
      expect(hasPlayerEnemyOverlap).toBe(true)
    })

    it('should not start finalEventSystem on non-plaza map', () => {
      expect(gameScene.finalEventSystem.active).toBe(false)
    })
  })

  describe('_onPlayerHitEnemy()', () => {
    it('should call player.takeDamage when enemy can attack', () => {
      gameScene.player.takeDamage = vi.fn()
      const enemy = { canAttack: vi.fn(() => true), damage: 2 }
      gameScene._onPlayerHitEnemy(gameScene.player, enemy)
      expect(gameScene.player.takeDamage).toHaveBeenCalledWith(2, undefined, undefined)
    })

    it('should not damage player when enemy cannot attack', () => {
      gameScene.player.takeDamage = vi.fn()
      const enemy = { canAttack: vi.fn(() => false), damage: 2 }
      gameScene._onPlayerHitEnemy(gameScene.player, enemy)
      expect(gameScene.player.takeDamage).not.toHaveBeenCalled()
    })

    it('should default to 1 damage when enemy.damage is undefined', () => {
      gameScene.player.takeDamage = vi.fn()
      const enemy = { canAttack: vi.fn(() => true) }
      gameScene._onPlayerHitEnemy(gameScene.player, enemy)
      expect(gameScene.player.takeDamage).toHaveBeenCalledWith(1, undefined, undefined)
    })
  })

  describe('_onGameOver() stops FinalEventSystem', () => {
    it('should stop finalEventSystem on game over', () => {
      gameScene.finalEventSystem.stop = vi.fn()
      gameScene._onGameOver()
      expect(gameScene.finalEventSystem.stop).toHaveBeenCalled()
    })

    it('should still launch GameOverScene', () => {
      gameScene._onGameOver()
      expect(mockScene.scene.launch).toHaveBeenCalledWith('GameOverScene')
    })
  })

  describe('_transitionToMap() starts FinalEventSystem for Plaza Italia', () => {
    let delayedCallback

    beforeEach(() => {
      gameScene.time.delayedCall = vi.fn((delay, cb) => {
        delayedCallback = cb
        return { remove: vi.fn() }
      })

      gameScene.enemyGroup = { clear: vi.fn(), getChildren: vi.fn(() => []) }
      gameScene.powerupGroup = { clear: vi.fn(), getChildren: vi.fn(() => []) }
      gameScene.projectileGroup = { clear: vi.fn(), getChildren: vi.fn(() => []) }
      gameScene.allyGroup = { add: vi.fn(), getChildren: vi.fn(() => []), clear: vi.fn() }
      gameScene.player.setPosition = vi.fn((x, y) => {
        gameScene.player.x = x
        gameScene.player.y = y
      })
    })

    it('should start finalEventSystem when transitioning to plaza_italia', () => {
      gameScene.finalEventSystem.start = vi.fn()
      gameScene._transitionToMap('map_plaza_italia')
      delayedCallback()
      expect(gameScene.finalEventSystem.start).toHaveBeenCalledWith(90)
    })

    it('should show "Manifestación final" message when entering plaza_italia', () => {
      gameScene._transitionToMap('map_plaza_italia')
      mockScene.add.text.mockClear()
      delayedCallback()
      expect(mockScene.add.text).toHaveBeenCalledWith(
        expect.any(Number), expect.any(Number), 'Manifestación final', expect.any(Object)
      )
    })

    it('should not start finalEventSystem for non-plaza maps', () => {
      gameScene.finalEventSystem.start = vi.fn()
      gameScene._transitionToMap('map_amunategui')
      delayedCallback()
      expect(gameScene.finalEventSystem.start).not.toHaveBeenCalled()
    })
  })
})
