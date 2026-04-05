import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('phaser', () => {
  class Scene { constructor (key) { this.key = key } }
  return { default: { Scene }, Scene }
})

function createMock () {
  const handlers = {}
  return {
    add: {
      image: vi.fn(() => ({ setDisplaySize: vi.fn() })),
      graphics: vi.fn(() => ({ fillStyle: vi.fn(), fillRect: vi.fn() })),
      text: vi.fn(() => ({
        setOrigin: vi.fn().mockReturnThis(),
        setColor: vi.fn().mockReturnThis(),
        active: true
      })),
      zone: vi.fn(() => ({
        setInteractive: vi.fn().mockReturnThis(),
        on: vi.fn((event, cb) => { handlers[event] = cb; return { setInteractive: vi.fn().mockReturnThis(), on: vi.fn() } })
      }))
    },
    cameras: { main: { width: 1920, height: 1080 } },
    textures: { exists: vi.fn(() => true) },
    scene: {
      stop: vi.fn(),
      resume: vi.fn(),
      get: vi.fn(() => ({ _proceedTransition: vi.fn() })),
      settings: { data: { levelName: 'Level 1', targetMap: 'map_level2' } }
    },
    tweens: { add: vi.fn() },
    _handlers: handlers
  }
}

describe('LevelCompleteScene', () => {
  let scene, mock

  beforeEach(async () => {
    vi.clearAllMocks()
    const { default: LCS } = await import('./LevelCompleteScene.js')
    scene = new LCS()
    mock = createMock()
    Object.assign(scene, mock)
    scene.create()
  })

  it('should display celebration background image', () => {
    expect(mock.textures.exists).toHaveBeenCalledWith('celebracion')
    expect(mock.add.image).toHaveBeenCalled()
  })

  it('should display "¡Nivel superado!" title', () => {
    const textCalls = mock.add.text.mock.calls
    const titleCall = textCalls.find(c => c[2] === '¡Nivel superado!')
    expect(titleCall).toBeDefined()
  })

  it('should display level name', () => {
    const textCalls = mock.add.text.mock.calls
    const nameCall = textCalls.find(c => c[2] === 'Level 1')
    expect(nameCall).toBeDefined()
  })

  it('should display "Continuar" button', () => {
    const textCalls = mock.add.text.mock.calls
    const btnCall = textCalls.find(c => c[2] === 'Continuar ▶')
    expect(btnCall).toBeDefined()
  })

  it('should create interactive zone for button', () => {
    expect(mock.add.zone).toHaveBeenCalled()
  })

  it('should stop scene and resume GameScene on button click', () => {
    const pointerdownHandler = mock._handlers.pointerdown
    expect(pointerdownHandler).toBeDefined()
    pointerdownHandler()
    expect(mock.scene.stop).toHaveBeenCalledWith('LevelCompleteScene')
    expect(mock.scene.resume).toHaveBeenCalledWith('GameScene')
  })

  it('should call _proceedTransition on GameScene when clicking continue', () => {
    const mockGameScene = { _proceedTransition: vi.fn() }
    mock.scene.get = vi.fn(() => mockGameScene)
    // Re-create to use updated mock
    scene.create()
    const pointerdownHandler = mock._handlers.pointerdown
    pointerdownHandler()
    expect(mockGameScene._proceedTransition).toHaveBeenCalledWith('map_level2')
  })

  it('should add pulse tween to button text', () => {
    expect(mock.tweens.add).toHaveBeenCalled()
  })

  it('should use fallback overlay when celebracion texture is missing', async () => {
    vi.clearAllMocks()
    const { default: LCS } = await import('./LevelCompleteScene.js')
    const scene2 = new LCS()
    const mock2 = createMock()
    mock2.textures.exists = vi.fn(() => false)
    Object.assign(scene2, mock2)
    scene2.create()
    // Should not call add.image, should call add.graphics for fallback
    expect(mock2.add.image).not.toHaveBeenCalled()
    const graphicsCalls = mock2.add.graphics.mock.calls
    expect(graphicsCalls.length).toBeGreaterThanOrEqual(1)
  })
})
