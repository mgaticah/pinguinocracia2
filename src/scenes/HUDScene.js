import Phaser from 'phaser'
import EventBus from '../EventBus.js'

/**
 * EstiloSketch constants — blue pen on notebook paper look.
 */
const SKETCH_COLOR = '#1a3a6b'
const SKETCH_COLOR_HEX = 0x1a3a6b
const HP_BAR_BG = 0x333333
const HP_BAR_FILL = 0xcc2222
const ENERGETICA_FILL = 0xddcc00
const HP_BAR_WIDTH = 200
const HP_BAR_HEIGHT = 20
const ENERGETICA_BAR_WIDTH = 160
const ENERGETICA_BAR_HEIGHT = 12
const ALLY_ICON_RADIUS = 8
const ALLY_ICON_SPACING = 22
const PADDING = 16

const FONT_STYLE = {
  fontFamily: 'monospace',
  fontSize: '20px',
  color: SKETCH_COLOR
}

const FONT_STYLE_LARGE = {
  fontFamily: 'monospace',
  fontSize: '32px',
  color: SKETCH_COLOR
}

const FONT_STYLE_MAP = {
  fontFamily: 'monospace',
  fontSize: '40px',
  color: SKETCH_COLOR
}

export default class HUDScene extends Phaser.Scene {
  constructor () {
    super('HUDScene')

    // Internal state
    this._hp = 10
    this._maxHp = 10
    this._score = 0
    this._molotovs = 0
    this._weapon = 'piedra'
    this._allyCount = 0
    this._energeticaRemaining = 0
    this._finalTimerRemaining = 0
    this._finalTimerActive = false
  }

  create () {
    // Reset internal state for new game
    this._hp = 10
    this._maxHp = 10
    this._score = 0
    this._molotovs = 0
    this._weapon = 'piedra'
    this._allyCount = 0
    this._energeticaRemaining = 0
    this._finalTimerRemaining = 0
    this._finalTimerActive = false

    // --- HP Bar (top-left) ---
    this.hpBar = this.add.graphics()
    this._drawHpBar()

    // --- Ally icons (below HP bar) ---
    this.allyIcons = this.add.group()

    // --- Molotov counter (top-right) ---
    this.molotovCounter = this.add.text(0, 0, '🔥 x0', FONT_STYLE)
    this.molotovCounter.setOrigin(1, 0)
    this._positionMolotovCounter()

    // --- Weapon text (below molotov counter) ---
    this.weaponIcon = this.add.text(0, 0, 'Arma: piedra', FONT_STYLE)
    this.weaponIcon.setOrigin(1, 0)
    this._positionWeaponText()

    // --- Score text (top-center) ---
    this.scoreText = this.add.text(0, 0, 'Puntaje: 0', FONT_STYLE_LARGE)
    this.scoreText.setOrigin(0.5, 0)
    this._positionScoreText()

    // --- Map name text (center, hidden by default) ---
    this.mapNameText = this.add.text(0, 0, '', FONT_STYLE_MAP)
    this.mapNameText.setOrigin(0.5, 0.5)
    this.mapNameText.setAlpha(0)
    this._positionMapNameText()

    // --- Energética duration bar (below HP bar area, hidden by default) ---
    this.energeticaBar = this.add.graphics()
    this.energeticaBar.setVisible(false)

    // --- Final event timer (center-bottom, hidden by default) ---
    this.finalTimerText = this.add.text(0, 0, '', FONT_STYLE_LARGE)
    this.finalTimerText.setOrigin(0.5, 1)
    this.finalTimerText.setVisible(false)
    this._positionFinalTimerText()

    // --- Zoom buttons (bottom-left) ---
    const btnStyle = { fontFamily: 'monospace', fontSize: '28px', color: SKETCH_COLOR }
    const bw = this.scale ? this.scale.width : 1920
    const bh = this.scale ? this.scale.height : 1080

    this.zoomInBtn = this.add.text(PADDING, bh - PADDING - 70, '[ + ]', btnStyle)
    this.zoomInBtn.setOrigin(0, 1)
    this.zoomInBtn.setInteractive({ useHandCursor: true })
    this.zoomInBtn.on('pointerdown', () => EventBus.emit('zoom:request', { direction: 'in' }))

    this.zoomOutBtn = this.add.text(PADDING, bh - PADDING - 30, '[ − ]', btnStyle)
    this.zoomOutBtn.setOrigin(0, 1)
    this.zoomOutBtn.setInteractive({ useHandCursor: true })
    this.zoomOutBtn.on('pointerdown', () => EventBus.emit('zoom:request', { direction: 'out' }))

    // --- Subscribe to EventBus ---
    this._bindEvents()
  }

  /**
   * Bind all EventBus listeners.
   */
  _bindEvents () {
    this._onPlayerDamaged = (data) => {
      if (data && typeof data.hp === 'number') {
        this._hp = data.hp
      }
      this._drawHpBar()
    }

    this._onPlayerHealed = (data) => {
      if (data && typeof data.hp === 'number') {
        this._hp = data.hp
      }
      this._drawHpBar()
    }

    this._onEnemyKilled = () => {
      // Score is updated via score:changed event
    }

    this._onAllyDied = () => {
      if (this._allyCount > 0) {
        this._allyCount -= 1
      }
      this._drawAllyIcons()
    }

    this._onMolotovChanged = (data) => {
      if (data && typeof data.count === 'number') {
        this._molotovs = data.count
      }
      this.molotovCounter.setText(`🔥 x${this._molotovs}`)
    }

    this._onWeaponChanged = (data) => {
      if (data && data.weapon) {
        this._weapon = data.weapon
      }
      this.weaponIcon.setText(`Arma: ${this._weapon}`)
    }

    this._onMapTransition = (data) => {
      if (data && data.mapKey) {
        this._showMapName(data.mapKey)
      }
    }

    this._onPowerupCollected = () => {
      // Brief flash effect on HUD (visual feedback)
      this._flashEffect()
    }

    this._onEnergeticaTick = (data) => {
      if (data && typeof data.remaining === 'number') {
        this._energeticaRemaining = data.remaining
        if (data.remaining > 0) {
          this.energeticaBar.setVisible(true)
          this._drawEnergeticaBar()
        } else {
          this.energeticaBar.setVisible(false)
        }
      }
    }

    this._onScoreChanged = (data) => {
      if (data && typeof data.score === 'number') {
        this._score = data.score
      }
      this.scoreText.setText(`Puntaje: ${this._score}`)
    }

    EventBus.on('player:damaged', this._onPlayerDamaged)
    EventBus.on('player:healed', this._onPlayerHealed)
    EventBus.on('enemy:killed', this._onEnemyKilled)
    EventBus.on('ally:died', this._onAllyDied)
    EventBus.on('molotov:changed', this._onMolotovChanged)
    EventBus.on('weapon:changed', this._onWeaponChanged)
    EventBus.on('map:transition', this._onMapTransition)
    EventBus.on('powerup:collected', this._onPowerupCollected)
    EventBus.on('energetica:tick', this._onEnergeticaTick)
    EventBus.on('score:changed', this._onScoreChanged)

    this._onFinalEventTick = (data) => {
      if (data && typeof data.remaining === 'number') {
        this.setFinalTimer(data.remaining)
      }
    }
    EventBus.on('finalevent:tick', this._onFinalEventTick)
  }

  /**
   * Draw the HP bar graphic.
   */
  _drawHpBar () {
    this.hpBar.clear()
    // Background
    this.hpBar.fillStyle(HP_BAR_BG, 0.5)
    this.hpBar.fillRect(PADDING, PADDING, HP_BAR_WIDTH, HP_BAR_HEIGHT)
    // Border (sketch style)
    this.hpBar.lineStyle(2, SKETCH_COLOR_HEX, 1)
    this.hpBar.strokeRect(PADDING, PADDING, HP_BAR_WIDTH, HP_BAR_HEIGHT)
    // Fill proportional to HP
    const ratio = Math.max(0, Math.min(1, this._hp / this._maxHp))
    if (ratio > 0) {
      this.hpBar.fillStyle(HP_BAR_FILL, 1)
      this.hpBar.fillRect(PADDING, PADDING, HP_BAR_WIDTH * ratio, HP_BAR_HEIGHT)
    }
  }

  /**
   * Draw ally icons below the HP bar.
   */
  _drawAllyIcons () {
    // Clear existing icons
    this.allyIcons.clear(true, true)
    const startY = PADDING + HP_BAR_HEIGHT + 10
    for (let i = 0; i < this._allyCount; i++) {
      const circle = this.add.graphics()
      circle.fillStyle(SKETCH_COLOR_HEX, 1)
      circle.fillCircle(
        PADDING + ALLY_ICON_RADIUS + i * ALLY_ICON_SPACING,
        startY + ALLY_ICON_RADIUS,
        ALLY_ICON_RADIUS
      )
      this.allyIcons.add(circle)
    }
  }

  /**
   * Draw the energética duration bar.
   */
  _drawEnergeticaBar () {
    this.energeticaBar.clear()
    const x = PADDING
    const y = PADDING + HP_BAR_HEIGHT + 10 + ALLY_ICON_RADIUS * 2 + 10
    // Background
    this.energeticaBar.fillStyle(HP_BAR_BG, 0.5)
    this.energeticaBar.fillRect(x, y, ENERGETICA_BAR_WIDTH, ENERGETICA_BAR_HEIGHT)
    // Border
    this.energeticaBar.lineStyle(2, SKETCH_COLOR_HEX, 1)
    this.energeticaBar.strokeRect(x, y, ENERGETICA_BAR_WIDTH, ENERGETICA_BAR_HEIGHT)
    // Fill proportional to remaining/6.0
    const ratio = Math.max(0, Math.min(1, this._energeticaRemaining / 6.0))
    if (ratio > 0) {
      this.energeticaBar.fillStyle(ENERGETICA_FILL, 1)
      this.energeticaBar.fillRect(x, y, ENERGETICA_BAR_WIDTH * ratio, ENERGETICA_BAR_HEIGHT)
    }
  }

  /**
   * Show map name centered for 2 seconds, then fade out.
   */
  _showMapName (mapKey) {
    const names = {
      map_barros_arana: 'Barros Arana',
      map_amunategui: 'Amunátegui',
      map_lastarria: 'Lastarria',
      map_plaza_italia: 'Plaza Italia'
    }
    const name = names[mapKey] || mapKey
    this.mapNameText.setText(name)
    this.mapNameText.setAlpha(1)

    // Fade out after 2 seconds
    if (this._mapNameTimer) {
      this._mapNameTimer.remove(false)
    }
    this._mapNameTimer = this.time.delayedCall(2000, () => {
      this.mapNameText.setAlpha(0)
    })
  }

  /**
   * Brief flash effect when a powerup is collected.
   */
  _flashEffect () {
    const flash = this.add.graphics()
    flash.fillStyle(0xffffff, 0.3)
    const { width, height } = this.scale
    flash.fillRect(0, 0, width || 1920, height || 1080)
    this.time.delayedCall(100, () => {
      flash.destroy()
    })
  }

  /**
   * Set the ally count (called externally or via initial state).
   */
  setAllyCount (count) {
    this._allyCount = count
    this._drawAllyIcons()
  }

  /**
   * Show or update the final event timer.
   */
  setFinalTimer (remaining) {
    this._finalTimerRemaining = remaining
    this._finalTimerActive = remaining > 0
    this.finalTimerText.setVisible(this._finalTimerActive)
    if (this._finalTimerActive) {
      this.finalTimerText.setText(`⏱ ${Math.ceil(remaining)}s`)
    }
  }

  // --- Positioning helpers ---

  _positionMolotovCounter () {
    const w = this.scale ? this.scale.width : 1920
    this.molotovCounter.setPosition(w - PADDING, PADDING)
  }

  _positionWeaponText () {
    const w = this.scale ? this.scale.width : 1920
    this.weaponIcon.setPosition(w - PADDING, PADDING + 28)
  }

  _positionScoreText () {
    const w = this.scale ? this.scale.width : 1920
    this.scoreText.setPosition(w / 2, PADDING)
  }

  _positionMapNameText () {
    const w = this.scale ? this.scale.width : 1920
    const h = this.scale ? this.scale.height : 1080
    this.mapNameText.setPosition(w / 2, h / 2)
  }

  _positionFinalTimerText () {
    const w = this.scale ? this.scale.width : 1920
    const h = this.scale ? this.scale.height : 1080
    this.finalTimerText.setPosition(w / 2, h - PADDING)
  }

  /**
   * Clean up EventBus listeners when scene is shut down.
   */
  shutdown () {
    EventBus.off('player:damaged', this._onPlayerDamaged)
    EventBus.off('player:healed', this._onPlayerHealed)
    EventBus.off('enemy:killed', this._onEnemyKilled)
    EventBus.off('ally:died', this._onAllyDied)
    EventBus.off('molotov:changed', this._onMolotovChanged)
    EventBus.off('weapon:changed', this._onWeaponChanged)
    EventBus.off('map:transition', this._onMapTransition)
    EventBus.off('powerup:collected', this._onPowerupCollected)
    EventBus.off('energetica:tick', this._onEnergeticaTick)
    EventBus.off('score:changed', this._onScoreChanged)
    EventBus.off('finalevent:tick', this._onFinalEventTick)
  }
}
