import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('phaser', () => ({
  default: {
    Events: { EventEmitter: class {} }
  }
}))

vi.mock('../EventBus.js', () => ({
  default: {
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn()
  }
}))

import EventBus from '../EventBus.js'
import ScoreSystem, {
  POINTS_TABLE,
  ALLY_BONUS_PER_ALLY,
  TIME_BONUS_PER_SECOND,
  POWERUP_BONUS
} from './ScoreSystem.js'

describe('ScoreSystem', () => {
  let scoreSystem

  beforeEach(() => {
    vi.clearAllMocks()
    scoreSystem = new ScoreSystem()
  })

  afterEach(() => {
    scoreSystem.destroy()
  })

  // -------------------------------------------------------------------
  // Constants
  // -------------------------------------------------------------------

  describe('POINTS_TABLE', () => {
    it('should have correct points for each enemy type', () => {
      expect(POINTS_TABLE.estandar).toBe(10)
      expect(POINTS_TABLE.montado).toBe(20)
      expect(POINTS_TABLE.agua).toBe(50)
      expect(POINTS_TABLE.gas).toBe(40)
    })
  })

  // -------------------------------------------------------------------
  // Initial state
  // -------------------------------------------------------------------

  describe('constructor', () => {
    it('should initialize score to 0', () => {
      expect(scoreSystem.score).toBe(0)
      expect(scoreSystem.getTotal()).toBe(0)
    })

    it('should have the correct pointsTable', () => {
      expect(scoreSystem.pointsTable).toEqual(POINTS_TABLE)
    })

    it('should register enemy:killed listener on EventBus', () => {
      expect(EventBus.on).toHaveBeenCalledWith('enemy:killed', expect.any(Function))
    })
  })

  // -------------------------------------------------------------------
  // addKill()
  // -------------------------------------------------------------------

  describe('addKill()', () => {
    it('should add 10 points for estandar', () => {
      scoreSystem.addKill('estandar')
      expect(scoreSystem.getTotal()).toBe(10)
    })

    it('should add 20 points for montado', () => {
      scoreSystem.addKill('montado')
      expect(scoreSystem.getTotal()).toBe(20)
    })

    it('should add 50 points for agua', () => {
      scoreSystem.addKill('agua')
      expect(scoreSystem.getTotal()).toBe(50)
    })

    it('should add 40 points for gas', () => {
      scoreSystem.addKill('gas')
      expect(scoreSystem.getTotal()).toBe(40)
    })

    it('should add 0 points for unknown enemy type', () => {
      scoreSystem.addKill('unknownType')
      expect(scoreSystem.getTotal()).toBe(0)
    })

    it('should accumulate points from multiple kills', () => {
      scoreSystem.addKill('estandar')
      scoreSystem.addKill('montado')
      scoreSystem.addKill('agua')
      expect(scoreSystem.getTotal()).toBe(80)
    })

    it('should emit score:changed on EventBus', () => {
      scoreSystem.addKill('estandar')
      expect(EventBus.emit).toHaveBeenCalledWith('score:changed', { score: 10, delta: 10 })
    })
  })

  // -------------------------------------------------------------------
  // addAllyBonus()
  // -------------------------------------------------------------------

  describe('addAllyBonus()', () => {
    it('should add 5 points per ally', () => {
      scoreSystem.addAllyBonus(3)
      expect(scoreSystem.getTotal()).toBe(15)
    })

    it('should add 0 points for 0 allies', () => {
      scoreSystem.addAllyBonus(0)
      expect(scoreSystem.getTotal()).toBe(0)
    })

    it('should emit score:changed on EventBus', () => {
      scoreSystem.addAllyBonus(2)
      expect(EventBus.emit).toHaveBeenCalledWith('score:changed', { score: 10, delta: 10 })
    })
  })

  // -------------------------------------------------------------------
  // addTimeBonus()
  // -------------------------------------------------------------------

  describe('addTimeBonus()', () => {
    it('should add 1 point per second', () => {
      scoreSystem.addTimeBonus(30)
      expect(scoreSystem.getTotal()).toBe(30)
    })

    it('should floor fractional seconds', () => {
      scoreSystem.addTimeBonus(10.7)
      expect(scoreSystem.getTotal()).toBe(10)
    })

    it('should add 0 for 0 seconds', () => {
      scoreSystem.addTimeBonus(0)
      expect(scoreSystem.getTotal()).toBe(0)
    })

    it('should emit score:changed on EventBus', () => {
      scoreSystem.addTimeBonus(5)
      expect(EventBus.emit).toHaveBeenCalledWith('score:changed', { score: 5, delta: 5 })
    })
  })

  // -------------------------------------------------------------------
  // addPowerupBonus()
  // -------------------------------------------------------------------

  describe('addPowerupBonus()', () => {
    it('should add 5 points', () => {
      scoreSystem.addPowerupBonus()
      expect(scoreSystem.getTotal()).toBe(5)
    })

    it('should accumulate with multiple powerups', () => {
      scoreSystem.addPowerupBonus()
      scoreSystem.addPowerupBonus()
      scoreSystem.addPowerupBonus()
      expect(scoreSystem.getTotal()).toBe(15)
    })

    it('should emit score:changed on EventBus', () => {
      scoreSystem.addPowerupBonus()
      expect(EventBus.emit).toHaveBeenCalledWith('score:changed', { score: 5, delta: 5 })
    })
  })

  // -------------------------------------------------------------------
  // getTotal()
  // -------------------------------------------------------------------

  describe('getTotal()', () => {
    it('should return accumulated score from all sources', () => {
      scoreSystem.addKill('estandar')            // +10
      scoreSystem.addAllyBonus(2)               // +10
      scoreSystem.addTimeBonus(5)               // +5
      scoreSystem.addPowerupBonus()             // +5
      expect(scoreSystem.getTotal()).toBe(30)
    })
  })

  // -------------------------------------------------------------------
  // EventBus integration (enemy:killed triggers addKill)
  // -------------------------------------------------------------------

  describe('EventBus integration', () => {
    it('should auto-add kill when enemy:killed is emitted', () => {
      // Get the registered callback
      const onCall = EventBus.on.mock.calls.find(c => c[0] === 'enemy:killed')
      expect(onCall).toBeDefined()
      const callback = onCall[1]

      callback({ type: 'montado', points: 20 })
      expect(scoreSystem.getTotal()).toBe(20)
    })

    it('should not crash if enemy:killed has no type', () => {
      const onCall = EventBus.on.mock.calls.find(c => c[0] === 'enemy:killed')
      const callback = onCall[1]

      callback({})
      expect(scoreSystem.getTotal()).toBe(0)
    })

    it('should not crash if enemy:killed payload is null', () => {
      const onCall = EventBus.on.mock.calls.find(c => c[0] === 'enemy:killed')
      const callback = onCall[1]

      callback(null)
      expect(scoreSystem.getTotal()).toBe(0)
    })
  })

  // -------------------------------------------------------------------
  // destroy()
  // -------------------------------------------------------------------

  describe('destroy()', () => {
    it('should unregister enemy:killed listener from EventBus', () => {
      scoreSystem.destroy()
      expect(EventBus.off).toHaveBeenCalledWith('enemy:killed', expect.any(Function))
    })
  })
})
