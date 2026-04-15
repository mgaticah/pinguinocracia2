import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('phaser', () => {
  class Scene {
    constructor (key) {
      this.key = typeof key === 'string' ? key : key
    }
  }

  return {
    default: { Scene, AUTO: 0, Events: { EventEmitter: class {} } },
    Scene
  }
})

function createMockPauseScene () {
  const handlers = {}
  const cameraMock = { width: 1920, height: 1080 }

  return {
    add: {
      graphics: vi.fn(() => ({
        fillStyle: vi.fn().mockReturnThis(),
        fillRect: vi.fn().mockReturnThis(),
        fillRoundedRect: vi.fn().mockReturnThis(),
        lineStyle: vi.fn().mockReturnThis(),
        strokeRoundedRect: vi.fn().mockReturnThis(),
        clear: vi.fn().mockReturnThis()
      })),
      text: vi.fn((x, y, content, style) => {
        const textObj = {
          x, y, text: content, style,
          setOrigin: vi.fn().mockReturnThis(),
          setColor: vi.fn().mockReturnThis(),
          setScrollFactor: vi.fn().mockReturnThis(),
          setDepth: vi.fn().mockReturnThis(),
          active: true,
          destroy: vi.fn()
        }
        return textObj
      }),
      zone: vi.fn((x, y, w, h) => {
        const zoneHandlers = {}
        const zone = {
          x, y, width: w, height: h,
          setInteractive: vi.fn().mockReturnThis(),
          on: vi.fn((event, cb) => {
            zoneHandlers[event] = zoneHandlers[event] || []
            zoneHandlers[event].push(cb)
            return zone
          }),
          _handlers: zoneHandlers
        }
        return zone
      })
    },
    cameras: { main: cameraMock },
    scene: {
      resume: vi.fn(),
      stop: vi.fn(),
      start: vi.fn(),
      get: vi.fn()
    },
    time: {
      delayedCall: vi.fn((delay, cb) => {
        return { remove: vi.fn() }
      })
    },
    _handlers: handlers,
    _cameraMock: cameraMock
  }
}

describe('PauseScene', () => {
  let PauseScene, pauseScene, mockScene

  beforeEach(async () => {
    vi.clearAllMocks()
    const mod = await import('./PauseScene.js')
    PauseScene = mod.default
    pauseScene = new PauseScene()

    mockScene = createMockPauseScene()
    Object.assign(pauseScene, mockScene)

    pauseScene.create()
  })

  describe('create()', () => {
    it('should create a dark overlay', () => {
      expect(mockScene.add.graphics).toHaveBeenCalled()
    })

    it('should create title text "PAUSA"', () => {
      expect(pauseScene.titleText).toBeDefined()
      expect(pauseScene.titleText.text).toBe('PAUSA')
    })

    it('should use monospace font for title', () => {
      expect(pauseScene.titleText.style.fontFamily).toBe('monospace')
    })

    it('should use white color for title', () => {
      expect(pauseScene.titleText.style.color).toBe('#ffffff')
    })

    it('should create exactly 4 menu buttons', () => {
      expect(pauseScene.menuButtons).toHaveLength(4)
    })

    it('should create buttons with correct labels', () => {
      const labels = pauseScene.menuButtons.map(b => b.label)
      expect(labels).toEqual(['Continuar', 'Guardar partida', 'Cargar partida', 'Salir al menú principal'])
    })

    it('should make buttons interactive', () => {
      for (const btn of pauseScene.menuButtons) {
        expect(btn.hitZone.setInteractive).toHaveBeenCalled()
      }
    })

    it('should register hover handlers on buttons', () => {
      for (const btn of pauseScene.menuButtons) {
        expect(btn.hitZone._handlers.pointerover).toBeDefined()
        expect(btn.hitZone._handlers.pointerout).toBeDefined()
      }
    })
  })

  describe('button actions', () => {
    it('"Continuar" should resume GameScene and stop PauseScene', () => {
      const btn = pauseScene.menuButtons.find(b => b.label === 'Continuar')
      btn.hitZone._handlers.pointerdown[0]()
      expect(mockScene.scene.resume).toHaveBeenCalledWith('GameScene')
      expect(mockScene.scene.stop).toHaveBeenCalledWith('PauseScene')
    })

    it('"Guardar partida" should call saveSystem on GameScene', () => {
      const mockGameScene = {
        saveSystem: {
          buildGameState: vi.fn(() => ({ version: '1.0' })),
          save: vi.fn(() => true)
        }
      }
      mockScene.scene.get.mockReturnValue(mockGameScene)

      const btn = pauseScene.menuButtons.find(b => b.label === 'Guardar partida')
      btn.hitZone._handlers.pointerdown[0]()

      expect(mockGameScene.saveSystem.buildGameState).toHaveBeenCalledWith(mockGameScene)
      expect(mockGameScene.saveSystem.save).toHaveBeenCalledWith('quicksave', { version: '1.0' })
    })

    it('"Guardar partida" should show success message', () => {
      const mockGameScene = {
        saveSystem: {
          buildGameState: vi.fn(() => ({ version: '1.0' })),
          save: vi.fn(() => true)
        }
      }
      mockScene.scene.get.mockReturnValue(mockGameScene)

      const btn = pauseScene.menuButtons.find(b => b.label === 'Guardar partida')
      btn.hitZone._handlers.pointerdown[0]()

      expect(mockScene.add.text).toHaveBeenCalledWith(
        expect.any(Number), expect.any(Number), 'Partida guardada', expect.any(Object)
      )
    })

    it('"Guardar partida" should show error message on failure', () => {
      const mockGameScene = {
        saveSystem: {
          buildGameState: vi.fn(() => ({ version: '1.0' })),
          save: vi.fn(() => false)
        }
      }
      mockScene.scene.get.mockReturnValue(mockGameScene)

      const btn = pauseScene.menuButtons.find(b => b.label === 'Guardar partida')
      btn.hitZone._handlers.pointerdown[0]()

      expect(mockScene.add.text).toHaveBeenCalledWith(
        expect.any(Number), expect.any(Number), 'No se pudo guardar', expect.any(Object)
      )
    })

    it('"Cargar partida" should load from quicksave and resume', () => {
      const mockGameScene = {
        saveSystem: {
          load: vi.fn(() => ({ version: '1.0', player: { hp: 5 } })),
          restoreGameState: vi.fn()
        }
      }
      mockScene.scene.get.mockReturnValue(mockGameScene)

      const btn = pauseScene.menuButtons.find(b => b.label === 'Cargar partida')
      btn.hitZone._handlers.pointerdown[0]()

      expect(mockGameScene.saveSystem.load).toHaveBeenCalledWith('quicksave')
      expect(mockGameScene.saveSystem.restoreGameState).toHaveBeenCalledWith(mockGameScene, expect.any(Object))
      expect(mockScene.scene.resume).toHaveBeenCalledWith('GameScene')
      expect(mockScene.scene.stop).toHaveBeenCalledWith('PauseScene')
    })

    it('"Cargar partida" should show message when no save exists', () => {
      const mockGameScene = {
        saveSystem: {
          load: vi.fn(() => null)
        }
      }
      mockScene.scene.get.mockReturnValue(mockGameScene)

      const btn = pauseScene.menuButtons.find(b => b.label === 'Cargar partida')
      btn.hitZone._handlers.pointerdown[0]()

      expect(mockScene.add.text).toHaveBeenCalledWith(
        expect.any(Number), expect.any(Number), 'No hay guardado rápido', expect.any(Object)
      )
    })

    it('"Salir al menú principal" should stop GameScene and start TitleScene', () => {
      const btn = pauseScene.menuButtons.find(b => b.label === 'Salir al menú principal')
      btn.hitZone._handlers.pointerdown[0]()
      expect(mockScene.scene.stop).toHaveBeenCalledWith('GameScene')
      expect(mockScene.scene.start).toHaveBeenCalledWith('TitleScene')
    })
  })
})
