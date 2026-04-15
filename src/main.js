import Phaser from 'phaser'
import BootScene from './scenes/BootScene.js'
import TitleScene from './scenes/TitleScene.js'
import GameScene from './scenes/GameScene.js'
import HUDScene from './scenes/HUDScene.js'
import PauseScene from './scenes/PauseScene.js'
import GameOverScene from './scenes/GameOverScene.js'
import VictoryScene from './scenes/VictoryScene.js'
import LevelCompleteScene from './scenes/LevelCompleteScene.js'
import ShopScene from './scenes/ShopScene.js'

const config = {
  type: Phaser.AUTO,
  width: 1920,
  height: 1080,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false
    }
  },
  scene: [
    BootScene,
    TitleScene,
    GameScene,
    HUDScene,
    PauseScene,
    GameOverScene,
    VictoryScene,
    LevelCompleteScene,
    ShopScene
  ]
}

const game = new Phaser.Game(config)

export default game
