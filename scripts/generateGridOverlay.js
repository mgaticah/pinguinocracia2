/**
 * Generates a grid overlay on top of a map image.
 * Grid size matches 1 cuerpo (48px at map scale).
 *
 * Usage: node scripts/generateGridOverlay.js <input.png> <output.png> [mapWidth] [mapHeight] [tileSize]
 */
import { createCanvas, loadImage } from 'canvas'
import { writeFileSync } from 'fs'

const [,, inputPath, outputPath, mapW = '3840', mapH = '2160', tile = '48'] = process.argv

const MAP_WIDTH = parseInt(mapW)
const MAP_HEIGHT = parseInt(mapH)
const TILE_SIZE = parseInt(tile)

async function generate () {
  const img = await loadImage(inputPath)
  const canvas = createCanvas(img.width, img.height)
  const ctx = canvas.getContext('2d')

  // Draw original image
  ctx.drawImage(img, 0, 0)

  // Calculate grid spacing in image pixels
  const scaleX = img.width / MAP_WIDTH
  const scaleY = img.height / MAP_HEIGHT
  const gridW = TILE_SIZE * scaleX
  const gridH = TILE_SIZE * scaleY

  // Draw grid lines
  ctx.strokeStyle = 'rgba(255, 0, 0, 0.25)'
  ctx.lineWidth = 1

  // Vertical lines
  for (let x = 0; x <= img.width; x += gridW) {
    ctx.beginPath()
    ctx.moveTo(Math.round(x), 0)
    ctx.lineTo(Math.round(x), img.height)
    ctx.stroke()
  }

  // Horizontal lines
  for (let y = 0; y <= img.height; y += gridH) {
    ctx.beginPath()
    ctx.moveTo(0, Math.round(y))
    ctx.lineTo(img.width, Math.round(y))
    ctx.stroke()
  }

  // Save
  const buffer = canvas.toBuffer('image/png')
  writeFileSync(outputPath, buffer)

  const cols = Math.floor(MAP_WIDTH / TILE_SIZE)
  const rows = Math.floor(MAP_HEIGHT / TILE_SIZE)
  console.log(`Generated grid overlay: ${cols}×${rows} tiles (${TILE_SIZE}px each)`)
  console.log(`Image: ${img.width}×${img.height}px → grid spacing: ${gridW.toFixed(1)}×${gridH.toFixed(1)}px`)
  console.log(`→ ${outputPath}`)
}

generate().catch(e => { console.error(e); process.exit(1) })
