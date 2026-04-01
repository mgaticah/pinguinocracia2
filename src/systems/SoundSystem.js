import EventBus from '../EventBus.js'

/**
 * SoundSystem — Procedural sound effects using Web Audio API.
 * Generates placeholder sounds without external files.
 * Replace with real audio files later via Phaser's sound manager.
 */
export default class SoundSystem {
  constructor (scene) {
    this.scene = scene
    this._ctx = null
    this._enabled = true

    try {
      this._ctx = new (window.AudioContext || window.webkitAudioContext)()
    } catch (e) {
      console.warn('[SoundSystem] Web Audio not available')
    }

    this._bindEvents()
  }

  _bindEvents () {
    this._onThrow = () => this.playThrow()
    this._onHit = () => this.playHit()
    this._onEnemyKilled = () => this.playEnemyDeath()
    this._onPlayerDamaged = () => this.playPlayerHurt()
    this._onPowerup = () => this.playPowerup()
    this._onGameOver = () => this.playGameOver()
    this._onVictory = () => this.playVictory()

    EventBus.on('projectile:fired', this._onThrow)
    EventBus.on('enemy:killed', this._onEnemyKilled)
    EventBus.on('player:damaged', this._onPlayerDamaged)
    EventBus.on('powerup:collected', this._onPowerup)
    EventBus.on('gameover', this._onGameOver)
    EventBus.on('victory', this._onVictory)
  }

  /** Stone/molotov throw — short whoosh */
  playThrow () {
    this._play((ctx, t) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(400, t)
      osc.frequency.exponentialRampToValueAtTime(200, t + 0.15)
      gain.gain.setValueAtTime(0.3, t)
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15)
      osc.connect(gain).connect(ctx.destination)
      osc.start(t)
      osc.stop(t + 0.15)
    })
  }

  /** Impact hit — short thud */
  playHit () {
    this._play((ctx, t) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'square'
      osc.frequency.setValueAtTime(150, t)
      osc.frequency.exponentialRampToValueAtTime(50, t + 0.1)
      gain.gain.setValueAtTime(0.4, t)
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1)
      osc.connect(gain).connect(ctx.destination)
      osc.start(t)
      osc.stop(t + 0.1)
    })
  }

  /** Enemy death — descending tone */
  playEnemyDeath () {
    this._play((ctx, t) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(500, t)
      osc.frequency.exponentialRampToValueAtTime(80, t + 0.3)
      gain.gain.setValueAtTime(0.25, t)
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3)
      osc.connect(gain).connect(ctx.destination)
      osc.start(t)
      osc.stop(t + 0.3)
    })
  }

  /** Player hurt — low buzz */
  playPlayerHurt () {
    this._play((ctx, t) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'square'
      osc.frequency.setValueAtTime(100, t)
      osc.frequency.setValueAtTime(120, t + 0.05)
      osc.frequency.setValueAtTime(80, t + 0.1)
      gain.gain.setValueAtTime(0.35, t)
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2)
      osc.connect(gain).connect(ctx.destination)
      osc.start(t)
      osc.stop(t + 0.2)
    })
  }

  /** Powerup collected — bright ding */
  playPowerup () {
    this._play((ctx, t) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(800, t)
      osc.frequency.setValueAtTime(1200, t + 0.05)
      gain.gain.setValueAtTime(0.2, t)
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2)
      osc.connect(gain).connect(ctx.destination)
      osc.start(t)
      osc.stop(t + 0.2)
    })
  }

  /** Game over — low descending drone */
  playGameOver () {
    this._play((ctx, t) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(200, t)
      osc.frequency.exponentialRampToValueAtTime(40, t + 0.8)
      gain.gain.setValueAtTime(0.3, t)
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.8)
      osc.connect(gain).connect(ctx.destination)
      osc.start(t)
      osc.stop(t + 0.8)
    })
  }

  /** Victory — ascending fanfare */
  playVictory () {
    this._play((ctx, t) => {
      const notes = [523, 659, 784, 1047] // C5, E5, G5, C6
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, t + i * 0.15)
        gain.gain.setValueAtTime(0.2, t + i * 0.15)
        gain.gain.exponentialRampToValueAtTime(0.01, t + i * 0.15 + 0.3)
        osc.connect(gain).connect(ctx.destination)
        osc.start(t + i * 0.15)
        osc.stop(t + i * 0.15 + 0.3)
      })
    })
  }

  /**
   * Execute a sound function safely.
   * @param {Function} fn - receives (audioContext, currentTime)
   */
  _play (fn) {
    if (!this._enabled || !this._ctx) return
    try {
      if (this._ctx.state === 'suspended') this._ctx.resume()
      fn(this._ctx, this._ctx.currentTime)
    } catch (e) {
      // Silently ignore audio errors
    }
  }

  /** Clean up EventBus listeners. */
  destroy () {
    EventBus.off('projectile:fired', this._onThrow)
    EventBus.off('enemy:killed', this._onEnemyKilled)
    EventBus.off('player:damaged', this._onPlayerDamaged)
    EventBus.off('powerup:collected', this._onPowerup)
    EventBus.off('gameover', this._onGameOver)
    EventBus.off('victory', this._onVictory)
  }
}
