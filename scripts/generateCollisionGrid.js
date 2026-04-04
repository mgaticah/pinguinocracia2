/**
 * Reads a collision/zone image and generates a JSON grid file.
 * Color codes (hex in image):
 *   #FF0000 = obstacle/block (1 in grid)
 *   #FFD800 = goal/level end zone
 *   #0026FF = foot enemy spawn
 *   #4CFF00 = player spawn
 *   #FF6A00 = vehicle spawn
 *   anything else = walkable (0 in grid)
 *
 * Output JSON: { cols, rows, tileSize, grid, playerSpawn, goalZones, enemySpawns, vehicleSpawns }
 *
 * Usage: node scripts/generateCollisionGrid.js <image> <output.json> [mapWidth] [mapHeight] [tileSize]
 */
import { createCanvas, loadImage } from 'canvas'
import { writeFileSync } from 'fs'

const [,, imagePath, outputPath, mapW = '3840', mapH = '2160', tile = '48'] = process.argv

const MAP_WIDTH = parseInt(mapW)
const MAP_HEIGHT = parseInt(mapH)
const TILE_SIZE = parseInt(tile)

// Color matching with tolerance
function colorMatch (r, g, b, tr, tg, tb, tol = 40) {
  return Math.abs(r - tr) <= tol && Math.abs(g - tg) <= tol && Math.abs(b - tb) <= tol
}

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
  const goalZones = []
  const enemySpawns = []
  const vehicleSpawns = []
  let playerSpawn = null

  for (let row = 0; row < rows; row++) {
    const rowData = []
    for (let col = 0; col < cols; col++) {
      const px = Math.floor((col * TILE_SIZE + TILE_SIZE / 2) * scaleX)
      const py = Math.floor((row * TILE_SIZE + TILE_SIZE / 2) * scaleY)
      const pixel = ctx.getImageData(px, py, 1, 1).data
      const r = pixel[0], g = pixel[1], b = pixel[2]

      const worldX = col * TILE_SIZE + TILE_SIZE / 2
      const worldY = row * TILE_SIZE + TILE_SIZE / 2

      if (colorMatch(r, g, b, 0xFF, 0x00, 0x00)) {
        // Red = obstacle
        rowData.push(1)
      } else if (colorMatch(r, g, b, 0xFF, 0xD8, 0x00)) {
        // Yellow = goal zone
        rowData.push(0)
        goalZones.push({ col, row, x: worldX, y: worldY })
      } else if (colorMatch(r, g, b, 0x00, 0x26, 0xFF)) {
        // Blue = foot enemy spawn
        rowData.push(0)
        enemySpawns.push({ col, row, x: worldX, y: worldY })
      } else if (colorMatch(r, g, b, 0x4C, 0xFF, 0x00)) {
        // Green = player spawn
        rowData.push(0)
        if (!playerSpawn) {
          playerSpawn = { col, row, x: worldX, y: worldY }
        }
      } else if (colorMatch(r, g, b, 0xFF, 0x6A, 0x00)) {
        // Orange = vehicle spawn
        rowData.push(0)
        vehicleSpawns.push({ col, row, x: worldX, y: worldY })
      } else {
        rowData.push(0)
      }
    }
    grid.push(rowData)
  }

  const result = {
    cols,
    rows,
    tileSize: TILE_SIZE,
    grid,
    playerSpawn,
    goalZones,
    enemySpawns,
    vehicleSpawns
  }

  writeFileSync(outputPath, JSON.stringify(result))

  const obstacles = grid.flat().filter(v => v === 1).length
  console.log(`Generated ${cols}x${rows} grid:`)
  console.log(`  Obstacles: ${obstacles}`)
  console.log(`  Player spawn: ${playerSpawn ? `(${playerSpawn.x}, ${playerSpawn.y})` : 'NOT FOUND'}`)
  console.log(`  Goal zones: ${goalZones.length}`)
  console.log(`  Enemy spawns (foot): ${enemySpawns.length}`)
  console.log(`  Vehicle spawns: ${vehicleSpawns.length}`)
  console.log(`→ ${outputPath}`)
}

generate().catch(e => { console.error(e); process.exit(1) })
