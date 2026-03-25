/**
 * MensajeEnPantalla — Shows a temporary centered message on screen.
 * Uses EstiloSketch styling (monospace, #1a3a6b).
 *
 * @param {Phaser.Scene} scene - The scene to show the message in
 * @param {string} text - The message text
 * @param {object} [options] - Optional configuration
 * @param {number} [options.duration=2000] - Duration in ms before the message disappears
 * @param {string} [options.fontSize='40px'] - Font size
 * @param {number} [options.y] - Custom Y position (defaults to center)
 * @returns {Phaser.GameObjects.Text|null} The text object, or null if scene is invalid
 */
export default function mostrarMensaje (scene, text, options = {}) {
  if (!scene || !scene.add || !scene.add.text) return null

  const duration = options.duration ?? 2000
  const fontSize = options.fontSize ?? '40px'
  const { width, height } = scene.cameras.main
  const yPos = options.y ?? height / 2

  const msg = scene.add.text(width / 2, yPos, text, {
    fontFamily: 'monospace',
    fontSize,
    color: '#1a3a6b'
  })
  msg.setOrigin(0.5, 0.5)
  msg.setScrollFactor(0)
  msg.setDepth(100)

  scene.time.delayedCall(duration, () => {
    if (msg && msg.active) {
      msg.destroy()
    }
  })

  return msg
}
