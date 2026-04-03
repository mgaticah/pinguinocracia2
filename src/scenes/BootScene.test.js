import { describe, it, expect, vi, beforeEach } from 'vitest'

// Lightweight Phaser mock for Node environment
vi.mock('phaser', () => {
  class Scene {
    constructor (key) {
      this.key = typeof key === 'string' ? key : key
      this.scene = { start: vi.fn() }
      this.load = {
        on: vi.fn(),
        off: vi.fn(),
        spritesheet: vi.fn(),
        image: vi.fn(),
        json: vi.fn()
      }
      this._textures = new Set()
      this.textures = {
        exists: (k) => this._textures.has(k)
      }
      this.make = {
        graphics: () => ({
          fillStyle: vi.fn().mockReturnThis(),
          fillRect: vi.fn().mockReturnThis(),
          lineStyle: vi.fn().mockReturnThis(),
          strokeRect: vi.fn().mockReturnThis(),
          generateTexture: vi.fn((k) => { this._textures.add(k) }),
          destroy: vi.fn()
        })
      }
      // Animation manager mock
      this._anims = new Map()
      this.anims = {
        create: vi.fn((config) => { this._anims.set(config.key, config) }),
        generateFrameNumbers: vi.fn((key, config) => {
          // Return a simple array representing the frame config
          if (config.start !== undefined && config.end !== undefined) {
            const frames = []
            for (let i = config.start; i <= config.end; i++) {
              frames.push({ key, frame: i })
            }
            return frames
          }
          if (config.frames) {
            return config.frames.map(f => ({ key, frame: f }))
          }
          return []
        }),
        exists: vi.fn((key) => this._anims.has(key))
      }
    }
  }

  return {
    default: { Scene, AUTO: 0, Events: { EventEmitter: class {} }, Game: class {} },
    Scene
  }
})

describe('BootScene', () => {
  let scene

  beforeEach(async () => {
    const { default: BootScene } = await import('./BootScene.js')
    scene = new BootScene()
  })

  it('should have scene key "BootScene"', () => {
    expect(scene.key).toBe('BootScene')
  })

  it('should register a loaderror handler in preload', () => {
    scene.preload()
    expect(scene.load.on).toHaveBeenCalledWith('loaderror', expect.any(Function))
  })

  it('should log error when loaderror fires', () => {
    scene.preload()
    const errorHandler = scene.load.on.mock.calls.find(c => c[0] === 'loaderror')[1]
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    errorHandler({ key: 'missing', url: 'missing.png' })
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('missing'))
    spy.mockRestore()
  })

  it('should generate all expected placeholder textures in create', () => {
    scene.create()

    const expectedKeys = [
      'player', 'policiaEstandar', 'policiaMontado',
      'aliadoEstandar', 'aliadoRapido', 'aliadoPunk',
      'camionAgua', 'camionGas',
      'manzana', 'maruchan', 'energetica', 'botellita',
      'piedra', 'molotov',
      'efecChorro', 'efecGas',
      'btnJugar', 'btnCargar', 'btnOpciones', 'btnCreditos',
      'fondoCuaderno'
    ]

    for (const key of expectedKeys) {
      expect(scene.textures.exists(key), `texture "${key}" should exist`).toBe(true)
    }
  })

  it('should transition to TitleScene after create', () => {
    scene.create()
    expect(scene.scene.start).toHaveBeenCalledWith('TitleScene')
  })

  it('should not overwrite an existing texture', () => {
    // Pre-populate a texture
    scene._textures.add('player')
    const graphicsSpy = vi.spyOn(scene.make, 'graphics')

    // Generate only the player texture
    scene._generateTexture('player', 48, 48, 0x3366ff, 'P')

    // graphics() should not have been called since texture already exists
    expect(graphicsSpy).not.toHaveBeenCalled()
  })

  it('should use fallback magenta texture when generation throws', () => {
    // Make the primary graphics throw
    let callCount = 0
    scene.make.graphics = () => {
      callCount++
      if (callCount === 1) {
        throw new Error('simulated failure')
      }
      // Second call (fallback) works normally
      return {
        fillStyle: vi.fn().mockReturnThis(),
        fillRect: vi.fn().mockReturnThis(),
        lineStyle: vi.fn().mockReturnThis(),
        strokeRect: vi.fn().mockReturnThis(),
        generateTexture: vi.fn((k) => { scene._textures.add(k) }),
        destroy: vi.fn()
      }
    }

    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    scene._generateTexture('broken', 32, 32, 0xff0000, '')

    expect(spy).toHaveBeenCalledWith(expect.stringContaining('broken'), expect.any(Error))
    expect(scene.textures.exists('broken')).toBe(true)
    spy.mockRestore()
  })

  // --- Animation registration tests ---

  describe('_registerAnimations', () => {
    beforeEach(() => {
      scene.create()
    })

    it('should register walk, idle, and attack animations for all 6 characters', () => {
      const characters = [
        'player', 'policiaEstandar', 'policiaMontado',
        'aliadoEstandar', 'aliadoRapido', 'aliadoPunk'
      ]
      const directions = ['up', 'down', 'left', 'right']

      for (const key of characters) {
        for (const dir of directions) {
          expect(scene._anims.has(`${key}_walk_${dir}`), `${key}_walk_${dir} should exist`).toBe(true)
          expect(scene._anims.has(`${key}_idle_${dir}`), `${key}_idle_${dir} should exist`).toBe(true)
          expect(scene._anims.has(`${key}_attack_${dir}`), `${key}_attack_${dir} should exist`).toBe(true)
        }
      }
    })

    it('should register move animations for vehicles in all 4 directions', () => {
      const vehicles = ['camionAgua', 'camionGas']
      const directions = ['up', 'down', 'left', 'right']

      for (const key of vehicles) {
        for (const dir of directions) {
          expect(scene._anims.has(`${key}_move_${dir}`), `${key}_move_${dir} should exist`).toBe(true)
        }
      }
    })

    it('should register powerup animations for all 4 types', () => {
      const types = ['manzana', 'maruchan', 'energetica', 'botellita']
      for (const type of types) {
        expect(scene._anims.has(`powerup_${type}`), `powerup_${type} should exist`).toBe(true)
      }
    })

    it('should register effect animations', () => {
      expect(scene._anims.has('efecChorro')).toBe(true)
      expect(scene._anims.has('efecGas')).toBe(true)
    })

    it('should set correct frameRate for character walk animations', () => {
      const walkDown = scene._anims.get('player_walk_down')
      expect(walkDown.frameRate).toBe(8)
      expect(walkDown.repeat).toBe(-1)
    })

    it('should set correct frameRate for vehicle move animations', () => {
      const moveDown = scene._anims.get('camionAgua_move_down')
      expect(moveDown.frameRate).toBe(6)
      expect(moveDown.repeat).toBe(-1)
    })

    it('should set correct frameRate for powerup animations', () => {
      const anim = scene._anims.get('powerup_manzana')
      expect(anim.frameRate).toBe(2)
      expect(anim.repeat).toBe(-1)
    })

    it('should set correct frameRate for effect animations', () => {
      const chorro = scene._anims.get('efecChorro')
      expect(chorro.frameRate).toBe(6)
      expect(chorro.repeat).toBe(-1)

      const gas = scene._anims.get('efecGas')
      expect(gas.frameRate).toBe(4)
      expect(gas.repeat).toBe(-1)
    })

    it('should use correct frame ranges for character walk animations (5-col layout)', () => {
      // 5 cols per row: walk_up=[0,1,2], walk_down=[5,6,7], walk_left=[10,11,12], walk_right=[15,16,17]
      expect(scene.anims.generateFrameNumbers).toHaveBeenCalledWith('player', { frames: [0, 1, 2] })
      expect(scene.anims.generateFrameNumbers).toHaveBeenCalledWith('player', { frames: [5, 6, 7] })
      expect(scene.anims.generateFrameNumbers).toHaveBeenCalledWith('player', { frames: [10, 11, 12] })
      expect(scene.anims.generateFrameNumbers).toHaveBeenCalledWith('player', { frames: [15, 16, 17] })
    })

    it('should use correct frame ranges for character attack animations', () => {
      // attack_up=[3,4], attack_down=[8,9], attack_left=[13,14], attack_right=[18,19]
      expect(scene.anims.generateFrameNumbers).toHaveBeenCalledWith('player', { frames: [3, 4] })
      expect(scene.anims.generateFrameNumbers).toHaveBeenCalledWith('player', { frames: [8, 9] })
      expect(scene.anims.generateFrameNumbers).toHaveBeenCalledWith('player', { frames: [13, 14] })
      expect(scene.anims.generateFrameNumbers).toHaveBeenCalledWith('player', { frames: [18, 19] })
    })

    it('should set attack animations to play once (repeat: 0)', () => {
      const attackDown = scene._anims.get('player_attack_down')
      expect(attackDown.frameRate).toBe(4)
      expect(attackDown.repeat).toBe(0)
    })

    it('should use correct frame indices for vehicle walk animations', () => {
      expect(scene.anims.generateFrameNumbers).toHaveBeenCalledWith('camionAgua', { frames: [0, 1, 2] })
      expect(scene.anims.generateFrameNumbers).toHaveBeenCalledWith('camionAgua', { frames: [4, 5, 6] })
      expect(scene.anims.generateFrameNumbers).toHaveBeenCalledWith('camionAgua', { frames: [8, 9, 10] })
      expect(scene.anims.generateFrameNumbers).toHaveBeenCalledWith('camionAgua', { frames: [12, 13, 14] })
    })

    it('should register the correct total number of animations', () => {
      // 6 characters × 12 anims (4 walk + 4 idle + 4 attack) = 72
      // 2 vehicles × 16 anims (4 walk + 4 idle + 4 move + 4 attack) = 32
      // But move aliases share frames with walk, creating 4 extra keys per vehicle
      // Unique: 72 + 32 + 4 + 2 = 110
      expect(scene._anims.size).toBe(110)
    })
  })

  // --- Spritesheet texture generation tests ---

  describe('_generateSpritesheetTexture', () => {
    it('should not overwrite an existing spritesheet texture', () => {
      scene._textures.add('testSheet')
      const graphicsSpy = vi.spyOn(scene.make, 'graphics')

      scene._generateSpritesheetTexture('testSheet', 48, 48, 3, 4, 0xff0000, 'T')

      expect(graphicsSpy).not.toHaveBeenCalled()
    })

    it('should generate a spritesheet texture with correct total dimensions', () => {
      let generatedKey = null
      let generatedW = null
      let generatedH = null

      scene.make.graphics = () => ({
        fillStyle: vi.fn().mockReturnThis(),
        fillRect: vi.fn().mockReturnThis(),
        lineStyle: vi.fn().mockReturnThis(),
        strokeRect: vi.fn().mockReturnThis(),
        generateTexture: vi.fn((k, w, h) => {
          generatedKey = k
          generatedW = w
          generatedH = h
          scene._textures.add(k)
        }),
        destroy: vi.fn()
      })

      scene._generateSpritesheetTexture('charSheet', 48, 48, 3, 4, 0x3366ff, 'C')

      expect(generatedKey).toBe('charSheet')
      expect(generatedW).toBe(144) // 48 * 3
      expect(generatedH).toBe(192) // 48 * 4
    })

    it('should use fallback when spritesheet generation throws', () => {
      let callCount = 0
      scene.make.graphics = () => {
        callCount++
        if (callCount === 1) {
          throw new Error('spritesheet failure')
        }
        return {
          fillStyle: vi.fn().mockReturnThis(),
          fillRect: vi.fn().mockReturnThis(),
          lineStyle: vi.fn().mockReturnThis(),
          strokeRect: vi.fn().mockReturnThis(),
          generateTexture: vi.fn((k) => { scene._textures.add(k) }),
          destroy: vi.fn()
        }
      }

      const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
      scene._generateSpritesheetTexture('brokenSheet', 48, 48, 3, 4, 0xff0000, '')

      expect(spy).toHaveBeenCalledWith(expect.stringContaining('brokenSheet'), expect.any(Error))
      expect(scene.textures.exists('brokenSheet')).toBe(true)
      spy.mockRestore()
    })
  })
})
