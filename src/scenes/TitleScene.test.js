import { describe, it, expect, vi, beforeEach } from 'vitest'

// Lightweight Phaser mock for Node environment
vi.mock('phaser', () => {
  class Scene {
    constructor (key) {
      this.key = typeof key === 'string' ? key : key
      this.scene = { start: vi.fn() }
      this.scale = { width: 1920, height: 1080 }
      this._gameObjects = []
      this.add = {
        graphics: () => {
          const gfx = {
            fillStyle: vi.fn().mockReturnThis(),
            fillRect: vi.fn().mockReturnThis(),
            fillRoundedRect: vi.fn().mockReturnThis(),
            lineStyle: vi.fn().mockReturnThis(),
            strokePath: vi.fn().mockReturnThis(),
            strokeRoundedRect: vi.fn().mockReturnThis(),
            beginPath: vi.fn().mockReturnThis(),
            moveTo: vi.fn().mockReturnThis(),
            lineTo: vi.fn().mockReturnThis(),
            clear: vi.fn().mockReturnThis(),
            destroy: vi.fn()
          }
          return gfx
        },
        text: (x, y, content, style) => {
          const textObj = {
            x, y, text: content, style,
            setOrigin: vi.fn().mockReturnThis(),
            setColor: vi.fn().mockReturnThis()
          }
          return textObj
        },
        zone: (x, y, w, h) => {
          const handlers = {}
          const zone = {
            x, y, width: w, height: h,
            setInteractive: vi.fn().mockReturnThis(),
            on: vi.fn((event, cb) => {
              handlers[event] = handlers[event] || []
              handlers[event].push(cb)
              return zone
            }),
            _handlers: handlers
          }
          return zone
        }
      }
      this.tweens = {
        add: vi.fn()
      }
    }
  }

  return {
    default: { Scene, AUTO: 0, Events: { EventEmitter: class {} }, Game: class {} },
    Scene
  }
})

describe('TitleScene', () => {
  let scene

  beforeEach(async () => {
    vi.resetModules()
    const { default: TitleScene } = await import('./TitleScene.js')
    scene = new TitleScene()
  })

  it('should have scene key "TitleScene"', () => {
    expect(scene.key).toBe('TitleScene')
  })

  it('should create logo text "PINGÜINOCRACIA 2"', () => {
    scene.create()
    expect(scene.logoText).toBeDefined()
    expect(scene.logoText.text).toBe('PINGÜINOCRACIA 2')
  })

  it('should create subtitle text', () => {
    scene.create()
    expect(scene.subtitleText).toBeDefined()
    expect(scene.subtitleText.text).toBe('escape por santiago centro')
  })

  it('should add a wobble tween to the logo', () => {
    scene.create()
    expect(scene.tweens.add).toHaveBeenCalledWith(
      expect.objectContaining({
        targets: scene.logoText,
        yoyo: true,
        repeat: -1
      })
    )
  })

  it('should create exactly 4 menu buttons', () => {
    scene.create()
    expect(scene.menuButtons).toHaveLength(4)
  })

  it('should create buttons with correct labels', () => {
    scene.create()
    const labels = scene.menuButtons.map(b => b.label)
    expect(labels).toEqual(['Jugar', 'Cargar partida', 'Opciones', 'Créditos'])
  })

  it('"Jugar" button should start GameScene', () => {
    scene.create()
    const jugarBtn = scene.menuButtons.find(b => b.label === 'Jugar')
    // Trigger pointerdown
    const pointerdownHandlers = jugarBtn.hitZone._handlers.pointerdown
    expect(pointerdownHandlers).toBeDefined()
    pointerdownHandlers[0]()
    expect(scene.scene.start).toHaveBeenCalledWith('GameScene')
  })

  it('"Cargar partida" button should log placeholder', () => {
    scene.create()
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const btn = scene.menuButtons.find(b => b.label === 'Cargar partida')
    btn.hitZone._handlers.pointerdown[0]()
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('Cargar partida'))
    spy.mockRestore()
  })

  it('"Opciones" button should log placeholder', () => {
    scene.create()
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const btn = scene.menuButtons.find(b => b.label === 'Opciones')
    btn.hitZone._handlers.pointerdown[0]()
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('Opciones'))
    spy.mockRestore()
  })

  it('"Créditos" button should log placeholder', () => {
    scene.create()
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const btn = scene.menuButtons.find(b => b.label === 'Créditos')
    btn.hitZone._handlers.pointerdown[0]()
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('Créditos'))
    spy.mockRestore()
  })

  it('buttons should have interactive hit zones', () => {
    scene.create()
    for (const btn of scene.menuButtons) {
      expect(btn.hitZone.setInteractive).toHaveBeenCalled()
    }
  })

  it('buttons should register hover handlers', () => {
    scene.create()
    for (const btn of scene.menuButtons) {
      expect(btn.hitZone._handlers.pointerover).toBeDefined()
      expect(btn.hitZone._handlers.pointerout).toBeDefined()
    }
  })
})
