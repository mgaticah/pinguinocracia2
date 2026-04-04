import Phaser from 'phaser'

/**
 * TitleScene — Main menu screen.
 * Renders a notebook-style background, the game logo with wobble animation,
 * and four interactive menu buttons.
 */
export default class TitleScene extends Phaser.Scene {
  constructor () {
    super('TitleScene')
  }

  create () {
    const { width, height } = this.scale

    this._drawNotebookBackground(width, height)
    this._createLogo(width, height)
    this._createMenuButtons(width, height)
  }

  /**
   * Draws the notebook-style background programmatically:
   * cream/white fill, horizontal blue lines, red left margin.
   */
  _drawNotebookBackground (w, h) {
    const gfx = this.add.graphics()

    // Cream paper fill
    gfx.fillStyle(0xf5f0e0, 1)
    gfx.fillRect(0, 0, w, h)

    // Horizontal blue lines every 32px
    gfx.lineStyle(1, 0x99bbdd, 0.5)
    for (let y = 32; y < h; y += 32) {
      gfx.beginPath()
      gfx.moveTo(0, y)
      gfx.lineTo(w, y)
      gfx.strokePath()
    }

    // Red left margin line
    gfx.lineStyle(2, 0xcc3333, 0.7)
    gfx.beginPath()
    gfx.moveTo(100, 0)
    gfx.lineTo(100, h)
    gfx.strokePath()
  }

  /**
   * Creates the game logo text and subtitle with a gentle wobble tween.
   */
  _createLogo (w, h) {
    const logoY = h * 0.25

    this.logoText = this.add.text(w / 2, logoY, 'PINGÜINOCRACIA 2', {
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontSize: '96px',
      color: '#1a3a6a',
      fontStyle: 'bold',
      stroke: '#0d1f3c',
      strokeThickness: 3,
      align: 'center'
    }).setOrigin(0.5)

    // Gentle wobble/vibration on the logo
    this.tweens.add({
      targets: this.logoText,
      angle: { from: -0.5, to: 0.5 },
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    })
  }

  /**
   * Creates the four vertically-stacked menu buttons with hover effects.
   */
  _createMenuButtons (w, h) {
    const buttonLabels = ['Jugar', 'Cargar partida', 'Opciones', 'Créditos']
    const startY = h * 0.52
    const spacing = 70
    const btnWidth = 320
    const btnHeight = 54

    this.menuButtons = []

    buttonLabels.forEach((label, i) => {
      const x = w / 2
      const y = startY + i * spacing

      // Button background (drawn rectangle for sketch style)
      const bg = this.add.graphics()
      this._drawButtonBg(bg, x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, false)

      // Button text
      const text = this.add.text(x, y, label, {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: '28px',
        color: '#1a3a6a',
        align: 'center'
      }).setOrigin(0.5)

      // Interactive hit zone
      const hitZone = this.add.zone(x, y, btnWidth, btnHeight).setInteractive({ useHandCursor: true })

      // Hover effects
      hitZone.on('pointerover', () => {
        bg.clear()
        this._drawButtonBg(bg, x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, true)
        text.setColor('#ffffff')
      })

      hitZone.on('pointerout', () => {
        bg.clear()
        this._drawButtonBg(bg, x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, false)
        text.setColor('#1a3a6a')
      })

      // Click handlers
      hitZone.on('pointerdown', () => this._onButtonClick(label))

      this.menuButtons.push({ bg, text, hitZone, label })
    })
  }

  /**
   * Draws a sketch-style button background.
   */
  _drawButtonBg (gfx, x, y, w, h, hovered) {
    if (hovered) {
      gfx.fillStyle(0x2244aa, 0.9)
    } else {
      gfx.fillStyle(0xf5f0e0, 0.8)
    }
    gfx.fillRoundedRect(x, y, w, h, 8)
    gfx.lineStyle(2, 0x1a3a6a, 1)
    gfx.strokeRoundedRect(x, y, w, h, 8)
  }

  /**
   * Handles menu button clicks.
   */
  _onButtonClick (label) {
    switch (label) {
      case 'Jugar':
        this.scene.start('GameScene')
        break
      case 'Cargar partida':
        console.log('[TitleScene] Cargar partida — mostrando slots (placeholder)')
        break
      case 'Opciones':
        console.log('[TitleScene] Opciones — placeholder')
        break
      case 'Créditos':
        console.log('[TitleScene] Créditos — placeholder')
        break
    }
  }
}
