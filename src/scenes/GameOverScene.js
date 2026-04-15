import Phaser from 'phaser'
import mostrarMensaje from '../utils/MensajeEnPantalla.js'

/**
 * GameOverScene — Overlay scene shown when the player dies.
 * Same visual style as PauseScene: dark overlay, rounded buttons, white text.
 */
export default class GameOverScene extends Phaser.Scene {
  constructor () {
    super('GameOverScene')
  }

  create () {
    const { width, height } = this.cameras.main

    // Semi-transparent dark overlay
    this.overlay = this.add.graphics()
    this.overlay.fillStyle(0x000000, 0.6)
    this.overlay.fillRect(0, 0, width, height)

    // Title: "GAME OVER"
    this.titleText = this.add.text(width / 2, height * 0.25, 'GAME OVER', {
      fontFamily: 'monospace',
      fontSize: '72px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
      align: 'center'
    }).setOrigin(0.5)

    // Create menu buttons
    const buttonLabels = ['Reintentar', 'Cargar partida', 'Menú principal']
    const startY = height * 0.45
    const spacing = 65
    const btnWidth = 400
    const btnHeight = 50

    this.menuButtons = []

    buttonLabels.forEach((label, i) => {
      const x = width / 2
      const y = startY + i * spacing

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

  _retry () {
    this.scene.stop('GameOverScene')
    this.scene.stop('GameScene')
    this.scene.start('GameScene')
  }

  _loadGame () {
    const gameScene = this.scene.get('GameScene')
    if (gameScene?.saveSystem) {
      const state = gameScene.saveSystem.load('quicksave')
      if (state) {
        this.scene.stop('GameOverScene')
        this.scene.stop('GameScene')
        this.scene.start('GameScene')
      } else {
        this._showMessage('No hay guardado rápido')
      }
    }
  }

  _exitToMenu () {
    this.scene.stop('GameOverScene')
    this.scene.stop('GameScene')
    this.scene.start('TitleScene')
  }

  _showMessage (text) {
    mostrarMensaje(this, text, { fontSize: '24px', y: this.cameras.main.height * 0.8 })
  }
}
