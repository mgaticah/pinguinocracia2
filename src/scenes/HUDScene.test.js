import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock Phaser before importing HUDScene
vi.mock('phaser', () => {
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
          Sprite: class {}
        }
      }
    },
    Scene
  }
})

// Track EventBus subscriptions so we can emit events in tests
const eventHandlers = {}

function emitEvent (event, data) {
  if (eventHandlers[event]) {
    eventHandlers[event].forEach(fn => fn(data))
  }
}

vi.mock('../EventBus.js', () => ({
  default: {
    emit: vi.fn((event, data) => emitEvent(event, data)),
    on: vi.fn((event, handler) => {
      if (!eventHandlers[event]) eventHandlers[event] = []
      eventHandlers[event].push(handler)
    }),
    off: vi.fn((event, handler) => {
      if (eventHandlers[event]) {
        eventHandlers[event] = eventHandlers[event].filter(h => h !== handler)
      }
    })
  }
}))

function createMockGraphics () {
  return {
    clear: vi.fn(),
    fillStyle: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    lineStyle: vi.fn(),
    fillCircle: vi.fn(),
    setVisible: vi.fn(function (v) { this._visible = v; return this }),
    setDepth: vi.fn(),
    destroy: vi.fn(),
    _visible: true
  }
}

function createMockText (initialText) {
  return {
    _text: initialText || '',
    _alpha: 1,
    _visible: true,
    setText: vi.fn(function (t) { this._text = t; return this }),
    setOrigin: vi.fn(function () { return this }),
    setPosition: vi.fn(function () { return this }),
    setAlpha: vi.fn(function (a) { this._alpha = a; return this }),
    setVisible: vi.fn(function (v) { this._visible = v; return this }),
    setDepth: vi.fn(function () { return this }),
    destroy: vi.fn()
  }
}

function createMockGroup () {
  const children = []
  return {
    add: vi.fn((child) => children.push(child)),
    clear: vi.fn((removeFromScene, destroyChild) => {
      if (destroyChild) children.forEach(c => c.destroy && c.destroy())
      children.length = 0
    }),
    getChildren: vi.fn(() => [...children]),
    _children: children
  }
}

function setupHUDScene () {
  // Clear event handlers from previous tests
  Object.keys(eventHandlers).forEach(k => delete eventHandlers[k])

  const timers = []
  const mockScene = {
    add: {
      graphics: vi.fn(() => createMockGraphics()),
      text: vi.fn((x, y, text, style) => createMockText(text)),
      group: vi.fn(() => createMockGroup())
    },
    scale: { width: 1920, height: 1080 },
    time: {
      delayedCall: vi.fn((delay, callback) => {
        const timer = { delay, callback, remove: vi.fn() }
        timers.push(timer)
        return timer
      })
    }
  }

  return { mockScene, timers }
}

describe('HUDScene', () => {
  let HUDScene, hudScene

  beforeEach(async () => {
    vi.clearAllMocks()
    Object.keys(eventHandlers).forEach(k => delete eventHandlers[k])
    const mod = await import('./HUDScene.js')
    HUDScene = mod.default
    hudScene = new HUDScene()
  })

  afterEach(() => {
    if (hudScene && hudScene.shutdown) {
      hudScene.shutdown()
    }
  })

  describe('create() — initial state', () => {
    it('should create HP bar graphics', () => {
      const { mockScene } = setupHUDScene()
      Object.assign(hudScene, mockScene)
      hudScene.create()

      expect(hudScene.hpBar).toBeDefined()
      expect(hudScene.hpBar.fillRect).toHaveBeenCalled()
    })

    it('should create score text with initial value 0', () => {
      const { mockScene } = setupHUDScene()
      Object.assign(hudScene, mockScene)
      hudScene.create()

      expect(hudScene.scoreText).toBeDefined()
      expect(hudScene.scoreText._text).toBe('Puntaje: 0')
    })

    it('should create molotov counter with initial value 0', () => {
      const { mockScene } = setupHUDScene()
      Object.assign(hudScene, mockScene)
      hudScene.create()

      expect(hudScene.molotovCounter).toBeDefined()
      expect(hudScene.molotovCounter._text).toBe('🔥 x0')
    })

    it('should create weapon text showing piedra', () => {
      const { mockScene } = setupHUDScene()
      Object.assign(hudScene, mockScene)
      hudScene.create()

      expect(hudScene.weaponIcon).toBeDefined()
      expect(hudScene.weaponIcon._text).toBe('Arma: piedra')
    })

    it('should create map name text hidden (alpha 0)', () => {
      const { mockScene } = setupHUDScene()
      Object.assign(hudScene, mockScene)
      hudScene.create()

      expect(hudScene.mapNameText).toBeDefined()
      expect(hudScene.mapNameText._alpha).toBe(0)
    })

    it('should create energetica bar hidden by default', () => {
      const { mockScene } = setupHUDScene()
      Object.assign(hudScene, mockScene)
      hudScene.create()

      expect(hudScene.energeticaBar).toBeDefined()
      expect(hudScene.energeticaBar.setVisible).toHaveBeenCalledWith(false)
    })

    it('should create final timer text hidden by default', () => {
      const { mockScene } = setupHUDScene()
      Object.assign(hudScene, mockScene)
      hudScene.create()

      expect(hudScene.finalTimerText).toBeDefined()
      expect(hudScene.finalTimerText._visible).toBe(false)
    })

    it('should have HP at full (10/10) initially', () => {
      const { mockScene } = setupHUDScene()
      Object.assign(hudScene, mockScene)
      hudScene.create()

      expect(hudScene._hp).toBe(10)
      expect(hudScene._maxHp).toBe(10)
    })
  })

  describe('EventBus: player:damaged', () => {
    it('should update HP bar when player takes damage', () => {
      const { mockScene } = setupHUDScene()
      Object.assign(hudScene, mockScene)
      hudScene.create()

      emitEvent('player:damaged', { amount: 3, hp: 7 })

      expect(hudScene._hp).toBe(7)
      expect(hudScene.hpBar.clear).toHaveBeenCalled()
    })
  })

  describe('EventBus: player:healed', () => {
    it('should update HP bar when player is healed', () => {
      const { mockScene } = setupHUDScene()
      Object.assign(hudScene, mockScene)
      hudScene.create()

      hudScene._hp = 5
      emitEvent('player:healed', { amount: 3, hp: 8 })

      expect(hudScene._hp).toBe(8)
      expect(hudScene.hpBar.clear).toHaveBeenCalled()
    })
  })

  describe('EventBus: molotov:changed', () => {
    it('should update molotov counter text', () => {
      const { mockScene } = setupHUDScene()
      Object.assign(hudScene, mockScene)
      hudScene.create()

      emitEvent('molotov:changed', { count: 5 })

      expect(hudScene.molotovCounter.setText).toHaveBeenCalledWith('🔥 x5')
      expect(hudScene._molotovs).toBe(5)
    })
  })

  describe('EventBus: weapon:changed', () => {
    it('should update weapon text', () => {
      const { mockScene } = setupHUDScene()
      Object.assign(hudScene, mockScene)
      hudScene.create()

      emitEvent('weapon:changed', { weapon: 'molotov' })

      expect(hudScene.weaponIcon.setText).toHaveBeenCalledWith('Arma: molotov')
      expect(hudScene._weapon).toBe('molotov')
    })
  })

  describe('EventBus: score:changed', () => {
    it('should update score text', () => {
      const { mockScene } = setupHUDScene()
      Object.assign(hudScene, mockScene)
      hudScene.create()

      emitEvent('score:changed', { score: 150, delta: 10 })

      expect(hudScene.scoreText.setText).toHaveBeenCalledWith('Puntaje: 150')
      expect(hudScene._score).toBe(150)
    })
  })

  describe('EventBus: energetica:tick', () => {
    it('should show energetica bar when remaining > 0', () => {
      const { mockScene } = setupHUDScene()
      Object.assign(hudScene, mockScene)
      hudScene.create()

      emitEvent('energetica:tick', { remaining: 4.5 })

      expect(hudScene.energeticaBar.setVisible).toHaveBeenCalledWith(true)
      expect(hudScene._energeticaRemaining).toBe(4.5)
    })

    it('should hide energetica bar when remaining is 0', () => {
      const { mockScene } = setupHUDScene()
      Object.assign(hudScene, mockScene)
      hudScene.create()

      emitEvent('energetica:tick', { remaining: 0 })

      expect(hudScene.energeticaBar.setVisible).toHaveBeenCalledWith(false)
    })
  })

  describe('EventBus: finalevent:tick', () => {
    it('should update final timer via setFinalTimer when finalevent:tick fires', () => {
      const { mockScene } = setupHUDScene()
      Object.assign(hudScene, mockScene)
      hudScene.create()

      emitEvent('finalevent:tick', { remaining: 42.5 })

      expect(hudScene.finalTimerText._visible).toBe(true)
      expect(hudScene.finalTimerText.setText).toHaveBeenCalledWith('⏱ 43s')
      expect(hudScene._finalTimerRemaining).toBe(42.5)
    })
  })

  describe('EventBus: map:transition', () => {
    it('should show map name and schedule fade after 2s', () => {
      const { mockScene, timers } = setupHUDScene()
      Object.assign(hudScene, mockScene)
      hudScene.create()

      emitEvent('map:transition', { mapKey: 'map_lastarria' })

      expect(hudScene.mapNameText.setText).toHaveBeenCalledWith('Lastarria')
      expect(hudScene.mapNameText.setAlpha).toHaveBeenCalledWith(1)
      expect(timers.length).toBeGreaterThan(0)
      expect(timers[timers.length - 1].delay).toBe(2000)
    })

    it('should fade map name after timer fires', () => {
      const { mockScene, timers } = setupHUDScene()
      Object.assign(hudScene, mockScene)
      hudScene.create()

      emitEvent('map:transition', { mapKey: 'map_plaza_italia' })

      const timer = timers[timers.length - 1]
      timer.callback()

      expect(hudScene.mapNameText.setAlpha).toHaveBeenCalledWith(0)
    })
  })

  describe('EventBus: ally:died', () => {
    it('should decrement ally count', () => {
      const { mockScene } = setupHUDScene()
      Object.assign(hudScene, mockScene)
      hudScene.create()

      hudScene.setAllyCount(3)
      expect(hudScene._allyCount).toBe(3)

      emitEvent('ally:died', { ally: {} })

      expect(hudScene._allyCount).toBe(2)
    })

    it('should not go below 0 allies', () => {
      const { mockScene } = setupHUDScene()
      Object.assign(hudScene, mockScene)
      hudScene.create()

      hudScene._allyCount = 0
      emitEvent('ally:died', { ally: {} })

      expect(hudScene._allyCount).toBe(0)
    })
  })

  describe('setAllyCount()', () => {
    it('should set ally count and draw icons', () => {
      const { mockScene } = setupHUDScene()
      Object.assign(hudScene, mockScene)
      hudScene.create()

      hudScene.setAllyCount(2)
      expect(hudScene._allyCount).toBe(2)
      expect(hudScene.allyIcons.clear).toHaveBeenCalled()
    })
  })

  describe('setFinalTimer()', () => {
    it('should show timer when remaining > 0', () => {
      const { mockScene } = setupHUDScene()
      Object.assign(hudScene, mockScene)
      hudScene.create()

      hudScene.setFinalTimer(45)
      expect(hudScene.finalTimerText._visible).toBe(true)
      expect(hudScene.finalTimerText.setText).toHaveBeenCalledWith('⏱ 45s')
    })

    it('should hide timer when remaining is 0', () => {
      const { mockScene } = setupHUDScene()
      Object.assign(hudScene, mockScene)
      hudScene.create()

      hudScene.setFinalTimer(0)
      expect(hudScene.finalTimerText._visible).toBe(false)
    })
  })

  describe('shutdown()', () => {
    it('should unsubscribe from all EventBus events', async () => {
      const { mockScene } = setupHUDScene()
      Object.assign(hudScene, mockScene)
      hudScene.create()

      const EventBus = (await import('../EventBus.js')).default
      hudScene.shutdown()

      expect(EventBus.off).toHaveBeenCalledWith('player:damaged', expect.any(Function))
      expect(EventBus.off).toHaveBeenCalledWith('player:healed', expect.any(Function))
      expect(EventBus.off).toHaveBeenCalledWith('enemy:killed', expect.any(Function))
      expect(EventBus.off).toHaveBeenCalledWith('ally:died', expect.any(Function))
      expect(EventBus.off).toHaveBeenCalledWith('molotov:changed', expect.any(Function))
      expect(EventBus.off).toHaveBeenCalledWith('weapon:changed', expect.any(Function))
      expect(EventBus.off).toHaveBeenCalledWith('map:transition', expect.any(Function))
      expect(EventBus.off).toHaveBeenCalledWith('powerup:collected', expect.any(Function))
      expect(EventBus.off).toHaveBeenCalledWith('energetica:tick', expect.any(Function))
      expect(EventBus.off).toHaveBeenCalledWith('score:changed', expect.any(Function))
      expect(EventBus.off).toHaveBeenCalledWith('finalevent:tick', expect.any(Function))
    })
  })
})
