/**
 * MusicSystem — Background music with real MP3 tracks via Phaser sound manager.
 *
 * Tracks:
 *   - title:   menu.mp3
 *   - explore: explore1.mp3 or explore2.mp3 (random)
 *   - combat:  combat1.mp3 or combat2.mp3 (random)
 *   - victory: victory1.mp3 or victory2.mp3 (random)
 *
 * Crossfades between explore ↔ combat based on nearby enemy count.
 */

const COMBAT_ENEMY_THRESHOLD = 1
const COMBAT_CHECK_RANGE = 720 // 15 cuerpos
const FADE_DURATION = 800      // ms
const MUSIC_VOLUME = 0.4

const TRACK_KEYS = {
  title: ['music_menu'],
  explore: ['music_explore1', 'music_explore2'],
  combat: ['music_combat1', 'music_combat2'],
  victory: ['music_victory1', 'music_victory2']
}

export default class MusicSystem {
  /**
   * @param {Phaser.Scene} [scene] - A Phaser scene for sound manager access
   */
  constructor (scene) {
    this._scene = scene || null
    this._currentTrack = null  // 'title' | 'explore' | 'combat' | 'victory'
    this._currentSound = null  // Phaser sound instance
    this._enabled = true
  }

  /**
   * Attach to a Phaser scene (needed for sound manager access).
   * @param {Phaser.Scene} scene
   */
  setScene (scene) {
    this._scene = scene
  }

  /**
   * Start a music track. Stops the current one first.
   * @param {'title'|'explore'|'combat'|'victory'} track
   */
  play (track) {
    if (!this._enabled) return
    if (this._currentTrack === track) return

    this.stop()
    this._currentTrack = track

    const keys = TRACK_KEYS[track]
    if (!keys || keys.length === 0) return

    // Pick a random key from available options
    const key = keys[Math.floor(Math.random() * keys.length)]

    // Try Phaser sound manager
    if (this._scene?.sound?.add && this._scene.cache?.audio?.has(key)) {
      this._currentSound = this._scene.sound.add(key, {
        volume: MUSIC_VOLUME,
        loop: track !== 'victory' // victory plays once
      })
      this._currentSound.play()
    }
  }

  /** Stop current music with fade out. */
  stop () {
    if (this._currentSound) {
      try {
        if (this._scene?.tweens && this._currentSound.isPlaying) {
          const sound = this._currentSound
          this._scene.tweens.add({
            targets: sound,
            volume: 0,
            duration: FADE_DURATION,
            onComplete: () => { sound.stop(); sound.destroy() }
          })
        } else {
          this._currentSound.stop()
          this._currentSound.destroy()
        }
      } catch (_) {}
      this._currentSound = null
    }
    this._currentTrack = null
  }

  /**
   * Check nearby enemies and switch between explore/combat.
   * Call from GameScene.update().
   * @param {Phaser.Scene} scene
   */
  updateCombatState (scene) {
    if (!this._enabled) return
    if (this._currentTrack !== 'explore' && this._currentTrack !== 'combat') return

    const player = scene?.player
    if (!player || !player.isAlive) return

    const enemies = scene.enemyGroup?.getChildren?.() || []
    let nearbyCount = 0
    for (const e of enemies) {
      if (!e.active || e.isDead) continue
      const dx = e.x - player.x
      const dy = e.y - player.y
      if (dx * dx + dy * dy <= COMBAT_CHECK_RANGE * COMBAT_CHECK_RANGE) {
        nearbyCount++
        if (nearbyCount >= COMBAT_ENEMY_THRESHOLD) break
      }
    }

    const shouldCombat = nearbyCount >= COMBAT_ENEMY_THRESHOLD
    if (shouldCombat && this._currentTrack === 'explore') {
      this.play('combat')
    } else if (!shouldCombat && this._currentTrack === 'combat') {
      this.play('explore')
    }
  }

  /** Clean up. */
  destroy () {
    this.stop()
  }
}

export { COMBAT_ENEMY_THRESHOLD, COMBAT_CHECK_RANGE, TRACK_KEYS }
