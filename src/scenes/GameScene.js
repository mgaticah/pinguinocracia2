import Phaser from 'phaser'
import Player from '../entities/Player.js'
import MapManager from '../systems/MapManager.js'
import SpawnSystem from '../systems/SpawnSystem.js'
import ScoreSystem from '../systems/ScoreSystem.js'
import PowerupSpawnSystem from '../systems/PowerupSpawnSystem.js'
import EffectSystem from '../systems/EffectSystem.js'
import FormationSystem from '../systems/FormationSystem.js'
import SaveSystem from '../systems/SaveSystem.js'
import FinalEventSystem from '../systems/FinalEventSystem.js'
import SoundSystem from '../systems/SoundSystem.js'
import AliadoEstandar from '../entities/AliadoEstandar.js'
import AliadoRapido from '../entities/AliadoRapido.js'
import AliadoPunk from '../entities/AliadoPunk.js'
import EventBus from '../EventBus.js'
import mostrarMensaje from '../utils/MensajeEnPantalla.js'

export default class GameScene extends Phaser.Scene {
  constructor () {
    super('GameScene')
  }

  create () {
    // Shared molotov counter
    this.globalCounter = { molotovs: 0 }

    // Physics groups
    this.projectileGroup = this.physics.add.group({ runChildUpdate: true })
    this.enemyGroup = this.physics.add.group()

    // --- Map setup ---
    this.currentMapKey = 'map_barros_arana'
    this.mapManager = new MapManager()
    this.mapManager.loadMap(this.currentMapKey, this)

    const { width: mapWidth, height: mapHeight } = this.mapManager.getMapDimensions()

    // Set world physics bounds to map size
    this.physics.world.setBounds(0, 0, mapWidth, mapHeight)

    // Set camera bounds and smooth follow
    this.cameras.main.setBounds(0, 0, mapWidth, mapHeight)

    // Position player at the map's entry point
    const entry = this.mapManager.getEntryPoint(this.currentMapKey)
    const startX = entry ? entry.x : 960
    const startY = entry ? entry.y : 540

    this.player = new Player(this, startX, startY)
    this.player.setCollideWorldBounds(true)
    this.player.globalCounter = this.globalCounter
    this.player.projectileGroup = this.projectileGroup

    // Camera follows player with smooth lerp
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1)

    // Collision: player vs obstacle layer
    const obstacleLayer = this.mapManager.getObstacleLayer()
    if (obstacleLayer) {
      this.physics.add.collider(this.player, obstacleLayer)
    }

    // --- Spawn system ---
    this.totalTime = 0
    this.spawnSystem = new SpawnSystem(this)

    // --- Powerup system ---
    this.powerupGroup = this.physics.add.staticGroup()
    this.powerupSpawnSystem = new PowerupSpawnSystem(this, this.powerupGroup)

    // Overlap: Player ↔ powerupGroup → collect powerup
    this.physics.add.overlap(
      this.player,
      this.powerupGroup,
      this._onPlayerCollectPowerup,
      null,
      this
    )

    // --- Ally group and formation ---
    this.allyGroup = this.physics.add.group()
    this.formationSystem = new FormationSystem()

    // Overlap: Ally ↔ powerupGroup → smart collect
    this.physics.add.overlap(
      this.allyGroup,
      this.powerupGroup,
      this._onAllyCollectPowerup,
      null,
      this
    )

    // Overlap: Ally ↔ enemyGroup → ally takes damage
    this.physics.add.overlap(
      this.allyGroup,
      this.enemyGroup,
      this._onAllyHitEnemy,
      null,
      this
    )

    // --- Effect system ---
    this.effectSystem = new EffectSystem()

    // --- Score system ---
    this.scoreSystem = new ScoreSystem()

    // Launch HUD overlay scene
    this.scene.launch('HUDScene')

    // --- Final Event System (only active in Plaza Italia) ---
    this.finalEventSystem = new FinalEventSystem(this)

    // --- Save system ---
    this.saveSystem = new SaveSystem()

    // --- Sound system (procedural Web Audio) ---
    this.soundSystem = new SoundSystem(this)

    // Q key toggles weapon
    this.input.keyboard.on('keydown-Q', () => {
      if (this.player && this.player.isAlive) {
        this.player.switchWeapon()
      }
    })

    // F5 → quicksave
    this.input.keyboard.on('keydown-F5', (event) => {
      if (event && event.preventDefault) event.preventDefault()
      this._quicksave()
    })

    // F9 → quickload
    this.input.keyboard.on('keydown-F9', (event) => {
      if (event && event.preventDefault) event.preventDefault()
      this._quickload()
    })

    // ESC → pause game and launch PauseScene
    this.input.keyboard.on('keydown-ESC', () => {
      this._pauseGame()
    })

    // When this scene is resumed (from PauseScene), resume physics
    this.events.on('resume', () => {
      this.physics.resume()
    })

    // Listen for gameover event from EventBus
    EventBus.on('gameover', this._onGameOver, this)

    // Listen for victory event from FinalEventSystem
    EventBus.on('victory', (data) => {
      this.scene.launch('VictoryScene', { score: data.score })
    })

    // Left-click fires projectile toward pointer world position
    this.input.on('pointerdown', (pointer) => {
      if (pointer.leftButtonDown() && this.player && this.player.isAlive) {
        this.player.shoot(pointer.worldX, pointer.worldY)
      }
    })

    // Spacebar fires projectile in the player's facing direction
    this.input.keyboard.on('keydown-SPACE', (event) => {
      if (event && event.preventDefault) event.preventDefault()
      if (this.player && this.player.isAlive) {
        this.player.shootInFacingDirection()
      }
    })

    // Zoom controls: + / - keys and mouse wheel
    this._zoomLevel = 1
    this._minZoom = 0.4
    this._maxZoom = 2.0
    this._zoomStep = 0.1

    this.input.keyboard.on('keydown-PLUS', () => this._zoomIn())
    this.input.keyboard.on('keydown-NUMPAD_ADD', () => this._zoomIn())
    this.input.keyboard.on('keydown-MINUS', () => this._zoomOut())
    this.input.keyboard.on('keydown-NUMPAD_SUBTRACT', () => this._zoomOut())

    this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
      if (deltaY < 0) this._zoomIn()
      else if (deltaY > 0) this._zoomOut()
    })

    // Listen for zoom requests from HUD buttons
    EventBus.on('zoom:request', (data) => {
      if (data.direction === 'in') this._zoomIn()
      else if (data.direction === 'out') this._zoomOut()
    })

    // Overlap: projectiles vs enemies → damage + destroy projectile
    this.physics.add.overlap(
      this.projectileGroup,
      this.enemyGroup,
      this._onProjectileHitEnemy,
      null,
      this
    )

    // Overlap: Player ↔ enemyGroup → player takes damage
    this.physics.add.overlap(
      this.player,
      this.enemyGroup,
      this._onPlayerHitEnemy,
      null,
      this
    )

    // --- Exit zones ---
    this._isTransitioning = false
    this._setupExitZones()

    // Check if starting on Plaza Italia (handle edge case)
    if (this.currentMapKey === 'map_plaza_italia') {
      this.finalEventSystem.start(90)
      this._showMessage('Manifestación final')
    }
  }

  update (time, delta) {
    if (this.player && this.player.isAlive) {
      this.player.move(this.player.keys)
    }

    // Track total elapsed time in seconds
    this.totalTime += delta / 1000

    // Update spawn system
    const allyCount = this.allyGroup ? this.allyGroup.getChildren().filter(a => a.active).length : 0
    this.spawnSystem.update(delta, this.totalTime, allyCount)

    // Update powerup spawn system
    const playerHp = this.player ? this.player.hp : 10
    const enemyCount = this.enemyGroup ? this.enemyGroup.getChildren().filter(e => e.active).length : 0
    this.powerupSpawnSystem.update(delta, playerHp, enemyCount)

    // Update effect system (delta is in ms from Phaser, convert to seconds)
    this.effectSystem.update(delta / 1000)

    // Update formation system and allies
    if (this.allyGroup && this.player) {
      const allies = this.allyGroup.getChildren()
      this.formationSystem.update(allies, this.player)
      for (const ally of allies) {
        if (ally.active && !ally.isDead && ally.update) {
          ally.update(delta)
        }
      }
    }

    // Update enemies
    if (this.enemyGroup) {
      for (const enemy of this.enemyGroup.getChildren()) {
        if (enemy.active && !enemy.isDead && enemy.update) {
          enemy.update(delta)
        }
      }
    }

    // Update final event system
    if (this.finalEventSystem) {
      this.finalEventSystem.update(delta)
    }
  }

  /**
   * Callback when a projectile overlaps an enemy.
   * @param {Projectile} projectile
   * @param {Enemy} enemy
   */
  _onProjectileHitEnemy (projectile, enemy) {
    if (enemy.takeDamage) {
      enemy.takeDamage(projectile.damage)
    }
    if (this.soundSystem) this.soundSystem.playHit()
    projectile.destroy()
  }

  /**
   * Callback when the player overlaps a powerup.
   * @param {Player} player
   * @param {Powerup} powerup
   */
  _onPlayerCollectPowerup (player, powerup) {
    if (powerup.collect) {
      powerup.collect(player)
    }
  }

  /**
   * Callback when an ally overlaps a powerup.
   * Implements smart healing: if ally HP < max, heal self.
   * If ally HP = max, heal the character with lowest HP.
   * For energetica/botellita, apply directly to ally.
   * @param {Ally} ally
   * @param {Powerup} powerup
   */
  _onAllyCollectPowerup (ally, powerup) {
    if (!powerup || !powerup.active || !powerup.powerupType) return

    const type = powerup.powerupType

    if (type === 'manzana' || type === 'maruchan') {
      const healAmount = type === 'manzana' ? 2 : 5

      if (ally.hp < ally.maxHp) {
        // Heal self
        if (ally.heal) ally.heal(healAmount)
      } else {
        // Find character with lowest HP
        const target = this._findLowestHpCharacter(ally)
        if (target && target.heal) {
          target.heal(healAmount)
        }
      }

      EventBus.emit('powerup:collected', { type, collector: ally })
      powerup.destroy()
    } else if (type === 'energetica') {
      // Apply speed boost to ally via EffectSystem
      if (this.effectSystem) {
        this.effectSystem.applyEffect(ally, 'energetica', 6)
      }
      EventBus.emit('powerup:collected', { type, collector: ally })
      powerup.destroy()
    } else if (type === 'botellita') {
      // Increment global counter
      if (this.globalCounter) {
        this.globalCounter.molotovs += 1
        EventBus.emit('molotov:changed', { count: this.globalCounter.molotovs })
      }
      EventBus.emit('powerup:collected', { type, collector: ally })
      powerup.destroy()
    }
  }

  /**
   * Find the character (player or ally) with the lowest HP.
   * Excludes the collecting ally itself if at max HP.
   * @param {Ally} excludeAlly - The ally that collected the powerup
   * @returns {object|null}
   */
  _findLowestHpCharacter (excludeAlly) {
    let lowest = null
    let lowestHp = Infinity

    // Check player
    if (this.player && this.player.isAlive && this.player.hp < this.player.maxHp) {
      if (this.player.hp < lowestHp) {
        lowestHp = this.player.hp
        lowest = this.player
      }
    }

    // Check other allies
    if (this.allyGroup) {
      for (const ally of this.allyGroup.getChildren()) {
        if (ally === excludeAlly) continue
        if (!ally.active || ally.isDead) continue
        if (ally.hp < ally.maxHp && ally.hp < lowestHp) {
          lowestHp = ally.hp
          lowest = ally
        }
      }
    }

    return lowest
  }

  /**
   * Callback when an ally overlaps an enemy.
   * @param {Ally} ally
   * @param {Enemy} enemy
   */
  _onAllyHitEnemy (ally, enemy) {
    if (enemy.canAttack && enemy.canAttack()) {
      if (ally.takeDamage) {
        ally.takeDamage(enemy.damage || 1)
      }
    }
  }

  /**
   * Callback when the player overlaps an enemy.
   * @param {Player} player
   * @param {Enemy} enemy
   */
  _onPlayerHitEnemy (player, enemy) {
    if (enemy.canAttack && enemy.canAttack()) {
      player.takeDamage(enemy.damage || 1)
    }
  }

  /**
   * Set up exit zone overlaps from MapManager.
   */
  _setupExitZones () {
    const exitZones = this.mapManager.getExitZones(this.currentMapKey)
    if (!exitZones || exitZones.length === 0) return

    for (const ez of exitZones) {
      const zone = this.add.zone(
        ez.x + ez.width / 2,
        ez.y + ez.height / 2,
        ez.width,
        ez.height
      )
      this.physics.add.existing(zone, true)
      zone.targetMap = ez.targetMap

      this.physics.add.overlap(this.player, zone, () => {
        if (!this._isTransitioning) {
          this._transitionToMap(zone.targetMap)
        }
      })
    }
  }

  /**
   * Transition to a new map, preserving player state and allies.
   * @param {string} targetMapKey
   */
  _transitionToMap (targetMapKey) {
    if (this._isTransitioning) return
    this._isTransitioning = true

    // Emit map:transition event
    EventBus.emit('map:transition', { mapKey: targetMapKey })

    // Brief pause then load new map
    this.time.delayedCall(500, () => {
      // Clear enemies
      if (this.enemyGroup) {
        this.enemyGroup.clear(true, true)
      }

      // Clear powerups
      if (this.powerupGroup) {
        this.powerupGroup.clear(true, true)
      }

      // Clear projectiles
      if (this.projectileGroup) {
        this.projectileGroup.clear(true, true)
      }

      // Preserve effects via EffectSystem
      if (this.effectSystem) {
        this.effectSystem.clearEffectsOnMapTransition(this.player)
        if (this.allyGroup) {
          for (const ally of this.allyGroup.getChildren()) {
            if (ally.active && !ally.isDead) {
              this.effectSystem.clearEffectsOnMapTransition(ally)
            }
          }
        }
      }

      // Load new map
      this.mapManager.loadMap(targetMapKey, this)
      this.currentMapKey = targetMapKey

      // Reposition player at new map's entry point
      const entry = this.mapManager.getEntryPoint(targetMapKey)
      if (entry) {
        this.player.setPosition(entry.x, entry.y)
      }

      // Reconfigure physics and camera bounds
      const { width: mapWidth, height: mapHeight } = this.mapManager.getMapDimensions()
      this.physics.world.setBounds(0, 0, mapWidth, mapHeight)
      this.cameras.main.setBounds(0, 0, mapWidth, mapHeight)

      // Collision: player vs new obstacle layer
      const obstacleLayer = this.mapManager.getObstacleLayer()
      if (obstacleLayer) {
        this.physics.add.collider(this.player, obstacleLayer)
      }

      // Grant a new ally (Task 14.2)
      this._grantNewAlly()

      // Reposition allies around player
      if (this.allyGroup && entry) {
        const allies = this.allyGroup.getChildren().filter(a => a.active && !a.isDead)
        const total = allies.length
        for (let i = 0; i < total; i++) {
          const offset = this.formationSystem.getPosition(i, total)
          allies[i].setPosition(entry.x + offset.x, entry.y + offset.y)
        }
      }

      // Set up exit zones for the new map
      this._setupExitZones()

      // Add ally bonus to score
      if (this.scoreSystem && this.allyGroup) {
        const aliveAllies = this.allyGroup.getChildren().filter(a => a.active && !a.isDead).length
        this.scoreSystem.addAllyBonus(aliveAllies)
      }

      // Start final event if entering Plaza Italia
      if (targetMapKey === 'map_plaza_italia') {
        this.finalEventSystem.start(90)
        this._showMessage('Manifestación final')
      }

      this._isTransitioning = false
    })
  }

  /**
   * Grant a new ally on map completion (Task 14.2).
   * 20% chance AliadoPunk, 80% chance AliadoEstandar or AliadoRapido (50/50).
   */
  _grantNewAlly () {
    const entry = this.mapManager.getEntryPoint(this.currentMapKey)
    const x = entry ? entry.x : 192
    const y = entry ? entry.y : 1080

    const roll = Math.random()
    let ally

    if (roll < 0.2) {
      ally = new AliadoPunk(this, x + 40, y + 40)
    } else if (roll < 0.6) {
      ally = new AliadoEstandar(this, x + 40, y + 40)
    } else {
      ally = new AliadoRapido(this, x + 40, y + 40)
    }

    if (this.allyGroup) {
      this.allyGroup.add(ally)
    }

    // Show "Nuevo aliado" message
    this._showNewAllyMessage()

    // Emit event for HUD to update ally count
    EventBus.emit('ally:spawned', { type: ally.type })
  }

  /**
   * Show a "Nuevo aliado" text that fades after 2 seconds.
   */
  _showNewAllyMessage () {
    this._showMessage('Nuevo aliado')
  }

  /**
   * Show a temporary centered message on screen (EstiloSketch).
   * @param {string} text
   */
  _showMessage (text) {
    mostrarMensaje(this, text)
  }

  /**
   * Pause the game and launch PauseScene overlay.
   */
  _pauseGame () {
    if (!this.player || !this.player.isAlive) return
    this.physics.pause()
    this.scene.pause('GameScene')
    this.scene.launch('PauseScene')
  }

  /**
   * Handle gameover event — launch GameOverScene and stop final event.
   */
  _onGameOver () {
    if (this.finalEventSystem) {
      this.finalEventSystem.stop()
    }
    this.scene.launch('GameOverScene')
  }

  /**
   * Quicksave to the 'quicksave' slot.
   */
  _quicksave () {
    if (!this.saveSystem || !this.player) return

    const gameState = this.saveSystem.buildGameState(this)
    const success = this.saveSystem.save('quicksave', gameState)

    if (success) {
      this._showMessage('Partida guardada')
    } else {
      this._showMessage('No se pudo guardar')
    }
  }

  /**
   * Quickload from the 'quicksave' slot.
   */
  _quickload () {
    if (!this.saveSystem) return

    const state = this.saveSystem.load('quicksave')
    if (!state) {
      this._showMessage('No hay guardado rápido')
      return
    }

    this.saveSystem.restoreGameState(this, state)
  }

  /**
   * Zoom in the camera.
   */
  _zoomIn () {
    this._zoomLevel = Math.min(this._maxZoom, this._zoomLevel + this._zoomStep)
    this.cameras.main.setZoom(this._zoomLevel)
    EventBus.emit('zoom:changed', { zoom: this._zoomLevel })
  }

  /**
   * Zoom out the camera.
   */
  _zoomOut () {
    this._zoomLevel = Math.max(this._minZoom, this._zoomLevel - this._zoomStep)
    this.cameras.main.setZoom(this._zoomLevel)
    EventBus.emit('zoom:changed', { zoom: this._zoomLevel })
  }
}
