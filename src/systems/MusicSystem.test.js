import { describe, it, expect, vi, beforeEach } from 'vitest'

function createMockScene () {
  const sounds = []
  return {
    sound: {
      add: vi.fn((key, config) => {
        const s = { key, config, isPlaying: true, volume: config?.volume || 1, play: vi.fn(), stop: vi.fn(), destroy: vi.fn() }
        sounds.push(s)
        return s
      })
    },
    cache: {
      audio: {
        has: vi.fn(() => true)
      }
    },
    tweens: {
      add: vi.fn((config) => { if (config.onComplete) config.onComplete() })
    },
    _sounds: sounds
  }
}

describe('MusicSystem', () => {
  let MusicSystem, COMBAT_ENEMY_THRESHOLD, COMBAT_CHECK_RANGE, TRACK_KEYS

  beforeEach(async () => {
    vi.clearAllMocks()
    const mod = await import('./MusicSystem.js')
    MusicSystem = mod.default
    COMBAT_ENEMY_THRESHOLD = mod.COMBAT_ENEMY_THRESHOLD
    COMBAT_CHECK_RANGE = mod.COMBAT_CHECK_RANGE
    TRACK_KEYS = mod.TRACK_KEYS
  })

  function create () {
    const scene = createMockScene()
    const ms = new MusicSystem(scene)
    return { ms, scene }
  }

  it('should initialize with no current track', () => {
    const { ms } = create()
    expect(ms._currentTrack).toBeNull()
  })

  it('should play title track', () => {
    const { ms, scene } = create()
    ms.play('title')
    expect(ms._currentTrack).toBe('title')
    expect(scene.sound.add).toHaveBeenCalledWith('music_menu', expect.objectContaining({ loop: true }))
    ms.destroy()
  })

  it('should play explore track (random pick)', () => {
    const { ms, scene } = create()
    ms.play('explore')
    expect(ms._currentTrack).toBe('explore')
    const key = scene.sound.add.mock.calls[0][0]
    expect(['music_explore1', 'music_explore2']).toContain(key)
    ms.destroy()
  })

  it('should play combat track (random pick)', () => {
    const { ms, scene } = create()
    ms.play('combat')
    expect(ms._currentTrack).toBe('combat')
    const key = scene.sound.add.mock.calls[0][0]
    expect(['music_combat1', 'music_combat2']).toContain(key)
    ms.destroy()
  })

  it('should play victory track without loop', () => {
    const { ms, scene } = create()
    ms.play('victory')
    expect(ms._currentTrack).toBe('victory')
    expect(scene.sound.add).toHaveBeenCalledWith(
      expect.stringMatching(/music_victory/),
      expect.objectContaining({ loop: false })
    )
    ms.destroy()
  })

  it('should not restart same track', () => {
    const { ms, scene } = create()
    ms.play('explore')
    scene.sound.add.mockClear()
    ms.play('explore')
    expect(scene.sound.add).not.toHaveBeenCalled()
    ms.destroy()
  })

  it('should switch tracks', () => {
    const { ms } = create()
    ms.play('explore')
    ms.play('combat')
    expect(ms._currentTrack).toBe('combat')
    ms.destroy()
  })

  it('should stop and clear current track', () => {
    const { ms } = create()
    ms.play('title')
    ms.stop()
    expect(ms._currentTrack).toBeNull()
  })

  it('should switch to combat when enemies are near', () => {
    const { ms } = create()
    ms.play('explore')
    const gameScene = {
      player: { x: 100, y: 100, isAlive: true },
      enemyGroup: {
        getChildren: () => [{ x: 200, y: 100, active: true, isDead: false }]
      }
    }
    ms.updateCombatState(gameScene)
    expect(ms._currentTrack).toBe('combat')
    ms.destroy()
  })

  it('should switch back to explore when no enemies near', () => {
    const { ms } = create()
    ms.play('combat')
    const gameScene = {
      player: { x: 100, y: 100, isAlive: true },
      enemyGroup: { getChildren: () => [] }
    }
    ms.updateCombatState(gameScene)
    expect(ms._currentTrack).toBe('explore')
    ms.destroy()
  })

  it('should not change track from title on combat check', () => {
    const { ms } = create()
    ms.play('title')
    const gameScene = {
      player: { x: 100, y: 100, isAlive: true },
      enemyGroup: {
        getChildren: () => [{ x: 200, y: 100, active: true, isDead: false }]
      }
    }
    ms.updateCombatState(gameScene)
    expect(ms._currentTrack).toBe('title')
    ms.destroy()
  })

  it('should clean up on destroy', () => {
    const { ms } = create()
    ms.play('explore')
    ms.destroy()
    expect(ms._currentTrack).toBeNull()
  })

  it('should export constants', () => {
    expect(COMBAT_ENEMY_THRESHOLD).toBe(1)
    expect(COMBAT_CHECK_RANGE).toBe(720)
    expect(TRACK_KEYS.title).toEqual(['music_menu'])
    expect(TRACK_KEYS.explore).toHaveLength(2)
    expect(TRACK_KEYS.combat).toHaveLength(2)
    expect(TRACK_KEYS.victory).toHaveLength(2)
  })
})
