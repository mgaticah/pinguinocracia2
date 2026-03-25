import { describe, it, expect, vi, beforeEach } from 'vitest'
import mostrarMensaje from './MensajeEnPantalla.js'

function createMockScene (overrides = {}) {
  const textObj = {
    text: '',
    style: {},
    originX: 0,
    originY: 0,
    scrollFactorX: 1,
    depth: 0,
    active: true,
    setOrigin: vi.fn(function (x, y) { this.originX = x; this.originY = y; return this }),
    setScrollFactor: vi.fn(function (f) { this.scrollFactorX = f; return this }),
    setDepth: vi.fn(function (d) { this.depth = d; return this }),
    destroy: vi.fn(function () { this.active = false })
  }

  return {
    add: {
      text: vi.fn((x, y, content, style) => {
        textObj.x = x
        textObj.y = y
        textObj.text = content
        textObj.style = style
        return textObj
      })
    },
    cameras: {
      main: { width: 1920, height: 1080 }
    },
    time: {
      delayedCall: vi.fn()
    },
    _textObj: textObj,
    ...overrides
  }
}

describe('mostrarMensaje', () => {
  let scene

  beforeEach(() => {
    scene = createMockScene()
  })

  it('should create a text object with the correct text', () => {
    mostrarMensaje(scene, 'Nivel completado')
    expect(scene.add.text).toHaveBeenCalledWith(
      960, 540, 'Nivel completado', expect.any(Object)
    )
  })

  it('should use monospace font and #1a3a6b color (EstiloSketch)', () => {
    mostrarMensaje(scene, 'Test')
    const style = scene.add.text.mock.calls[0][3]
    expect(style.fontFamily).toBe('monospace')
    expect(style.color).toBe('#1a3a6b')
  })

  it('should set origin to center (0.5, 0.5)', () => {
    mostrarMensaje(scene, 'Test')
    expect(scene._textObj.setOrigin).toHaveBeenCalledWith(0.5, 0.5)
  })

  it('should set scrollFactor to 0', () => {
    mostrarMensaje(scene, 'Test')
    expect(scene._textObj.setScrollFactor).toHaveBeenCalledWith(0)
  })

  it('should set depth to 100', () => {
    mostrarMensaje(scene, 'Test')
    expect(scene._textObj.setDepth).toHaveBeenCalledWith(100)
  })

  it('should schedule destruction after default 2000ms', () => {
    mostrarMensaje(scene, 'Test')
    expect(scene.time.delayedCall).toHaveBeenCalledWith(2000, expect.any(Function))
  })

  it('should destroy the text when the delayed callback fires', () => {
    mostrarMensaje(scene, 'Test')
    const callback = scene.time.delayedCall.mock.calls[0][1]
    callback()
    expect(scene._textObj.destroy).toHaveBeenCalled()
  })

  it('should support custom duration', () => {
    mostrarMensaje(scene, 'Test', { duration: 5000 })
    expect(scene.time.delayedCall).toHaveBeenCalledWith(5000, expect.any(Function))
  })

  it('should support custom fontSize', () => {
    mostrarMensaje(scene, 'Test', { fontSize: '24px' })
    const style = scene.add.text.mock.calls[0][3]
    expect(style.fontSize).toBe('24px')
  })

  it('should support custom y position', () => {
    mostrarMensaje(scene, 'Test', { y: 800 })
    expect(scene.add.text).toHaveBeenCalledWith(960, 800, 'Test', expect.any(Object))
  })

  it('should return null for null scene', () => {
    expect(mostrarMensaje(null, 'Test')).toBeNull()
  })

  it('should return null for scene without add', () => {
    expect(mostrarMensaje({}, 'Test')).toBeNull()
  })

  it('should return null for scene without add.text', () => {
    expect(mostrarMensaje({ add: {} }, 'Test')).toBeNull()
  })

  it('should return the text object on success', () => {
    const result = mostrarMensaje(scene, 'Test')
    expect(result).toBe(scene._textObj)
  })

  it('should not destroy if text is already inactive when callback fires', () => {
    mostrarMensaje(scene, 'Test')
    scene._textObj.active = false
    scene._textObj.destroy.mockClear()
    const callback = scene.time.delayedCall.mock.calls[0][1]
    callback()
    expect(scene._textObj.destroy).not.toHaveBeenCalled()
  })
})
