import Phaser from 'phaser'
import mostrarMensaje from '../utils/MensajeEnPantalla.js'

/**
 * PauseScene — Overlay scene launched when ESC is pressed during GameScene.
 * Pauses all game logic and provides menu options.
 * EstiloSketch: monospace font, #1a3a6b color.
 */
export default class PauseScene extends Phaser.Scene {
  constructor () {
    super('PauseScene')
  }

  create () {
    const { width, height } = this.cameras.main

    // Semi-transparent dark overlay
    this.overlay = this.add.graphics()
    this.overlay.fillStyle(0x000000, 0.6)
    this.overlay.fillRect(0, 0, width, height)

    // Title: "PAUSA"
    this.titleText = this.add.text(width / 2, height * 0.25, 'PAUSA', {
      fontFamily: 'monospace',
      fontSize: '72px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
      align: 'center'
    }).setOrigin(0.5)

    // Create menu buttons
    const buttonLabels = ['Continuar', 'Guardar partida', 'Cargar partida', 'Salir al menú principal']
    const startY = height * 0.45
    const spacing = 65
    const btnWidth = 400
    const btnHeight = 50

    this.menuButtons = []

    buttonLabels.forEach((label, i) => {
      const x = width / 2
      const y = startY + i * spacing

      // Button background
      const bg = this.add.graphics()
      this._drawButtonBg(bg, x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, false)

      const text = this.add.text(x, y, label, {
        fontFamily: 'monospace',
        fontSize: '28px',
        color: '#ffffff',
        align: 'center'
      }).setOrigin(0.5)

      const hitZone = this.add.zone(x, y, btnWidth, btnHeight).setInteractive({ useHandCursor: true })

      hitZone.on('pointerover', () => {
        bg.clear()
        this._drawButtonBg(bg, x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, true)
        text.setColor('#ffdd44')
      })

      hitZone.on('pointerout', () => {
        bg.clear()
        this._drawButtonBg(bg, x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, false)
        text.setColor('#ffffff')
      })

      hitZone.on('pointerdown', () => this._onButtonClick(label))

      this.menuButtons.push({ bg, text, hitZone, label })
    })
  }

  /**
   * Draw a button background rectangle.
   */
  _drawButtonBg (gfx, x, y, w, h, hovered) {
    if (hovered) {
      gfx.fillStyle(0x2244aa, 0.85)
    } else {
      gfx.fillStyle(0x000000, 0.5)
    }
    gfx.fillRoundedRect(x, y, w, h, 8)
    gfx.lineStyle(2, 0xffffff, 0.6)
    gfx.strokeRoundedRect(x, y, w, h, 8)
  }

  /**
   * Handle button clicks.
   */
  _onButtonClick (label) {
    switch (label) {
      case 'Continuar':
        this._resume()
        break
      case 'Guardar partida':
        this._saveGame()
        break
      case 'Cargar partida':
        this._loadGame()
        break
      case 'Salir al menú principal':
        this._exitToMenu()
        break
    }
  }

  /**
   * Resume GameScene from paused state.
   */
  _resume () {
    this.scene.resume('GameScene')
    this.scene.stop('PauseScene')
  }

  /**
   * Save game via GameScene's saveSystem.
   */
  _saveGame () {
    const gameScene = this.scene.get('GameScene')
    if (gameScene && gameScene.saveSystem) {
      const state = gameScene.saveSystem.buildGameState(gameScene)
      const success = gameScene.saveSystem.save('quicksave', state)
      if (success) {
        this._showMessage('Partida guardada')
      } else {
        this._showMessage('No se pudo guardar')
      }
    }
  }

  /**
   * Load game via GameScene's saveSystem.
   */
  _loadGame () {
    const gameScene = this.scene.get('GameScene')
    if (gameScene && gameScene.saveSystem) {
      const state = gameScene.saveSystem.load('quicksave')
      if (state) {
        gameScene.saveSystem.restoreGameState(gameScene, state)
        this._resume()
      } else {
        this._showMessage('No hay guardado rápido')
      }
    }
  }

  /**
   * Exit to TitleScene, stopping GameScene.
   */
  _exitToMenu () {
    this.scene.stop('GameScene')
    this.scene.start('TitleScene')
  }

  /**
   * Show a temporary message on the pause overlay.
   */
  _showMessage (text) {
    mostrarMensaje(this, text, { fontSize: '24px', y: this.cameras.main.height * 0.8 })
  }
}
