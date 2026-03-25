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

function createMockVictoryScene (score = 0) {
  const cameraMock = { width: 1920, height: 1080 }

  return {
    add: {
      graphics: vi.fn(() => ({
        fillStyle: vi.fn().mockReturnThis(),
        fillRect: vi.fn().mockReturnThis()
      })),
      text: vi.fn((x, y, content, style) => {
        const textObj = {
          x, y, text: content, style,
          setOrigin: vi.fn().mockReturnThis(),
          setColor: vi.fn().mockReturnThis()
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
      settings: { data: { score } }
    },
    _cameraMock: cameraMock
  }
}

describe('VictoryScene', () => {
  let VictoryScene, victoryScene, mockScene

  beforeEach(async () => {
    vi.clearAllMocks()
    const mod = await import('./VictoryScene.js')
    VictoryScene = mod.default
    victoryScene = new VictoryScene()

    mockScene = createMockVictoryScene(1250)
    Object.assign(victoryScene, mockScene)

    victoryScene.create()
  })

  describe('create()', () => {
    it('should create a dark overlay', () => {
      expect(mockScene.add.graphics).toHaveBeenCalled()
    })

    it('should create title text "PINGÜINOCRACIA 2"', () => {
      expect(victoryScene.titleText).toBeDefined()
      expect(victoryScene.titleText.text).toBe('PINGÜINOCRACIA 2')
    })

    it('should create subtitle "Manifestación completada"', () => {
      expect(victoryScene.subtitleText).toBeDefined()
      expect(victoryScene.subtitleText.text).toBe('Manifestación completada')
    })

    it('should display the score', () => {
      expect(victoryScene.scoreText).toBeDefined()
      expect(victoryScene.scoreText.text).toBe('Puntaje final: 1250')
    })

    it('should use monospace font for title (EstiloSketch)', () => {
      expect(victoryScene.titleText.style.fontFamily).toBe('monospace')
    })

    it('should use EstiloSketch color #1a3a6b for title', () => {
      expect(victoryScene.titleText.style.color).toBe('#1a3a6b')
    })

    it('should use monospace font for subtitle (EstiloSketch)', () => {
      expect(victoryScene.subtitleText.style.fontFamily).toBe('monospace')
    })

    it('should use monospace font for score (EstiloSketch)', () => {
      expect(victoryScene.scoreText.style.fontFamily).toBe('monospace')
    })

    it('should create exactly 2 menu buttons', () => {
      expect(victoryScene.menuButtons).toHaveLength(2)
    })

    it('should create buttons with correct labels', () => {
      const labels = victoryScene.menuButtons.map(b => b.label)
      expect(labels).toEqual(['Jugar nuevamente', 'Menú principal'])
    })

    it('should make buttons interactive', () => {
      for (const btn of victoryScene.menuButtons) {
        expect(btn.hitZone.setInteractive).toHaveBeenCalled()
      }
    })

    it('should register hover handlers on buttons', () => {
      for (const btn of victoryScene.menuButtons) {
        expect(btn.hitZone._handlers.pointerover).toBeDefined()
        expect(btn.hitZone._handlers.pointerout).toBeDefined()
      }
    })

    it('should default score to 0 when no data is passed', async () => {
      const mod = await import('./VictoryScene.js')
      const scene = new mod.default()
      const mock = createMockVictoryScene(0)
      mock.scene.settings = { data: null }
      Object.assign(scene, mock)
      scene.create()
      expect(scene.scoreText.text).toBe('Puntaje final: 0')
    })
  })

  describe('button actions', () => {
    it('"Jugar nuevamente" should stop VictoryScene, stop GameScene, and start GameScene', () => {
      const btn = victoryScene.menuButtons.find(b => b.label === 'Jugar nuevamente')
      btn.hitZone._handlers.pointerdown[0]()
      expect(mockScene.scene.stop).toHaveBeenCalledWith('VictoryScene')
      expect(mockScene.scene.stop).toHaveBeenCalledWith('GameScene')
      expect(mockScene.scene.start).toHaveBeenCalledWith('GameScene')
    })

    it('"Menú principal" should stop VictoryScene, stop GameScene, and start TitleScene', () => {
      const btn = victoryScene.menuButtons.find(b => b.label === 'Menú principal')
      btn.hitZone._handlers.pointerdown[0]()
      expect(mockScene.scene.stop).toHaveBeenCalledWith('VictoryScene')
      expect(mockScene.scene.stop).toHaveBeenCalledWith('GameScene')
      expect(mockScene.scene.start).toHaveBeenCalledWith('TitleScene')
    })
  })

  describe('hover effects', () => {
    it('should change text color to white on pointerover', () => {
      const btn = victoryScene.menuButtons[0]
      btn.hitZone._handlers.pointerover[0]()
      expect(btn.text.setColor).toHaveBeenCalledWith('#ffffff')
    })

    it('should restore text color to #1a3a6b on pointerout', () => {
      const btn = victoryScene.menuButtons[0]
      btn.hitZone._handlers.pointerout[0]()
      expect(btn.text.setColor).toHaveBeenCalledWith('#1a3a6b')
    })
  })
})
