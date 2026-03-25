import Phaser from 'phaser'
import mostrarMensaje from '../utils/MensajeEnPantalla.js'

/**
 * GameOverScene — Overlay scene shown when the player dies.
 * Displays "GAME OVER" with EstiloSketch and provides navigation options.
 */
export default class GameOverScene extends Phaser.Scene {
  constructor () {
    super('GameOverScene')
  }

  create () {
    const { width, height } = this.cameras.main

    // Dark overlay background
    this.overlay = this.add.graphics()
    this.overlay.fillStyle(0x000000, 0.7)
    this.overlay.fillRect(0, 0, width, height)

    // Title: "GAME OVER"
    this.titleText = this.add.text(width / 2, height * 0.3, 'GAME OVER', {
      fontFamily: 'monospace',
      fontSize: '80px',
      color: '#1a3a6b',
      fontStyle: 'bold',
      align: 'center'
    }).setOrigin(0.5)

    // Create menu buttons
    const buttonLabels = ['Reintentar', 'Cargar partida', 'Menú principal']
    const startY = height * 0.5
    const spacing = 65
    const btnWidth = 400
    const btnHeight = 50

    this.menuButtons = []

    buttonLabels.forEach((label, i) => {
      const x = width / 2
      const y = startY + i * spacing

      const text = this.add.text(x, y, label, {
        fontFamily: 'monospace',
        fontSize: '28px',
        color: '#1a3a6b',
        align: 'center'
      }).setOrigin(0.5)

      const hitZone = this.add.zone(x, y, btnWidth, btnHeight).setInteractive({ useHandCursor: true })

      hitZone.on('pointerover', () => {
        text.setColor('#ffffff')
      })

      hitZone.on('pointerout', () => {
        text.setColor('#1a3a6b')
      })

      hitZone.on('pointerdown', () => this._onButtonClick(label))

      this.menuButtons.push({ text, hitZone, label })
    })
  }

  /**
   * Handle button clicks.
   */
  _onButtonClick (label) {
    switch (label) {
      case 'Reintentar':
        this._retry()
        break
      case 'Cargar partida':
        this._loadGame()
        break
      case 'Menú principal':
        this._exitToMenu()
        break
    }
  }

  /**
   * Restart GameScene from scratch.
   */
  _retry () {
    this.scene.stop('GameOverScene')
    this.scene.stop('GameScene')
    this.scene.start('GameScene')
  }

  /**
   * Load game from quicksave slot.
   */
  _loadGame () {
    const gameScene = this.scene.get('GameScene')
    if (gameScene && gameScene.saveSystem) {
      const state = gameScene.saveSystem.load('quicksave')
      if (state) {
        this.scene.stop('GameOverScene')
        this.scene.stop('GameScene')
        this.scene.start('GameScene')
        // Note: restoreGameState would be called after GameScene re-creates
      } else {
        this._showMessage('No hay guardado rápido')
      }
    }
  }

  /**
   * Exit to TitleScene.
   */
  _exitToMenu () {
    this.scene.stop('GameOverScene')
    this.scene.stop('GameScene')
    this.scene.start('TitleScene')
  }

  /**
   * Show a temporary message.
   */
  _showMessage (text) {
    mostrarMensaje(this, text, { fontSize: '24px', y: this.cameras.main.height * 0.8 })
  }
}
