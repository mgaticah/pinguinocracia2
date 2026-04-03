import Phaser from 'phaser'

/**
 * BootScene — First scene loaded by Phaser.
 * Generates placeholder spritesheet textures for all game assets,
 * registers animations, and transitions to TitleScene.
 */
export default class BootScene extends Phaser.Scene {
  constructor () {
    super('BootScene')
  }

  preload () {
    this.load.on('loaderror', (file) => {
      console.error(`[BootScene] Failed to load asset: ${file.key} (${file.url})`)
    })

    // --- Load map backgrounds and collision grids ---
    this.load.image('map_level1_bg', 'assets/level1.png')
    this.load.json('map_level1_grid', 'assets/collision_level1.json')

    // --- Load real spritesheets (if the file exists, it replaces the placeholder) ---
    // Characters: 5 cols × 4 rows, 48×48 per frame (PNG must be 240×192px)
    const characters = ['player', 'policiaEstandar', 'policiaMontado', 'aliadoEstandar', 'aliadoRapido', 'aliadoPunk']
    for (const key of characters) {
      this.load.spritesheet(key, `assets/${key}.png`, { frameWidth: 48, frameHeight: 48 })
    }

    // Vehicles: 4 cols × 4 rows, 96×96 per frame (idle, walk1, walk2, attack)
    const vehicles = ['camionAgua', 'camionGas']
    for (const key of vehicles) {
      this.load.spritesheet(key, `assets/${key}.png`, { frameWidth: 96, frameHeight: 96 })
    }

    // Powerups: 2 cols × 1 row, 32×32 per frame
    const powerups = ['manzana', 'maruchan', 'energetica', 'botellita']
    for (const key of powerups) {
      this.load.spritesheet(key, `assets/${key}.png`, { frameWidth: 32, frameHeight: 32 })
    }

    // Projectiles: single frame 16×16
    this.load.image('piedra', 'assets/piedra.png')
    this.load.image('molotov', 'assets/molotov.png')

    // Effects
    this.load.spritesheet('efecChorro', 'assets/efecChorro.png', { frameWidth: 48, frameHeight: 24 })
    this.load.spritesheet('efecGas', 'assets/efecGas.png', { frameWidth: 48, frameHeight: 48 })
  }

  create () {
    this._generatePlaceholderTextures()
    this._registerAnimations()
    this.scene.start('TitleScene')
  }

  /**
   * Generates all placeholder textures the game needs.
   * Characters, vehicles, powerups and effects use multi-frame spritesheets.
   * UI elements and projectiles use simple single-frame textures.
   */
  _generatePlaceholderTextures () {
    // Characters — 5×4 spritesheet (48×48 per frame)
    // Cols: 0=idle, 1=walk1, 2=walk2, 3=attack1, 4=attack2
    // Rows: 0=up, 1=down, 2=left, 3=right
    const characters = [
      { key: 'player', color: 0x3366ff, label: 'P' },
      { key: 'policiaEstandar', color: 0x666666, label: 'PE' },
      { key: 'policiaMontado', color: 0x888888, label: 'PM' },
      { key: 'aliadoEstandar', color: 0x33cc33, label: 'AE' },
      { key: 'aliadoRapido', color: 0x66ff66, label: 'AR' },
      { key: 'aliadoPunk', color: 0xff6633, label: 'AP' }
    ]
    for (const c of characters) {
      this._generateSpritesheetTexture(c.key, 48, 48, 5, 4, c.color, c.label)
    }

    // Vehicles — 4×4 spritesheet (96×96 per frame)
    // Cols: 0=idle, 1=walk1, 2=walk2, 3=attack
    // Rows: 0=up, 1=down, 2=left, 3=right
    const vehicles = [
      { key: 'camionAgua', color: 0x0099cc, label: 'CA' },
      { key: 'camionGas', color: 0x999900, label: 'CG' }
    ]
    for (const v of vehicles) {
      this._generateSpritesheetTexture(v.key, 96, 96, 4, 4, v.color, v.label)
    }

    // Powerups — 1×2 spritesheet (32×32 per frame)
    const powerups = [
      { key: 'manzana', color: 0xff0000, label: 'Mz' },
      { key: 'maruchan', color: 0xff9900, label: 'Mr' },
      { key: 'energetica', color: 0xffff00, label: 'En' },
      { key: 'botellita', color: 0x00ccff, label: 'Bo' }
    ]
    for (const p of powerups) {
      this._generateSpritesheetTexture(p.key, 32, 32, 2, 1, p.color, p.label)
    }

    // Effects
    this._generateSpritesheetTexture('efecChorro', 48, 24, 3, 1, 0x66ccff, '')
    this._generateSpritesheetTexture('efecGas', 48, 48, 3, 1, 0xcccc33, '')

    // Projectiles (single-frame)
    this._generateTexture('piedra', 16, 16, 0xaaaaaa, '')
    this._generateTexture('molotov', 16, 16, 0xff6600, '')

    // UI elements (single-frame)
    const uiElements = [
      { key: 'btnJugar', w: 200, h: 50, color: 0x2244aa, label: 'Jugar' },
      { key: 'btnCargar', w: 200, h: 50, color: 0x2244aa, label: 'Cargar' },
      { key: 'btnOpciones', w: 200, h: 50, color: 0x2244aa, label: 'Opciones' },
      { key: 'btnCreditos', w: 200, h: 50, color: 0x2244aa, label: 'Créditos' },
      { key: 'fondoCuaderno', w: 1920, h: 1080, color: 0xf5f0e0, label: '' }
    ]
    for (const ui of uiElements) {
      this._generateTexture(ui.key, ui.w, ui.h, ui.color, ui.label)
    }
  }

  /**
   * Registers all spritesheet animations for characters, vehicles, powerups and effects.
   * Called after placeholder textures are generated.
   */
  _registerAnimations () {
    // Character animations (4 directions × walk + idle)
    const characterKeys = [
      'player', 'policiaEstandar', 'policiaMontado',
      'aliadoEstandar', 'aliadoRapido', 'aliadoPunk'
    ]

    // 5 cols per row: idle(0), walk1(1), walk2(2), attack1(3), attack2(4)
    // Row 0=up, 1=down, 2=left, 3=right → row offset = row * 5
    for (const key of characterKeys) {
      this.anims.create({ key: `${key}_walk_up`, frames: this.anims.generateFrameNumbers(key, { frames: [0, 1, 2] }), frameRate: 8, repeat: -1 })
      this.anims.create({ key: `${key}_walk_down`, frames: this.anims.generateFrameNumbers(key, { frames: [5, 6, 7] }), frameRate: 8, repeat: -1 })
      this.anims.create({ key: `${key}_walk_left`, frames: this.anims.generateFrameNumbers(key, { frames: [10, 11, 12] }), frameRate: 8, repeat: -1 })
      this.anims.create({ key: `${key}_walk_right`, frames: this.anims.generateFrameNumbers(key, { frames: [15, 16, 17] }), frameRate: 8, repeat: -1 })

      this.anims.create({ key: `${key}_idle_up`, frames: [{ key, frame: 0 }], frameRate: 1 })
      this.anims.create({ key: `${key}_idle_down`, frames: [{ key, frame: 5 }], frameRate: 1 })
      this.anims.create({ key: `${key}_idle_left`, frames: [{ key, frame: 10 }], frameRate: 1 })
      this.anims.create({ key: `${key}_idle_right`, frames: [{ key, frame: 15 }], frameRate: 1 })

      // Attack animations (frames 3,4 per row) — plays once at 4fps (~500ms)
      this.anims.create({ key: `${key}_attack_up`, frames: this.anims.generateFrameNumbers(key, { frames: [3, 4] }), frameRate: 4, repeat: 0 })
      this.anims.create({ key: `${key}_attack_down`, frames: this.anims.generateFrameNumbers(key, { frames: [8, 9] }), frameRate: 4, repeat: 0 })
      this.anims.create({ key: `${key}_attack_left`, frames: this.anims.generateFrameNumbers(key, { frames: [13, 14] }), frameRate: 4, repeat: 0 })
      this.anims.create({ key: `${key}_attack_right`, frames: this.anims.generateFrameNumbers(key, { frames: [18, 19] }), frameRate: 4, repeat: 0 })
    }

    // Vehicle animations (4 cols: idle, walk1, walk2, attack × 4 rows: up, down, left, right)
    const vehicleKeys = ['camionAgua', 'camionGas']
    for (const key of vehicleKeys) {
      // 4 cols per row → row offset = row * 4
      // Walk: frames 0,1,2 per row; Attack: frame 3 per row
      this.anims.create({ key: `${key}_walk_up`, frames: this.anims.generateFrameNumbers(key, { frames: [0, 1, 2] }), frameRate: 6, repeat: -1 })
      this.anims.create({ key: `${key}_walk_down`, frames: this.anims.generateFrameNumbers(key, { frames: [4, 5, 6] }), frameRate: 6, repeat: -1 })
      this.anims.create({ key: `${key}_walk_left`, frames: this.anims.generateFrameNumbers(key, { frames: [8, 9, 10] }), frameRate: 6, repeat: -1 })
      this.anims.create({ key: `${key}_walk_right`, frames: this.anims.generateFrameNumbers(key, { frames: [12, 13, 14] }), frameRate: 6, repeat: -1 })

      this.anims.create({ key: `${key}_idle_up`, frames: [{ key, frame: 0 }], frameRate: 1 })
      this.anims.create({ key: `${key}_idle_down`, frames: [{ key, frame: 4 }], frameRate: 1 })
      this.anims.create({ key: `${key}_idle_left`, frames: [{ key, frame: 8 }], frameRate: 1 })
      this.anims.create({ key: `${key}_idle_right`, frames: [{ key, frame: 12 }], frameRate: 1 })

      // Move aliases (backward compat)
      this.anims.create({ key: `${key}_move_up`, frames: this.anims.generateFrameNumbers(key, { frames: [0, 1, 2] }), frameRate: 6, repeat: -1 })
      this.anims.create({ key: `${key}_move_down`, frames: this.anims.generateFrameNumbers(key, { frames: [4, 5, 6] }), frameRate: 6, repeat: -1 })
      this.anims.create({ key: `${key}_move_left`, frames: this.anims.generateFrameNumbers(key, { frames: [8, 9, 10] }), frameRate: 6, repeat: -1 })
      this.anims.create({ key: `${key}_move_right`, frames: this.anims.generateFrameNumbers(key, { frames: [12, 13, 14] }), frameRate: 6, repeat: -1 })

      // Attack animation (frame 3 per row)
      this.anims.create({ key: `${key}_attack_up`, frames: [{ key, frame: 3 }], frameRate: 4, repeat: 0 })
      this.anims.create({ key: `${key}_attack_down`, frames: [{ key, frame: 7 }], frameRate: 4, repeat: 0 })
      this.anims.create({ key: `${key}_attack_left`, frames: [{ key, frame: 11 }], frameRate: 4, repeat: 0 })
      this.anims.create({ key: `${key}_attack_right`, frames: [{ key, frame: 15 }], frameRate: 4, repeat: 0 })
    }

    // Powerup animations (2 frames: base + brillo)
    const powerupTypes = ['manzana', 'maruchan', 'energetica', 'botellita']
    for (const type of powerupTypes) {
      this.anims.create({ key: `powerup_${type}`, frames: this.anims.generateFrameNumbers(type, { frames: [0, 1] }), frameRate: 2, repeat: -1 })
    }

    // Effect animations
    this.anims.create({ key: 'efecChorro', frames: this.anims.generateFrameNumbers('efecChorro', { start: 0, end: 2 }), frameRate: 6, repeat: -1 })
    this.anims.create({ key: 'efecGas', frames: this.anims.generateFrameNumbers('efecGas', { start: 0, end: 2 }), frameRate: 4, repeat: -1 })
  }

  /**
   * Generates a multi-frame spritesheet placeholder texture.
   * Each frame gets a slightly different shade for visual distinction.
   * @param {string} key    - Texture key for the Phaser cache
   * @param {number} frameW - Width of a single frame in pixels
   * @param {number} frameH - Height of a single frame in pixels
   * @param {number} cols   - Number of columns in the spritesheet
   * @param {number} rows   - Number of rows in the spritesheet
   * @param {number} color  - Base fill color (hex)
   * @param {string} label  - Optional short label drawn on each frame
   */
  _generateSpritesheetTexture (key, frameW, frameH, cols, rows, color, label) {
    try {
      if (this.textures.exists(key)) return

      const totalW = frameW * cols
      const totalH = frameH * rows
      const gfx = this.make.graphics({ add: false })

      // Extract RGB components from base color
      const r = (color >> 16) & 0xff
      const g = (color >> 8) & 0xff
      const b = color & 0xff

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const x = col * frameW
          const y = row * frameH

          // Vary shade per frame for visual distinction
          const frameIndex = row * cols + col
          const shade = 1.0 - (frameIndex * 0.04)
          const sr = Math.max(0, Math.min(255, Math.round(r * shade)))
          const sg = Math.max(0, Math.min(255, Math.round(g * shade)))
          const sb = Math.max(0, Math.min(255, Math.round(b * shade)))
          const frameColor = (sr << 16) | (sg << 8) | sb

          gfx.fillStyle(frameColor, 1)
          gfx.fillRect(x, y, frameW, frameH)

          // Thin border per frame
          gfx.lineStyle(1, 0x000000, 0.5)
          gfx.strokeRect(x, y, frameW, frameH)

          // Small position marker (dot) that shifts per frame
          const dotX = x + 4 + (col * 6)
          const dotY = y + 4 + (row * 6)
          gfx.fillStyle(0xffffff, 0.6)
          gfx.fillRect(dotX, dotY, 3, 3)
        }
      }

      gfx.generateTexture(key, totalW, totalH)
      gfx.destroy()
    } catch (err) {
      console.error(`[BootScene] Error generating spritesheet for "${key}":`, err)
      this._generateFallbackTexture(key, frameW * cols, frameH * rows)
    }
  }

  /**
   * Creates a single placeholder texture.
   * @param {string} key   - Texture key for the Phaser cache
   * @param {number} w     - Width in pixels
   * @param {number} h     - Height in pixels
   * @param {number} color - Fill color (hex)
   * @param {string} label - Optional short label drawn on the texture
   */
  _generateTexture (key, w, h, color, label) {
    try {
      // Skip if texture already exists (e.g. loaded from a real asset)
      if (this.textures.exists(key)) return

      const gfx = this.make.graphics({ add: false })
      gfx.fillStyle(color, 1)
      gfx.fillRect(0, 0, w, h)

      // Thin border for visibility
      gfx.lineStyle(1, 0x000000, 0.5)
      gfx.strokeRect(0, 0, w, h)

      gfx.generateTexture(key, w, h)
      gfx.destroy()
    } catch (err) {
      console.error(`[BootScene] Error generating placeholder for "${key}":`, err)
      this._generateFallbackTexture(key, w, h)
    }
  }

  /**
   * Last-resort fallback: a magenta rectangle so missing textures are obvious.
   */
  _generateFallbackTexture (key, w, h) {
    try {
      if (this.textures.exists(key)) return
      const gfx = this.make.graphics({ add: false })
      gfx.fillStyle(0xff00ff, 1)
      gfx.fillRect(0, 0, w, h)
      gfx.generateTexture(key, w, h)
      gfx.destroy()
    } catch (fallbackErr) {
      console.error(`[BootScene] Fallback texture also failed for "${key}":`, fallbackErr)
    }
  }
}
