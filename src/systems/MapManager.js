/**
 * MapManager — Manages map configurations, loading, and spatial queries.
 *
 * Currently uses procedural generation as placeholder until real Tiled JSON
 * tilemaps are available. The public API matches the design spec so that
 * swapping to real tilemaps later requires no changes to consumers.
 */

// ---------------------------------------------------------------------------
// Map configurations for the 4 game maps
// ---------------------------------------------------------------------------

const MAP_WIDTH = 3840
const MAP_HEIGHT = 2160
const TILE_SIZE = 48

export const MAP_CONFIGS = {
  map_level1: {
    key: 'map_level1',
    name: 'Level 1',
    tilemapKey: 'tilemap_barros_arana',
    entryPoint: { x: 192, y: 1080 },
    spawnPoints: [
      { x: 96, y: 96 },
      { x: 3744, y: 96 },
      { x: 3744, y: 2064 },
      { x: 96, y: 2064 }
    ],
    powerupPoints: [
      { x: 960, y: 540 },
      { x: 1920, y: 1080 },
      { x: 2880, y: 540 },
      { x: 960, y: 1620 },
      { x: 2880, y: 1620 }
    ],
    exitZones: [
      { x: 3792, y: 960, width: 48, height: 192, targetMap: 'map_level2' }
    ],
    difficultyModifier: 1.0
  },

  map_level2: {
    key: 'map_level2',
    name: 'Level 2',
    tilemapKey: 'tilemap_level2',
    width: 2752,
    height: 1536,
    entryPoint: { x: 192, y: 768 },
    spawnPoints: [
      { x: 96, y: 96 },
      { x: 2656, y: 96 },
      { x: 2656, y: 1440 },
      { x: 96, y: 1440 }
    ],
    powerupPoints: [
      { x: 688, y: 384 },
      { x: 1376, y: 768 },
      { x: 2064, y: 384 },
      { x: 688, y: 1152 },
      { x: 2064, y: 1152 }
    ],
    exitZones: [
      { x: 2704, y: 672, width: 48, height: 192, targetMap: 'map_amunategui' }
    ],
    difficultyModifier: 1.2
  },

  map_amunategui: {
    key: 'map_amunategui',
    name: 'Amunátegui',
    tilemapKey: 'tilemap_amunategui',
    entryPoint: { x: 192, y: 1080 },
    spawnPoints: [
      { x: 96, y: 96 },
      { x: 3744, y: 96 },
      { x: 3744, y: 2064 },
      { x: 96, y: 2064 }
    ],
    powerupPoints: [
      { x: 480, y: 480 },
      { x: 1440, y: 1080 },
      { x: 2400, y: 480 },
      { x: 1440, y: 1620 },
      { x: 3360, y: 1080 }
    ],
    exitZones: [
      { x: 3792, y: 960, width: 48, height: 192, targetMap: 'map_lastarria' }
    ],
    difficultyModifier: 1.2
  },

  map_lastarria: {
    key: 'map_lastarria',
    name: 'Lastarria',
    tilemapKey: 'tilemap_lastarria',
    entryPoint: { x: 192, y: 1080 },
    spawnPoints: [
      { x: 96, y: 96 },
      { x: 3744, y: 96 },
      { x: 3744, y: 2064 },
      { x: 96, y: 2064 },
      { x: 1920, y: 96 }
    ],
    powerupPoints: [
      { x: 720, y: 360 },
      { x: 1920, y: 720 },
      { x: 3120, y: 360 },
      { x: 720, y: 1800 },
      { x: 3120, y: 1800 }
    ],
    exitZones: [
      { x: 3792, y: 960, width: 48, height: 192, targetMap: 'map_plaza_italia' }
    ],
    difficultyModifier: 1.4
  },

  map_plaza_italia: {
    key: 'map_plaza_italia',
    name: 'Plaza Italia',
    tilemapKey: 'tilemap_plaza_italia',
    entryPoint: { x: 192, y: 1080 },
    spawnPoints: [
      { x: 96, y: 96 },
      { x: 3744, y: 96 },
      { x: 3744, y: 2064 },
      { x: 96, y: 2064 },
      { x: 1920, y: 96 },
      { x: 1920, y: 2064 }
    ],
    powerupPoints: [
      { x: 960, y: 540 },
      { x: 1920, y: 540 },
      { x: 2880, y: 540 },
      { x: 960, y: 1620 },
      { x: 1920, y: 1620 },
      { x: 2880, y: 1620 }
    ],
    exitZones: [],
    difficultyModifier: 1.6
  }
}

// ---------------------------------------------------------------------------
// Obstacle layout definitions (procedural placeholder)
// Each obstacle is { x, y, width, height } in world coordinates
// ---------------------------------------------------------------------------

const OBSTACLE_LAYOUTS = {
  map_level1: [
    { x: 480, y: 240, width: 288, height: 192 },
    { x: 1200, y: 240, width: 384, height: 192 },
    { x: 2400, y: 240, width: 288, height: 192 },
    { x: 480, y: 720, width: 192, height: 384 },
    { x: 1680, y: 600, width: 480, height: 288 },
    { x: 3120, y: 720, width: 192, height: 384 },
    { x: 480, y: 1440, width: 288, height: 192 },
    { x: 1680, y: 1320, width: 480, height: 288 },
    { x: 3120, y: 1440, width: 288, height: 192 },
    { x: 480, y: 1872, width: 288, height: 192 },
    { x: 2400, y: 1872, width: 288, height: 192 }
  ],
  map_amunategui: [
    { x: 384, y: 192, width: 384, height: 192 },
    { x: 1440, y: 192, width: 288, height: 192 },
    { x: 2880, y: 192, width: 384, height: 192 },
    { x: 384, y: 768, width: 192, height: 480 },
    { x: 1920, y: 576, width: 384, height: 384 },
    { x: 3360, y: 768, width: 192, height: 480 },
    { x: 384, y: 1536, width: 384, height: 192 },
    { x: 1920, y: 1344, width: 384, height: 384 },
    { x: 3360, y: 1536, width: 384, height: 192 }
  ],
  map_lastarria: [
    { x: 288, y: 192, width: 480, height: 192 },
    { x: 1680, y: 192, width: 480, height: 192 },
    { x: 3072, y: 192, width: 480, height: 192 },
    { x: 288, y: 864, width: 192, height: 384 },
    { x: 1920, y: 672, width: 288, height: 288 },
    { x: 3552, y: 864, width: 192, height: 384 },
    { x: 288, y: 1536, width: 480, height: 192 },
    { x: 1920, y: 1344, width: 288, height: 288 },
    { x: 3072, y: 1536, width: 480, height: 192 }
  ],
  map_plaza_italia: [
    { x: 288, y: 288, width: 384, height: 192 },
    { x: 3168, y: 288, width: 384, height: 192 },
    { x: 288, y: 1680, width: 384, height: 192 },
    { x: 3168, y: 1680, width: 384, height: 192 }
  ]
}

// ---------------------------------------------------------------------------
// MapManager class
// ---------------------------------------------------------------------------

export default class MapManager {
  constructor () {
    /** @type {Map<string, object>} */
    this.maps = new Map(Object.entries(MAP_CONFIGS))

    /** @type {object|null} */
    this.currentMap = null

    /** @type {Phaser.Physics.Arcade.StaticGroup|null} */
    this._obstacleGroup = null

    /** @type {number[][]} 2-D grid: 0 = walkable, 1 = obstacle */
    this._walkableGrid = []
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Load a map into the given Phaser scene.
   *
   * Currently generates a procedural notebook-style map. When real Tiled
   * JSON tilemaps are available, this method will use scene.make.tilemap()
   * and create layers from the JSON data, setting collision on the
   * obstacles layer via setCollisionByProperty({ collides: true }).
   *
   * @param {string} key - Map key (e.g. 'map_barros_arana')
   * @param {Phaser.Scene} scene - The active Phaser scene
   * @returns {object} The MapConfig for the loaded map
   */
  loadMap (key, scene) {
    const config = this.maps.get(key)
    if (!config) {
      throw new Error(`MapManager: unknown map key "${key}"`)
    }

    // Clean up previous map visuals and physics
    this._cleanupPreviousMap(scene)

    this.currentMap = config

    // Build walkable grid — prefer JSON collision grid, fallback to hardcoded
    const gridKey = `${key}_grid`
    if (scene && scene.cache?.json?.has(gridKey)) {
      const data = scene.cache.json.get(gridKey)
      this._walkableGrid = data.grid

      // Override config with zone data from the collision image
      if (data.playerSpawn) {
        config.entryPoint = { x: data.playerSpawn.x, y: data.playerSpawn.y }
      }
      if (data.enemySpawns && data.enemySpawns.length > 0) {
        config.spawnPoints = data.enemySpawns.map(s => ({ x: s.x, y: s.y }))
      }
      if (data.vehicleSpawns && data.vehicleSpawns.length > 0) {
        config.vehicleSpawnPoints = data.vehicleSpawns.map(s => ({ x: s.x, y: s.y }))
      }
      if (data.goalZones && data.goalZones.length > 0) {
        // Build exit zones from goal tiles — compute bounding rect
        const minX = Math.min(...data.goalZones.map(g => g.x)) - TILE_SIZE / 2
        const minY = Math.min(...data.goalZones.map(g => g.y)) - TILE_SIZE / 2
        const maxX = Math.max(...data.goalZones.map(g => g.x)) + TILE_SIZE / 2
        const maxY = Math.max(...data.goalZones.map(g => g.y)) + TILE_SIZE / 2
        config.exitZones = [{
          x: minX,
          y: minY,
          width: maxX - minX,
          height: maxY - minY,
          targetMap: config.exitZones?.[0]?.targetMap || null
        }]
      }
    } else {
      this._buildWalkableGrid(key)
    }

    // Generate visuals
    if (scene && scene.add) {
      this._generateProceduralMap(key, scene)
    }

    // Build physics obstacles from grid (replaces hardcoded obstacles when JSON exists)
    if (scene && scene.physics?.add) {
      const hasJsonGrid = scene.cache?.json?.has(gridKey)
      if (hasJsonGrid) {
        this._buildObstaclesFromGrid(scene)
      }
    }

    // Log map loading info
    const hasBg = scene?.textures?.exists(`${key}_bg`)
    const hasGrid = scene?.cache?.json?.has(`${key}_grid`)
    const obsTiles = this._walkableGrid.flat().filter(v => v === 1).length
    console.log(`[MapManager] Loaded "${key}" (${config.name})`)
    console.log(`  Background: ${hasBg ? 'custom image' : 'procedural'}`)
    console.log(`  Collisions: ${hasGrid ? 'JSON grid' : 'hardcoded obstacles'} (${obsTiles} obstacle tiles)`)
    console.log(`  Entry: (${config.entryPoint.x}, ${config.entryPoint.y}), Spawns: ${config.spawnPoints.length}, Exits: ${config.exitZones.length}`)

    return config
  }

  /**
   * @param {string} key
   * @returns {{ x: number, y: number }[]}
   */
  getSpawnPoints (key) {
    const config = this.maps.get(key)
    return config ? [...config.spawnPoints] : []
  }

  /**
   * @param {string} key
   * @returns {{ x: number, y: number }[]}
   */
  getVehicleSpawnPoints (key) {
    const config = this.maps.get(key)
    return config?.vehicleSpawnPoints ? [...config.vehicleSpawnPoints] : this.getSpawnPoints(key)
  }

  /**
   * @param {string} key
   * @returns {{ x: number, y: number }[]}
   */
  getPowerupPoints (key) {
    const config = this.maps.get(key)
    return config ? [...config.powerupPoints] : []
  }

  /**
   * @param {string} key
   * @returns {{ x: number, y: number, width: number, height: number, targetMap: string }[]}
   */
  getExitZones (key) {
    const config = this.maps.get(key)
    return config ? [...config.exitZones] : []
  }

  /**
   * @param {string} key
   * @returns {{ x: number, y: number }|null}
   */
  getEntryPoint (key) {
    const config = this.maps.get(key)
    return config ? { ...config.entryPoint } : null
  }

  /**
   * Returns the obstacle group for physics collision setup.
   * @returns {Phaser.Physics.Arcade.StaticGroup|null}
   */
  getObstacleLayer () {
    return this._obstacleGroup
  }

  /**
   * Returns a 2-D grid for pathfinding (0 = walkable, 1 = obstacle).
   * Grid dimensions: cols = MAP_WIDTH / TILE_SIZE, rows = MAP_HEIGHT / TILE_SIZE
   * @returns {number[][]}
   */
  getWalkableGrid () {
    return this._walkableGrid
  }

  /**
   * @returns {{ width: number, height: number }}
   */
  getMapDimensions () {
    if (this.currentMap?.width && this.currentMap?.height) {
      return { width: this.currentMap.width, height: this.currentMap.height }
    }
    return { width: MAP_WIDTH, height: MAP_HEIGHT }
  }

  // -----------------------------------------------------------------------
  // Internal helpers
  // -----------------------------------------------------------------------

  /**
   * Clean up all visual and physics elements from the previous map.
   */
  _cleanupPreviousMap (scene) {
    if (!scene) return

    // Destroy map visual container (bg, ground, labels, obstacle rects)
    if (this._mapContainer) {
      this._mapContainer.destroy(true)
      this._mapContainer = null
    }

    // Destroy any leftover objects at low depth (map visuals)
    if (scene.children) {
      const toRemove = []
      scene.children.each(child => {
        if (child && child.depth !== undefined && child.depth <= -7) {
          toRemove.push(child)
        }
      })
      for (const obj of toRemove) {
        obj.destroy()
      }
    }

    // Destroy obstacle physics group and all its children
    if (this._obstacleGroup) {
      // Destroy each child explicitly (some may not be in the container)
      if (this._obstacleGroup.getChildren) {
        for (const child of this._obstacleGroup.getChildren()) {
          if (child?.destroy) child.destroy()
        }
      }
      this._obstacleGroup.clear(true, true)
      this._obstacleGroup = null
    }

    // Destroy exit zone bodies
    if (this._exitZoneBodies) {
      for (const z of this._exitZoneBodies) {
        if (z?.destroy) z.destroy()
      }
      this._exitZoneBodies = []
    }
  }

  /**
   * Build a tile-based walkable grid from the obstacle layout.
   * @param {string} key
   */
  _buildWalkableGrid (key) {
    const cols = Math.floor(MAP_WIDTH / TILE_SIZE)
    const rows = Math.floor(MAP_HEIGHT / TILE_SIZE)
    const grid = Array.from({ length: rows }, () => new Array(cols).fill(0))

    const obstacles = OBSTACLE_LAYOUTS[key] || []
    for (const obs of obstacles) {
      const startCol = Math.floor(obs.x / TILE_SIZE)
      const startRow = Math.floor(obs.y / TILE_SIZE)
      const endCol = Math.min(cols - 1, Math.floor((obs.x + obs.width - 1) / TILE_SIZE))
      const endRow = Math.min(rows - 1, Math.floor((obs.y + obs.height - 1) / TILE_SIZE))

      for (let r = startRow; r <= endRow; r++) {
        for (let c = startCol; c <= endCol; c++) {
          grid[r][c] = 1
        }
      }
    }

    this._walkableGrid = grid
  }

  /**
   * Generate a procedural notebook-style map using Phaser Graphics.
   * This is a placeholder — will be replaced by real Tiled tilemap loading.
   *
   * Layers generated (matching Tiled layer names):
   *   background — cream fill + blue horizontal lines
   *   ground     — walkable street areas (lighter fill)
   *   obstacles  — static physics bodies for collision
   *   decorations — street name labels
   *   zones      — invisible exit zone overlap areas
   *
   * @param {string} key
   * @param {Phaser.Scene} scene
   */
  _generateProceduralMap (key, scene) {
    const config = this.maps.get(key)
    const { width: mapW, height: mapH } = this.getMapDimensions()

    // Create a container for all map visuals — easy to destroy on transition
    this._mapContainer = scene.add.container(0, 0)
    this._mapContainer.setDepth(-10)

    // --- background layer ---
    const bgKey = `${key}_bg`
    if (scene.textures && scene.textures.exists(bgKey)) {
      const bgImage = scene.add.image(mapW / 2, mapH / 2, bgKey)
      bgImage.setDisplaySize(mapW, mapH)
      this._mapContainer.add(bgImage)
    } else {
      const bg = scene.add.graphics()
      bg.fillStyle(0xfdf6e3, 1)
      bg.fillRect(0, 0, mapW, mapH)
      bg.lineStyle(1, 0x8cb4d4, 0.35)
      for (let y = TILE_SIZE; y < mapH; y += TILE_SIZE) {
        bg.lineBetween(0, y, mapW, y)
      }
      bg.lineStyle(2, 0xd45d5d, 0.5)
      bg.lineBetween(96, 0, 96, mapH)
      this._mapContainer.add(bg)

      // Ground layer
      const ground = scene.add.graphics()
      ground.fillStyle(0xede4d0, 1)
      for (let y = 0; y < mapH; y += 480) {
        ground.fillRect(0, y, mapW, 192)
      }
      for (let x = 0; x < mapW; x += 480) {
        ground.fillRect(x, 0, 192, mapH)
      }
      this._mapContainer.add(ground)
    }

    // --- obstacles layer (skip if JSON grid handles collisions) ---
    const gridKey2 = `${key}_grid`
    const hasJsonGrid = scene.cache?.json?.has(gridKey2)
    const hasCustomBg = scene.textures && scene.textures.exists(bgKey)
    if (!hasJsonGrid && scene.physics && scene.physics.add) {
      this._obstacleGroup = scene.physics.add.staticGroup()

      const obstacles = OBSTACLE_LAYOUTS[key] || []
      for (const obs of obstacles) {
        if (hasCustomBg) {
          const zone = scene.add.zone(obs.x + obs.width / 2, obs.y + obs.height / 2, obs.width, obs.height)
          scene.physics.add.existing(zone, true)
          this._obstacleGroup.add(zone)
        } else {
          const rect = scene.add.rectangle(obs.x + obs.width / 2, obs.y + obs.height / 2, obs.width, obs.height, 0xb0c4de, 0.6)
          this._obstacleGroup.add(rect)
          this._mapContainer.add(rect)
          rect.body.setSize(obs.width, obs.height)
          rect.body.setOffset(-obs.width / 2, -obs.height / 2)
        }
      }
    }

    // --- decorations layer (map name label) ---
    if (scene.add.text) {
      const label = scene.add.text(mapW / 2, 48, config.name, {
        fontSize: '28px',
        color: '#3366aa',
        fontFamily: 'Comic Sans MS, cursive'
      })
      label.setOrigin(0.5, 0)
      label.setDepth(1)
      this._mapContainer.add(label)
    }
  }

  /**
   * Build invisible physics bodies from the walkable grid.
   * Groups adjacent obstacle tiles into larger rectangles for efficiency.
   */
  _buildObstaclesFromGrid (scene) {
    this._obstacleGroup = scene.physics.add.staticGroup()
    const grid = this._walkableGrid
    if (!grid || grid.length === 0) return

    const rows = grid.length
    const cols = grid[0].length
    const visited = Array.from({ length: rows }, () => new Array(cols).fill(false))

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        if (grid[row][col] !== 1 || visited[row][col]) continue

        let w = 0
        while (col + w < cols && grid[row][col + w] === 1 && !visited[row][col + w]) w++

        let h = 1
        let canExtend = true
        while (row + h < rows && canExtend) {
          for (let c = col; c < col + w; c++) {
            if (grid[row + h][c] !== 1 || visited[row + h][c]) { canExtend = false; break }
          }
          if (canExtend) h++
        }

        for (let r = row; r < row + h; r++) {
          for (let c = col; c < col + w; c++) visited[r][c] = true
        }

        const x = col * TILE_SIZE + (w * TILE_SIZE) / 2
        const y = row * TILE_SIZE + (h * TILE_SIZE) / 2
        const zone = scene.add.zone(x, y, w * TILE_SIZE, h * TILE_SIZE)
        scene.physics.add.existing(zone, true)
        this._obstacleGroup.add(zone)
      }
    }
  }
}
