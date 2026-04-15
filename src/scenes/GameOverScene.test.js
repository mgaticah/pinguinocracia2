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

function createMockGameOverScene () {
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
      stop: vi.fn(),
      start: vi.fn(),
      get: vi.fn()
    },
    time: {
      delayedCall: vi.fn((delay, cb) => {
        return { remove: vi.fn() }
      })
    },
    _cameraMock: cameraMock
  }
}

describe('GameOverScene', () => {
  let GameOverScene, gameOverScene, mockScene

  beforeEach(async () => {
    vi.clearAllMocks()
    const mod = await import('./GameOverScene.js')
    GameOverScene = mod.default
    gameOverScene = new GameOverScene()

    mockScene = createMockGameOverScene()
    Object.assign(gameOverScene, mockScene)

    gameOverScene.create()
  })

  describe('create()', () => {
    it('should create a dark overlay', () => {
      expect(mockScene.add.graphics).toHaveBeenCalled()
    })

    it('should create title text "GAME OVER"', () => {
      expect(gameOverScene.titleText).toBeDefined()
      expect(gameOverScene.titleText.text).toBe('GAME OVER')
    })

    it('should use monospace font for title (EstiloSketch)', () => {
      expect(gameOverScene.titleText.style.fontFamily).toBe('monospace')
    })

    it('should use white color for title', () => {
      expect(gameOverScene.titleText.style.color).toBe('#ffffff')
    })

    it('should create exactly 3 menu buttons', () => {
      expect(gameOverScene.menuButtons).toHaveLength(3)
    })

    it('should create buttons with correct labels', () => {
      const labels = gameOverScene.menuButtons.map(b => b.label)
      expect(labels).toEqual(['Reintentar', 'Cargar partida', 'Menú principal'])
    })

    it('should make buttons interactive', () => {
      for (const btn of gameOverScene.menuButtons) {
        expect(btn.hitZone.setInteractive).toHaveBeenCalled()
      }
    })

    it('should register hover handlers on buttons', () => {
      for (const btn of gameOverScene.menuButtons) {
        expect(btn.hitZone._handlers.pointerover).toBeDefined()
        expect(btn.hitZone._handlers.pointerout).toBeDefined()
      }
    })
  })

  describe('button actions', () => {
    it('"Reintentar" should stop GameOverScene, stop GameScene, and start GameScene', () => {
      const btn = gameOverScene.menuButtons.find(b => b.label === 'Reintentar')
      btn.hitZone._handlers.pointerdown[0]()
      expect(mockScene.scene.stop).toHaveBeenCalledWith('GameOverScene')
      expect(mockScene.scene.stop).toHaveBeenCalledWith('GameScene')
      expect(mockScene.scene.start).toHaveBeenCalledWith('GameScene')
    })

    it('"Cargar partida" should load from quicksave and restart', () => {
      const mockGameScene = {
        saveSystem: {
          load: vi.fn(() => ({ version: '1.0', player: { hp: 5 } }))
        }
      }
      mockScene.scene.get.mockReturnValue(mockGameScene)

      const btn = gameOverScene.menuButtons.find(b => b.label === 'Cargar partida')
      btn.hitZone._handlers.pointerdown[0]()

      expect(mockGameScene.saveSystem.load).toHaveBeenCalledWith('quicksave')
      expect(mockScene.scene.stop).toHaveBeenCalledWith('GameOverScene')
      expect(mockScene.scene.start).toHaveBeenCalledWith('GameScene')
    })

    it('"Cargar partida" should show message when no save exists', () => {
      const mockGameScene = {
        saveSystem: {
          load: vi.fn(() => null)
        }
      }
      mockScene.scene.get.mockReturnValue(mockGameScene)

      const btn = gameOverScene.menuButtons.find(b => b.label === 'Cargar partida')
      btn.hitZone._handlers.pointerdown[0]()

      expect(mockScene.add.text).toHaveBeenCalledWith(
        expect.any(Number), expect.any(Number), 'No hay guardado rápido', expect.any(Object)
      )
    })

    it('"Menú principal" should stop scenes and start TitleScene', () => {
      const btn = gameOverScene.menuButtons.find(b => b.label === 'Menú principal')
      btn.hitZone._handlers.pointerdown[0]()
      expect(mockScene.scene.stop).toHaveBeenCalledWith('GameOverScene')
      expect(mockScene.scene.stop).toHaveBeenCalledWith('GameScene')
      expect(mockScene.scene.start).toHaveBeenCalledWith('TitleScene')
    })
  })
})
