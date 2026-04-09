import Phaser from 'phaser'

/**
 * VictoryScene — Overlay scene shown when the player survives the final event.
 * Displays "PINGÜINOCRACIA 2", "Manifestación completada", final score,
 * and navigation options with EstiloSketch styling.
 */
export default class VictoryScene extends Phaser.Scene {
  constructor () {
    super('VictoryScene')
  }

  create () {
    const { width, height } = this.cameras.main
    const score = (this.scene.settings.data && this.scene.settings.data.score) || 0

    // Dark overlay background
    this.overlay = this.add.graphics()
    this.overlay.fillStyle(0x000000, 0.7)
    this.overlay.fillRect(0, 0, width, height)

    // Play victory music
    const music = this.registry?.get('musicSystem')
    if (music) {
      music.setScene(this)
      music.play('victory')
    }

    // Title: "PINGÜINOCRACIA 2"
    this.titleText = this.add.text(width / 2, height * 0.2, 'PINGÜINOCRACIA 2', {
      fontFamily: 'monospace',
      fontSize: '80px',
      color: '#1a3a6b',
      fontStyle: 'bold',
      align: 'center'
    }).setOrigin(0.5)

    // Subtitle: "Manifestación completada"
    this.subtitleText = this.add.text(width / 2, height * 0.32, 'Manifestación completada', {
      fontFamily: 'monospace',
      fontSize: '36px',
      color: '#1a3a6b',
      align: 'center'
    }).setOrigin(0.5)

    // Score display
    this.scoreText = this.add.text(width / 2, height * 0.45, `Puntaje final: ${score}`, {
      fontFamily: 'monospace',
      fontSize: '32px',
      color: '#1a3a6b',
      align: 'center'
    }).setOrigin(0.5)

    // Create menu buttons
    const buttonLabels = ['Jugar nuevamente', 'Menú principal']
    const startY = height * 0.6
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
      case 'Jugar nuevamente':
        this._playAgain()
        break
      case 'Menú principal':
        this._exitToMenu()
        break
    }
  }

  /**
   * Restart GameScene from scratch.
   */
  _playAgain () {
    this.scene.stop('VictoryScene')
    this.scene.stop('GameScene')
    this.scene.start('GameScene')
  }

  /**
   * Exit to TitleScene.
   */
  _exitToMenu () {
    this.scene.stop('VictoryScene')
    this.scene.stop('GameScene')
    this.scene.start('TitleScene')
  }
}
