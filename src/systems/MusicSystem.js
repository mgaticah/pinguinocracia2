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
const FADE_DURATION = 1500     // ms — crossfade duration
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
    this._fadingOut = []       // sounds being faded out (for cleanup)
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
   * Start a music track with crossfade from the current one.
   * @param {'title'|'explore'|'combat'|'victory'} track
   */
  play (track) {
    if (!this._enabled) return
    if (this._currentTrack === track) return

    const keys = TRACK_KEYS[track]
    if (!keys || keys.length === 0) return

    const key = keys[Math.floor(Math.random() * keys.length)]
    const hasAudio = this._scene?.cache?.audio?.has(key)
    const hasSound = !!this._scene?.sound?.add

    console.log(`[MusicSystem] play("${track}") → key="${key}", audioInCache=${hasAudio}, soundAvailable=${hasSound}`)

    if (!hasSound || !hasAudio) {
      console.warn(`[MusicSystem] Cannot play "${key}" — audio not loaded or sound manager unavailable`)
      this.stop()
      this._currentTrack = track
      return
    }

    // Fade out old track (if any)
    const oldSound = this._currentSound
    if (oldSound) {
      this._fadingOut.push(oldSound)
      try {
        if (this._scene?.tweens && oldSound.isPlaying) {
          this._scene.tweens.add({
            targets: oldSound,
            volume: 0,
            duration: FADE_DURATION,
            onComplete: () => {
              try { oldSound.stop(); oldSound.destroy() } catch (_) {}
              this._fadingOut = this._fadingOut.filter(s => s !== oldSound)
            }
          })
        } else {
          oldSound.stop()
          oldSound.destroy()
          this._fadingOut = this._fadingOut.filter(s => s !== oldSound)
        }
      } catch (_) {}
    }

    // Create and fade in new track
    this._currentTrack = track
    this._currentSound = this._scene.sound.add(key, {
      volume: 0,
      loop: track !== 'victory'
    })
    this._currentSound.play()

    // Fade in
    if (this._scene?.tweens) {
      this._scene.tweens.add({
        targets: this._currentSound,
        volume: MUSIC_VOLUME,
        duration: FADE_DURATION
      })
    } else {
      this._currentSound.volume = MUSIC_VOLUME
    }

    console.log(`[MusicSystem] Playing "${key}" (crossfade ${FADE_DURATION}ms, loop=${track !== 'victory'})`)
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
            onComplete: () => {
              try { sound.stop(); sound.destroy() } catch (_) {}
            }
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

  /** Clean up all sounds including those fading out. */
  destroy () {
    this.stop()
    // Kill any sounds still fading out
    for (const s of this._fadingOut) {
      try { s.stop(); s.destroy() } catch (_) {}
    }
    this._fadingOut = []
  }
}

export { COMBAT_ENEMY_THRESHOLD, COMBAT_CHECK_RANGE, TRACK_KEYS }
