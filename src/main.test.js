import { describe, it, expect, vi, beforeEach } from 'vitest'
import fc from 'fast-check'

vi.mock('phaser', () => {
  class Sprite {
    constructor (scene, x, y, texture) {
      this.scene = scene; this.x = x; this.y = y; this.texture = texture
      this.active = true; this._vx = 0; this._vy = 0
    }
    setVelocity (vx, vy) { this._vx = vx; this._vy = vy }
    setCollideWorldBounds () {}
    play () {}
    destroy () { this.active = false }
    setPosition (x, y) { this.x = x; this.y = y }
  }
  class Scene { constructor (key) { this.key = typeof key === 'string' ? key : key } }
  return {
    default: { Scene, AUTO: 0, Events: { EventEmitter: class {} }, Physics: { Arcade: { Sprite } } },
    Scene, Physics: { Arcade: { Sprite } }
  }
})

vi.mock('./EventBus.js', () => ({ default: { emit: vi.fn(), on: vi.fn(), off: vi.fn() } }))
vi.mock('./entities/Projectile.js', () => ({ default: class { constructor (s, x, y, t) { this.scene = s; this.type = t; this.damage = t === 'molotov' ? 5 : 1; this.active = true }; destroy () { this.active = false } } }))
vi.mock('./systems/MapManager.js', () => ({ default: class { constructor () { this._obstacleGroup = null }; loadMap (key, scene) { if (scene && scene.physics && scene.physics.add) this._obstacleGroup = { type: 'staticGroup' }; return { key } }; getMapDimensions () { return { width: 3840, height: 2160 } }; getEntryPoint () { return { x: 192, y: 1080 } }; getObstacleLayer () { return this._obstacleGroup }; getPowerupPoints () { return [{ x: 960, y: 540 }] }; getExitZones (key) { if (key === 'map_level1') return [{ x: 3792, y: 960, width: 48, height: 192, targetMap: 'map_amunategui' }]; return [] }; getSpawnPoints () { return [{ x: 96, y: 96 }] } } }))
vi.mock('./systems/PowerupSpawnSystem.js', () => ({ default: class { constructor () {}; update () {} } }))
vi.mock('./systems/FormationSystem.js', () => ({ default: class { constructor () { this.positions = [] }; getPosition () { return { x: 0, y: 0 } }; update () {} } }))
vi.mock('./systems/SaveSystem.js', () => ({ default: class { constructor () { this.SLOTS = ['slot1', 'slot2', 'slot3', 'quicksave'] }; save () { return true }; load () { return null }; buildGameState () { return { version: '1.0' } }; restoreGameState () {} } }))
vi.mock('./systems/FinalEventSystem.js', () => ({ default: class { constructor () { this.active = false; this.remaining = 0 }; start (d) { this.active = true; this.remaining = d || 90 }; update () {}; stop () { this.active = false; this.remaining = 0 } } }))
vi.mock('./entities/AliadoEstandar.js', () => ({ default: class { constructor (s, x, y) { this.x = x; this.y = y; this.type = 'estandar'; this.hp = 10; this.maxHp = 10; this.active = true; this.isDead = false }; setPosition (x, y) { this.x = x; this.y = y } } }))
vi.mock('./entities/AliadoRapido.js', () => ({ default: class { constructor (s, x, y) { this.x = x; this.y = y; this.type = 'rapido'; this.hp = 8; this.maxHp = 8; this.active = true; this.isDead = false }; setPosition (x, y) { this.x = x; this.y = y } } }))
vi.mock('./entities/AliadoPunk.js', () => ({ default: class { constructor (s, x, y) { this.x = x; this.y = y; this.type = 'punk'; this.hp = 12; this.maxHp = 12; this.active = true; this.isDead = false }; setPosition (x, y) { this.x = x; this.y = y } } }))

describe('Project scaffolding', () => {
  it('exports all 7 scene classes', async () => {
    const m = await Promise.all([import('./scenes/BootScene.js'), import('./scenes/TitleScene.js'), import('./scenes/GameScene.js'), import('./scenes/HUDScene.js'), import('./scenes/PauseScene.js'), import('./scenes/GameOverScene.js'), import('./scenes/VictoryScene.js')])
    m.forEach(mod => expect(mod.default).toBeDefined())
  })
  it('EventBus is singleton', async () => { const { default: EB } = await import('./EventBus.js'); expect(typeof EB.on).toBe('function'); const { default: EB2 } = await import('./EventBus.js'); expect(EB).toBe(EB2) })
  it('fast-check works', () => { fc.assert(fc.property(fc.integer({ min: 0, max: 100 }), n => n >= 0 && n <= 100), { numRuns: 100 }) })
})

function createMock () {
  const kh = {}, ph = {}
  const cam = { setBounds: vi.fn(), startFollow: vi.fn(), width: 1920, height: 1080 }
  return {
    add: { existing: vi.fn(), rectangle: vi.fn(() => ({ setDepth: vi.fn(), body: { setSize: vi.fn(), setOffset: vi.fn() } })), graphics: vi.fn(() => ({ fillStyle: vi.fn(), fillRect: vi.fn(), lineStyle: vi.fn(), lineBetween: vi.fn(), setDepth: vi.fn() })), text: vi.fn(() => ({ setOrigin: vi.fn(), setDepth: vi.fn(), setScrollFactor: vi.fn(), active: true, destroy: vi.fn() })), zone: vi.fn(() => ({ targetMap: null })) },
    physics: { add: { existing: vi.fn(), group: vi.fn(() => ({ add: vi.fn(), runChildUpdate: true, clear: vi.fn(), getChildren: vi.fn(() => []) })), staticGroup: vi.fn(() => ({ add: vi.fn(), type: 'staticGroup', clear: vi.fn() })), overlap: vi.fn(), collider: vi.fn() }, world: { setBounds: vi.fn() }, pause: vi.fn(), resume: vi.fn() },
    cameras: { main: cam },
    input: { keyboard: { addKeys: vi.fn(() => ({ W: { isDown: false }, A: { isDown: false }, S: { isDown: false }, D: { isDown: false } })), on: vi.fn((e, h) => { kh[e] = h }) }, on: vi.fn((e, h) => { ph[e] = h }) },
    anims: { exists: vi.fn(() => false), create: vi.fn() },
    time: { delayedCall: vi.fn((d, cb) => ({ remove: vi.fn(), _cb: cb })) },
    scene: { launch: vi.fn(), pause: vi.fn(), resume: vi.fn(), stop: vi.fn(), start: vi.fn() },
    events: { on: vi.fn() }, _kh: kh, _ph: ph, _cam: cam
  }
}

function overlayMock () {
  return {
    add: { graphics: vi.fn(() => ({ fillStyle: vi.fn(), fillRect: vi.fn() })), text: vi.fn((x, y, c) => ({ x, y, text: c, style: {}, setOrigin: vi.fn().mockReturnThis(), setColor: vi.fn().mockReturnThis(), setScrollFactor: vi.fn().mockReturnThis(), setDepth: vi.fn().mockReturnThis(), active: true, destroy: vi.fn() })), zone: vi.fn(() => { const h = {}; return { setInteractive: vi.fn().mockReturnThis(), on: vi.fn((e, cb) => { h[e] = h[e] || []; h[e].push(cb); return { setInteractive: vi.fn().mockReturnThis(), on: vi.fn() } }), _handlers: h } }) },
    cameras: { main: { width: 1920, height: 1080 } },
    scene: { stop: vi.fn(), start: vi.fn(), resume: vi.fn(), get: vi.fn(), settings: { data: { score: 100 } } },
    time: { delayedCall: vi.fn(() => ({ remove: vi.fn() })) }
  }
}

describe('Complete game flow', () => {
  let gameScene, m
  beforeEach(async () => {
    vi.clearAllMocks()
    const { default: GS } = await import('./scenes/GameScene.js')
    gameScene = new GS(); m = createMock(); Object.assign(gameScene, m); gameScene.create()
  })
  it('3: initializes all systems', () => { expect(gameScene.spawnSystem).toBeDefined(); expect(gameScene.powerupSpawnSystem).toBeDefined(); expect(gameScene.effectSystem).toBeDefined(); expect(gameScene.formationSystem).toBeDefined(); expect(gameScene.scoreSystem).toBeDefined(); expect(gameScene.saveSystem).toBeDefined(); expect(gameScene.finalEventSystem).toBeDefined() })
  it('3: player at entry point', () => { expect(gameScene.player.x).toBe(192); expect(gameScene.player.y).toBe(1080) })
  it('3: launches HUDScene', () => { expect(m.scene.launch).toHaveBeenCalledWith('HUDScene') })
  it('3: initial map barros_arana', () => { expect(gameScene.currentMapKey).toBe('map_level1') })
  describe('4: map transition', () => {
    let dc
    beforeEach(() => {
      gameScene.time.delayedCall = vi.fn((d, cb) => { dc = cb; return { remove: vi.fn() } })
      gameScene.enemyGroup = { clear: vi.fn(), getChildren: vi.fn(() => []) }
      gameScene.powerupGroup = { clear: vi.fn(), getChildren: vi.fn(() => []) }
      gameScene.projectileGroup = { clear: vi.fn(), getChildren: vi.fn(() => []) }
      gameScene.allyGroup = { add: vi.fn(), getChildren: vi.fn(() => []) }
      gameScene.player.setPosition = vi.fn((x, y) => { gameScene.player.x = x; gameScene.player.y = y })
    })
    it('emits map:transition', async () => { const EB = (await import('./EventBus.js')).default; EB.emit.mockClear(); gameScene._transitionToMap('map_amunategui'); expect(EB.emit).toHaveBeenCalledWith('map:transition', { mapKey: 'map_amunategui' }) })
    it('clears groups', () => { gameScene._isTransitioning = false; gameScene._transitionToMap('map_amunategui'); dc(); expect(gameScene.enemyGroup.clear).toHaveBeenCalledWith(true, true); expect(gameScene.powerupGroup.clear).toHaveBeenCalledWith(true, true); expect(gameScene.projectileGroup.clear).toHaveBeenCalledWith(true, true) })
    it('preserves state', () => { gameScene.player.hp = 7; gameScene.globalCounter.molotovs = 3; gameScene.scoreSystem.score = 500; gameScene.totalTime = 180; gameScene._isTransitioning = false; gameScene._transitionToMap('map_amunategui'); dc(); expect(gameScene.player.hp).toBe(7); expect(gameScene.globalCounter.molotovs).toBe(3); expect(gameScene.scoreSystem.score).toBe(500); expect(gameScene.totalTime).toBe(180) })
    it('grants ally', () => { gameScene._isTransitioning = false; gameScene._transitionToMap('map_amunategui'); dc(); expect(gameScene.allyGroup.add).toHaveBeenCalled() })
  })
  it('6: launches GameOverScene', () => { gameScene._onGameOver(); expect(m.scene.launch).toHaveBeenCalledWith('GameOverScene') })
  it('6: stops FinalEventSystem on gameover', () => { gameScene.finalEventSystem.stop = vi.fn(); gameScene._onGameOver(); expect(gameScene.finalEventSystem.stop).toHaveBeenCalled() })
  it('6: registers gameover listener', async () => { const EB = (await import('./EventBus.js')).default; expect(EB.on.mock.calls.some(c => c[0] === 'gameover')).toBe(true) })
  it('9: ESC pauses and launches PauseScene', () => { m._kh['keydown-ESC'](); expect(m.physics.pause).toHaveBeenCalled(); expect(m.scene.pause).toHaveBeenCalledWith('GameScene'); expect(m.scene.launch).toHaveBeenCalledWith('PauseScene') })
})

describe('7: VictoryScene buttons', () => {
  let vs, mock
  beforeEach(async () => { vi.clearAllMocks(); const { default: VS } = await import('./scenes/VictoryScene.js'); vs = new VS(); mock = overlayMock(); Object.assign(vs, mock); vs.create() })
  it('Jugar nuevamente restarts GameScene', () => { vs.menuButtons.find(b => b.label === 'Jugar nuevamente').hitZone._handlers.pointerdown[0](); expect(mock.scene.stop).toHaveBeenCalledWith('VictoryScene'); expect(mock.scene.start).toHaveBeenCalledWith('GameScene') })
  it('Menu principal goes to TitleScene', () => { vs.menuButtons.find(b => b.label === 'Menu principal' || b.label === 'Men\u00fa principal').hitZone._handlers.pointerdown[0](); expect(mock.scene.start).toHaveBeenCalledWith('TitleScene') })
})

describe('8: GameOverScene buttons', () => {
  let gos, mock
  beforeEach(async () => { vi.clearAllMocks(); const { default: GOS } = await import('./scenes/GameOverScene.js'); gos = new GOS(); mock = overlayMock(); Object.assign(gos, mock); gos.create() })
  it('Reintentar restarts GameScene', () => { gos.menuButtons.find(b => b.label === 'Reintentar').hitZone._handlers.pointerdown[0](); expect(mock.scene.stop).toHaveBeenCalledWith('GameOverScene'); expect(mock.scene.start).toHaveBeenCalledWith('GameScene') })
  it('Menu principal goes to TitleScene', () => { gos.menuButtons.find(b => b.label === 'Menu principal' || b.label === 'Men\u00fa principal').hitZone._handlers.pointerdown[0](); expect(mock.scene.start).toHaveBeenCalledWith('TitleScene') })
})

describe('9b: PauseScene Continuar', () => {
  it('resumes GameScene', async () => { vi.clearAllMocks(); const { default: PS } = await import('./scenes/PauseScene.js'); const ps = new PS(); const mock = overlayMock(); Object.assign(ps, mock); ps.create(); ps.menuButtons.find(b => b.label === 'Continuar').hitZone._handlers.pointerdown[0](); expect(mock.scene.resume).toHaveBeenCalledWith('GameScene'); expect(mock.scene.stop).toHaveBeenCalledWith('PauseScene') })
})
