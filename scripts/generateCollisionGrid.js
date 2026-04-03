/**
 * Reads a collision image and generates a JSON grid file.
 * Red pixels (R > 150, G < 100, B < 100) = obstacle (1), else walkable (0).
 *
 * Usage: node scripts/generateCollisionGrid.js <image> <output.json> [mapWidth] [mapHeight] [tileSize]
 * Example: node scripts/generateCollisionGrid.js public/assets/bloqueoslevel1.png public/assets/collision_barros_arana.json
 */
import { createCanvas, loadImage } from 'canvas'
import { writeFileSync } from 'fs'

const [,, imagePath, outputPath, mapW = '3840', mapH = '2160', tile = '48'] = process.argv

const MAP_WIDTH = parseInt(mapW)
const MAP_HEIGHT = parseInt(mapH)
const TILE_SIZE = parseInt(tile)

async function generate () {
  const img = await loadImage(imagePath)
  const canvas = createCanvas(img.width, img.height)
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0)

  const cols = Math.floor(MAP_WIDTH / TILE_SIZE)
  const rows = Math.floor(MAP_HEIGHT / TILE_SIZE)
  const scaleX = img.width / MAP_WIDTH
  const scaleY = img.height / MAP_HEIGHT

  const grid = []
  for (let row = 0; row < rows; row++) {
    const rowData = []
    for (let col = 0; col < cols; col++) {
      const px = Math.floor((col * TILE_SIZE + TILE_SIZE / 2) * scaleX)
      const py = Math.floor((row * TILE_SIZE + TILE_SIZE / 2) * scaleY)
      const pixel = ctx.getImageData(px, py, 1, 1).data
      const r = pixel[0], g = pixel[1], b = pixel[2]
      rowData.push(r > 150 && g < 100 && b < 100 ? 1 : 0)
    }
    grid.push(rowData)
  }

  writeFileSync(outputPath, JSON.stringify({ cols, rows, tileSize: TILE_SIZE, grid }))
  const obstacles = grid.flat().filter(v => v === 1).length
  console.log(`Generated ${cols}x${rows} grid (${obstacles} obstacle tiles) → ${outputPath}`)
}

generate().catch(e => { console.error(e); process.exit(1) })
