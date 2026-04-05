import Phaser from 'phaser'

/**
 * LevelCompleteScene — Overlay shown between levels.
 * Displays celebracion.png background, a congratulations message,
 * and a "Continuar" button to proceed to the next level.
 */
export default class LevelCompleteScene extends Phaser.Scene {
  constructor () {
    super('LevelCompleteScene')
  }

  create () {
    const { width, height } = this.cameras.main
    const data = this.scene.settings.data || {}
    const levelName = data.levelName || ''
    const targetMap = data.targetMap || ''

    // Background image
    if (this.textures.exists('celebracion')) {
      const bg = this.add.image(width / 2, height / 2, 'celebracion')
      bg.setDisplaySize(width, height)
    } else {
      // Fallback dark overlay
      const gfx = this.add.graphics()
      gfx.fillStyle(0x000000, 0.8)
      gfx.fillRect(0, 0, width, height)
    }

    // Semi-transparent band behind text for readability
    const band = this.add.graphics()
    band.fillStyle(0x000000, 0.5)
    band.fillRect(0, height * 0.25, width, height * 0.5)

    // Title
    this.add.text(width / 2, height * 0.33, '¡Nivel superado!', {
      fontFamily: 'monospace',
      fontSize: '64px',
      color: '#ffffff',
      fontStyle: 'bold',
      align: 'center',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5)

    // Level name
    if (levelName) {
      this.add.text(width / 2, height * 0.44, levelName, {
        fontFamily: 'monospace',
        fontSize: '32px',
        color: '#ffdd44',
        align: 'center',
        stroke: '#000000',
        strokeThickness: 3
      }).setOrigin(0.5)
    }

    // "Continuar" button
    const btnY = height * 0.6
    const btnText = this.add.text(width / 2, btnY, 'Continuar ▶', {
      fontFamily: 'monospace',
      fontSize: '36px',
      color: '#ffffff',
      align: 'center',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5)

    const hitZone = this.add.zone(width / 2, btnY, 400, 60)
      .setInteractive({ useHandCursor: true })

    hitZone.on('pointerover', () => btnText.setColor('#66ff66'))
    hitZone.on('pointerout', () => btnText.setColor('#ffffff'))
    hitZone.on('pointerdown', () => {
      this.scene.stop('LevelCompleteScene')
      this.scene.resume('GameScene')
      // Tell GameScene to proceed with the transition
      const gameScene = this.scene.get('GameScene')
      if (gameScene && gameScene._proceedTransition) {
        gameScene._proceedTransition(targetMap)
      }
    })

    // Pulse animation on button
    this.tweens.add({
      targets: btnText,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    })
  }
}
