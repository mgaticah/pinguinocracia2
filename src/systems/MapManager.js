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
  map_barros_arana: {
    key: 'map_barros_arana',
    name: 'Barros Arana',
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
      { x: 3792, y: 960, width: 48, height: 192, targetMap: 'map_amunategui' }
    ],
    difficultyModifier: 1.0
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
  map_barros_arana: [
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

    this.currentMap = config

    // Build walkable grid
    this._buildWalkableGrid(key)

    // If running inside a real Phaser scene, generate procedural visuals
    if (scene && scene.add) {
      this._generateProceduralMap(key, scene)
    }

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
    return { width: MAP_WIDTH, height: MAP_HEIGHT }
  }

  // -----------------------------------------------------------------------
  // Internal helpers
  // -----------------------------------------------------------------------

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

    // --- background layer ---
    const bgKey = `${key}_bg`
    if (scene.textures && scene.textures.exists(bgKey)) {
      // Use custom background image
      const bgImage = scene.add.image(MAP_WIDTH / 2, MAP_HEIGHT / 2, bgKey)
      bgImage.setDisplaySize(MAP_WIDTH, MAP_HEIGHT)
      bgImage.setDepth(-10)
    } else {
      // Fallback: procedural notebook background
      const bg = scene.add.graphics()
      bg.fillStyle(0xfdf6e3, 1)
      bg.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT)
      bg.lineStyle(1, 0x8cb4d4, 0.35)
      for (let y = TILE_SIZE; y < MAP_HEIGHT; y += TILE_SIZE) {
        bg.lineBetween(0, y, MAP_WIDTH, y)
      }
      bg.lineStyle(2, 0xd45d5d, 0.5)
      bg.lineBetween(96, 0, 96, MAP_HEIGHT)
      bg.setDepth(-10)
    }

    const hasCustomBg = scene.textures && scene.textures.exists(bgKey)

    // --- ground layer (only if no custom background) ---
    if (!hasCustomBg) {
      const ground = scene.add.graphics()
      ground.fillStyle(0xede4d0, 1)
      for (let y = 0; y < MAP_HEIGHT; y += 480) {
        ground.fillRect(0, y, MAP_WIDTH, 192)
      }
      for (let x = 0; x < MAP_WIDTH; x += 480) {
        ground.fillRect(x, 0, 192, MAP_HEIGHT)
      }
      ground.setDepth(-9)
    }

    // --- obstacles layer (invisible physics bodies when custom bg, visible otherwise) ---
    if (scene.physics && scene.physics.add) {
      this._obstacleGroup = scene.physics.add.staticGroup()

      const obstacles = OBSTACLE_LAYOUTS[key] || []
      for (const obs of obstacles) {
        if (hasCustomBg) {
          // Invisible collision body only
          const zone = scene.add.zone(obs.x + obs.width / 2, obs.y + obs.height / 2, obs.width, obs.height)
          scene.physics.add.existing(zone, true)
          this._obstacleGroup.add(zone)
        } else {
          // Visible rectangle + collision
          const rect = scene.add.rectangle(obs.x + obs.width / 2, obs.y + obs.height / 2, obs.width, obs.height, 0xb0c4de, 0.6)
          rect.setDepth(-8)
          this._obstacleGroup.add(rect)
          rect.body.setSize(obs.width, obs.height)
          rect.body.setOffset(-obs.width / 2, -obs.height / 2)
        }
      }
    }

    // --- decorations layer (map name label) ---
    if (scene.add.text) {
      const label = scene.add.text(MAP_WIDTH / 2, 48, config.name, {
        fontSize: '28px',
        color: '#3366aa',
        fontFamily: 'Comic Sans MS, cursive'
      })
      label.setOrigin(0.5, 0)
      label.setDepth(-7)
    }

    // --- zones layer (exit zones as invisible overlap areas) ---
    if (scene.physics && scene.physics.add) {
      this._exitZoneBodies = []
      for (const ez of config.exitZones) {
        const zone = scene.add.zone(
          ez.x + ez.width / 2,
          ez.y + ez.height / 2,
          ez.width,
          ez.height
        )
        scene.physics.add.existing(zone, true) // static body
        zone.targetMap = ez.targetMap
        this._exitZoneBodies.push(zone)
      }
    }
  }
}
