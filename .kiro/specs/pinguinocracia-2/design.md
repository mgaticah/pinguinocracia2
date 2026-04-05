# Diseño Técnico: Pingüinocracia 2

## Visión General

Pingüinocracia 2 es un juego de acción top-down 2D para navegador web construido con **Phaser 3** (JavaScript). El jugador controla a un estudiante que debe sobrevivir oleadas de policías enemigos, recoger powerups, gestionar aliados y avanzar por múltiples mapas hasta llegar a Plaza Italia.

El estilo visual **EstiloSketch** (lápiz pasta azul sobre hoja de cuaderno universitario) es transversal a todos los assets y la UI.

### Stack tecnológico

- **Motor**: Phaser 3.x (WebGL/Canvas)
- **Lenguaje**: JavaScript ES2020+ (módulos ESM)
- **Bundler**: Vite (dev server + build)
- **Persistencia**: `localStorage` del navegador
- **Assets**: PNG con fondo transparente, generados externamente
- **PBT**: fast-check (property-based testing)
- **Unit tests**: Vitest

---

## Arquitectura

El juego sigue la arquitectura de **Escenas de Phaser** con un bus de eventos global y sistemas desacoplados.

```
┌─────────────────────────────────────────────────────┐
│                    Phaser.Game                      │
│  config: { width:1920, height:1080, scene:[...] }   │
└──────────────────┬──────────────────────────────────┘
                   │ gestiona escenas
    ┌──────────────┼──────────────────────┐
    ▼              ▼                      ▼
BootScene     TitleScene           GameScene
(preload)   (menú principal)    (partida activa)
                                      │
              ┌───────────────────────┼──────────────────┐
              ▼                       ▼                   ▼
         HUDScene               PauseScene          GameOverScene
       (overlay fija)         (overlay pausa)      (overlay derrota)
```

### Flujo de escenas

```
Boot → Title → Game ──→ GameOver
                  ↑         │
                  └─────────┘ (reintentar)
                  │
                  └──→ Victory
```

### Bus de eventos global

`EventBus` es un `Phaser.Events.EventEmitter` singleton accesible desde cualquier escena o sistema. Desacopla los sistemas entre sí.

Eventos principales:

| Evento | Payload | Emisor | Receptor |
|---|---|---|---|
| `player:damaged` | `{ amount, hp }` | Player | HUD, GameScene |
| `player:healed` | `{ amount, hp }` | PowerupSystem | HUD |
| `enemy:killed` | `{ type, points }` | Enemy | ScoreSystem, HUD |
| `ally:died` | `{ ally }` | Ally | HUD, AllySystem |
| `molotov:changed` | `{ count }` | GlobalCounter | HUD |
| `weapon:changed` | `{ weapon }` | Player | HUD |
| `map:transition` | `{ mapKey }` | ZoneExit | GameScene |
| `gameover` | — | GameScene | GameOverScene |
| `victory` | `{ score }` | FinalEvent | VictoryScene |
| `powerup:collected` | `{ type, collector }` | PowerupSystem | HUD |
| `energetica:tick` | `{ remaining }` | EffectSystem | HUD |

---

## Componentes e Interfaces

### GameScene

Escena principal. Orquesta todos los sistemas y grupos de objetos.

```js
class GameScene extends Phaser.Scene {
  // Grupos de Phaser
  playerGroup       // Phaser.Physics.Arcade.Group
  enemyGroup        // Phaser.Physics.Arcade.Group
  allyGroup         // Phaser.Physics.Arcade.Group
  powerupGroup      // Phaser.Physics.Arcade.StaticGroup
  projectileGroup   // Phaser.Physics.Arcade.Group

  // Sistemas
  spawnSystem       // SpawnSystem
  powerupSpawnSystem // PowerupSpawnSystem
  scoreSystem       // ScoreSystem
  saveSystem        // SaveSystem
  effectSystem      // EffectSystem
  formationSystem   // FormationSystem
  finalEventSystem  // FinalEventSystem (solo en Plaza Italia)

  // Estado global
  globalCounter     // { molotovs: number }
  currentMapKey     // string
  totalTime         // number (segundos)
  difficultyLevel   // number
}
```

### Player

```js
class Player extends Phaser.Physics.Arcade.Sprite {
  hp            // number (0–10)
  maxHp         // 10
  speed         // number (base: 160)
  weapon        // 'piedra' | 'molotov'
  isAlive       // boolean

  move(cursors)
  shoot(targetX, targetY)
  takeDamage(amount)
  heal(amount)
  applySpeedBoost(multiplier, duration)
  switchWeapon()
}
```

### Enemy (clase base)

```js
class Enemy extends Phaser.Physics.Arcade.Sprite {
  hp            // number
  maxHp         // number
  speed         // number
  target        // Player | Ally (el más cercano)
  isDead        // boolean

  update(delta)       // lógica IA por frame
  takeDamage(amount)
  die()               // animación + emit enemy:killed
  findNearestTarget(targets)
}
```

Subclases: `PoliciaEstandar`, `PoliciaEspecial`, `CamionLanzaAgua`, `CamionLanzaGas`

### Ally (clase base)

```js
class Ally extends Phaser.Physics.Arcade.Sprite {
  hp            // number
  maxHp         // number
  speed         // number
  type          // 'estandar' | 'rapido' | 'punk'
  attackCooldown // number

  update(delta)
  followPlayer(player, formation)
  attackNearestEnemy(enemies)
  takeDamage(amount)
  die()
}
```

### SpawnSystem

```js
class SpawnSystem {
  intervalMs        // número actual de ms entre spawns
  difficultyLevel   // 0–6 (índice en la secuencia de intervalos)
  intervalSequence  // [60000, 45000, 30000, 20000, 15000, 10000, 5000]

  update(delta, totalTime, allyCount)
  spawnSquad(mapKey, playerPos)
  getSquadComposition(difficultyLevel, totalTime)
  selectSpawnPoint(mapKey, playerPos, minDistance)
  escalateDifficulty(mapKey, allyCount)
}
```

### PowerupSpawnSystem

```js
class PowerupSpawnSystem {
  update(delta, playerHp, enemyCount)
  spawnPowerup(mapKey, playerPos)
  selectType(playerHp, enemyCount)   // lógica de rareza
  selectSpawnPoint(mapKey, playerPos, minDistance)
}
```

### EffectSystem

Gestiona efectos temporales (Energética) sobre Player y Aliados.

```js
class EffectSystem {
  activeEffects   // Map<entity, { type, remaining }>

  applyEffect(entity, type, duration)
  update(delta)
  clearEffectsOnMapTransition(entity)  // mantiene efectos activos
}
```

### FormationSystem

```js
class FormationSystem {
  positions   // array de offsets relativos al Player

  getPosition(index, total)   // Vector2 offset
  update(allies, player)
}
```

### ScoreSystem

```js
class ScoreSystem {
  score         // number
  pointsTable   // { policiaEstandar:10, policiaEspecial:20, camionAgua:50, camionGas:40 }

  addKill(enemyType)
  addAllyBonus(allyCount)
  addTimeBonus(seconds)
  addPowerupBonus()
  getTotal()
}
```

### SaveSystem

```js
class SaveSystem {
  SLOTS         // ['slot1', 'slot2', 'slot3', 'quicksave']

  save(slotId, gameState)
  load(slotId)              // returns gameState | null
  listSlots()               // returns array de { slotId, date, empty }
  buildGameState(scene)     // serializa el estado actual
  restoreGameState(scene, state)
}
```

### HUDScene

Escena overlay (no destruida entre mapas). Se comunica exclusivamente vía `EventBus`.

```js
class HUDScene extends Phaser.Scene {
  // Elementos visuales
  hpBar           // Phaser.GameObjects.Graphics
  allyIcons       // Phaser.GameObjects.Group
  molotovCounter  // Phaser.GameObjects.Text
  weaponIcon      // Phaser.GameObjects.Image
  scoreText       // Phaser.GameObjects.Text
  mapNameText     // Phaser.GameObjects.Text
  energeticaBar   // Phaser.GameObjects.Graphics
  finalTimerText  // Phaser.GameObjects.Text (solo EventoFinal)
}
```

### MapManager

```js
class MapManager {
  maps            // Map<key, MapConfig>
  currentMap      // MapConfig

  loadMap(key, scene)
  getSpawnPoints(key)
  getPowerupPoints(key)
  getExitZones(key)
  getEntryPoint(key)
}
```

---

## Modelos de Datos

### GameState (guardado en localStorage)

```js
{
  version: "1.0",
  savedAt: "ISO8601 string",
  player: {
    hp: number,           // 1–10
    speed: number,        // velocidad base
    weapon: string,       // 'piedra' | 'molotov'
    x: number,
    y: number
  },
  allies: [
    {
      type: string,       // 'estandar' | 'rapido' | 'punk'
      hp: number,
      offsetX: number,    // posición relativa al Player
      offsetY: number
    }
  ],
  inventory: {
    molotovs: number
  },
  map: {
    key: string,          // identificador del mapa
    entryPoint: { x, y },
    unlockedExits: string[]
  },
  difficulty: {
    totalTime: number,    // segundos
    spawnLevel: number,   // 0–6
    activeEnemyTypes: string[]
  },
  activeEffects: {
    energetica: { active: boolean, remaining: number }
  },
  score: number
}
```

### MapConfig

```js
{
  key: string,
  name: string,
  tilemapKey: string,
  entryPoint: { x, y },
  spawnPoints: [{ x, y }],
  powerupPoints: [{ x, y }],
  exitZones: [
    { x, y, width, height, targetMap: string }
  ],
  difficultyModifier: number   // multiplicador sobre dificultad base
}
```

### SquadComposition

```js
{
  enemies: [
    { type: string, count: number }
  ],
  spawnPoint: { x, y }
}
```

### PowerupConfig

```js
{
  type: 'manzana' | 'maruchan' | 'energetica' | 'botellita',
  weight: number,    // peso de rareza (mayor = más frecuente)
  frames: [0, 1]     // índices de animación
}
```

---

## Diseño de Mapas

Cada mapa es un **Tilemap de Tiled** (JSON) cargado con `this.make.tilemap()`. Las capas son:

| Capa | Tipo | Descripción |
|---|---|---|
| `background` | Tile | Fondo cuaderno (líneas azules, margen rojo) |
| `ground` | Tile | Calles, veredas, plazas (transitables) |
| `obstacles` | Tile | Muros, edificios, árboles (colisión) |
| `decorations` | Tile | Nombres de calles, flechas, anotaciones |
| `zones` | Object | ZonaSalida, PuntoDeEntrada, SpawnPoints |

Las colisiones se configuran con `setCollisionByProperty({ collides: true })` en la capa `obstacles`.

### Mapas definidos

| Key | Nombre | Liceo referencia |
|---|---|---|
| `map_barros_arana` | Barros Arana | INBA |
| `map_amunategui` | Amunátegui | Liceo 1 |
| `map_lastarria` | Lastarria | Liceo de Aplicación |
| `map_plaza_italia` | Plaza Italia | (mapa final) |

---

## Animaciones

### Personajes (Spritesheet 4×3, 48×48 px/frame)

```js
// Registro en Phaser
this.anims.create({
  key: 'player_walk_down',
  frames: this.anims.generateFrameNumbers('player', { start: 3, end: 5 }),
  frameRate: 8,
  repeat: -1
})
```

Convención de filas: 0=arriba, 1=abajo, 2=izquierda, 3=derecha  
Convención de columnas: 0=idle, 1=walk1, 2=walk2

### Vehículos (Spritesheet 4×2, 96×96 o 128×128 px/frame)

Filas: 0=arriba, 1=abajo, 2=izquierda, 3=derecha  
Columnas: 0=idle, 1=movimiento

### Powerups (2 frames: base + brillo)

```js
this.anims.create({
  key: 'powerup_manzana',
  frames: this.anims.generateFrameNumbers('powerups', { frames: [0, 1] }),
  frameRate: 2,
  repeat: -1
})
```

---

## Física y Colisiones

Phaser Arcade Physics (sin gravedad).

```
Player ↔ obstacles (tilemap)   → stop
Enemy  ↔ obstacles (tilemap)   → stop (pathfinding rodea)
Ally   ↔ obstacles (tilemap)   → stop
Player ↔ powerupGroup          → overlap → collect
Player ↔ enemyGroup            → overlap → damage
Ally   ↔ enemyGroup            → overlap → damage
projectileGroup ↔ enemyGroup   → overlap → damage + destroy
projectileGroup ↔ obstacles    → overlap → destroy
Player ↔ exitZones             → overlap → map transition
```

### Pathfinding de enemigos

Se usa **EasyStar.js** (A* sobre la grilla del tilemap) para que los enemigos rodeen obstáculos. El grid se recalcula al cargar cada mapa. Los vehículos (camiones) usan pathfinding simplificado con steering behaviors.

---

## Sistema de Dificultad Progresiva

```
Tiempo (s) │ Intervalo spawn │ Tipos disponibles
───────────┼─────────────────┼──────────────────────────────────
0–60       │ (sin spawn)     │ —
60–        │ 60s             │ PolicíaEstándar
120–       │ 45s             │ + PolicíaMontado
240–       │ 30s             │ + CamiónLanzaAgua
360–       │ 20s             │ + CamiónLanzaGas
(progresivo)│ 15s → 10s → 5s │ todos
```

Composiciones de Squad válidas:

```js
const SQUAD_COMPOSITIONS = [
  [{ type: 'estandar', count: 4 }],
  [{ type: 'estandar', count: 3 }, { type: 'montado', count: 1 }],
  [{ type: 'estandar', count: 2 }, { type: 'montado', count: 1 }, { type: 'agua', count: 1 }],
  [{ type: 'agua', count: 1 }, { type: 'montado', count: 3 }],
]
```

---

## Persistencia (SaveSystem)

```js
// Guardar
localStorage.setItem(`pinguinocracia2_${slotId}`, JSON.stringify(gameState))

// Cargar
const raw = localStorage.getItem(`pinguinocracia2_${slotId}`)
return raw ? JSON.parse(raw) : null
```

Slots: `slot1`, `slot2`, `slot3`, `quicksave`

Teclas rápidas: F5 → quicksave, F9 → quickload

---

## Manejo de Errores

| Situación | Comportamiento |
|---|---|
| Asset no encontrado en preload | Log de error + placeholder gráfico |
| localStorage lleno o bloqueado | MensajeEnPantalla "No se pudo guardar" |
| Slot de carga vacío | No acción, pantalla de slots permanece visible |
| Quickload sin guardado rápido | MensajeEnPantalla "No hay guardado rápido" |
| Pathfinding sin ruta disponible | Enemy se mueve en línea recta como fallback |
| Spawn sin punto válido disponible | Spawn omitido en ese ciclo, reintento en el siguiente |
| GameState corrupto al cargar | Slot marcado como inválido, no se carga |

---

## Estrategia de Testing

### Enfoque dual

Se usan **Vitest** para tests unitarios y de ejemplo, y **fast-check** para tests de propiedades. Ambos son complementarios: los unitarios verifican casos concretos y los de propiedades verifican invariantes generales.

### Tests unitarios (Vitest)

Cubren:
- Lógica de daño y curación del Player/Ally (casos concretos)
- Serialización/deserialización del GameState
- Selección de composición de Squad según tiempo
- Lógica de rareza del PowerupSpawnSystem
- Transiciones de escena y carga de slots

### Tests de propiedades (fast-check)

Configuración mínima: **100 iteraciones** por propiedad.

Cada test lleva un comentario de trazabilidad:

```js
// Feature: pinguinocracia-2, Property N: <texto de la propiedad>
```

Cada propiedad correcta del diseño se implementa con **un único test de propiedad**.


---

## Propiedades de Corrección

*Una propiedad es una característica o comportamiento que debe mantenerse verdadero en todas las ejecuciones válidas del sistema: una declaración formal sobre lo que el sistema debe hacer. Las propiedades sirven como puente entre las especificaciones legibles por humanos y las garantías de corrección verificables por máquina.*

---

### Propiedad 1: Límites de HP de cualquier personaje

*Para cualquier* personaje (Player o Aliado) con HP máximo definido, después de aplicar cualquier cantidad de daño o curación, sus HP deben permanecer en el rango `[0, maxHp]`.

**Valida: Requisitos 3.2, 3.3, 7.2, 7.3, 15.2, 15.4**

---

### Propiedad 2: Game Over cuando HP llega a 0

*Para cualquier* estado de partida donde los HP del Player llegan a 0, el estado del juego debe transicionar a `gameover`.

**Valida: Requisito 3.4**

---

### Propiedad 3: Daño de armas reduce HP del Enemy

*Para cualquier* Enemy con HP inicial `h` y cualquier arma (Piedra: daño=1, Molotov: daño=5), después de un impacto el Enemy debe tener exactamente `max(0, h - damage)` HP.

**Valida: Requisitos 4.4, 4.7, 14.5, 14.6**

---

### Propiedad 4: Alternancia de arma es round-trip

*Para cualquier* arma equipada por el Player, presionar Q dos veces debe devolver exactamente el arma original.

**Valida: Requisito 4.2**

---

### Propiedad 5: Molotov requiere y consume ContadorGlobal

*Para cualquier* ContadorGlobal con valor `n`, lanzar una Molotov solo es posible si `n >= 1`, y tras el lanzamiento el ContadorGlobal debe ser exactamente `n - 1`.

**Valida: Requisitos 4.5, 4.6, 4.8**

---

### Propiedad 6: Ningún personaje atraviesa obstáculos

*Para cualquier* personaje (Player, Enemy, Aliado) y cualquier obstáculo del mapa, la posición del personaje nunca debe intersectar el área del obstáculo.

**Valida: Requisitos 2.5, 5.14**

---

### Propiedad 7: Cámara no excede los límites del mapa

*Para cualquier* posición del Player, el viewport de la cámara debe estar completamente contenido dentro de los límites del mapa (nunca mostrar área fuera del mapa).

**Valida: Requisitos 1.2, 1.4**

---

### Propiedad 8: Intervalo de spawn sigue la secuencia y respeta el mínimo

*Para cualquier* nivel de dificultad `d` en `[0..6]`, el intervalo de spawn debe ser exactamente `[60000, 45000, 30000, 20000, 15000, 10000, 5000][d]` ms, y nunca debe ser menor a 5000 ms.

**Valida: Requisitos 6.2, 6.3**

---

### Propiedad 9: Composición de Squad solo incluye tipos habilitados por tiempo

*Para cualquier* Squad generado en tiempo `t`, todos los tipos de Enemy en el Squad deben estar habilitados para ese tiempo (PolicíaEstándar siempre, PolicíaMontado desde t≥120s, CamiónLanzaAgua desde t≥240s, CamiónLanzaGas desde t≥360s).

**Valida: Requisitos 6.4, 6.5, 6.6, 6.7, 6.8**

---

### Propiedad 10: Punto de spawn siempre a distancia mínima del Player

*Para cualquier* punto de spawn seleccionado (de Enemy o Powerup), la distancia al Player debe ser mayor o igual a la distancia mínima configurada.

**Valida: Requisitos 6.10, 7b.8**

---

### Propiedad 11: Matar un Enemy incrementa el puntaje

*Para cualquier* Enemy eliminado de tipo `t`, el puntaje total debe incrementarse en exactamente `pointsTable[t]` puntos.

**Valida: Requisitos 6b.3, 6b.4**

---

### Propiedad 12: Powerup desaparece del mapa al ser recogido

*Para cualquier* Powerup presente en el mapa, después de que el Player o un Aliado colisione con él, el Powerup no debe estar presente en el mapa.

**Valida: Requisitos 7.1, 15.1**

---

### Propiedad 13: Energética no acumula velocidad (idempotencia)

*Para cualquier* personaje con efecto de Energética activo, recoger otra Energética debe reiniciar la duración a 6 segundos sin modificar el multiplicador de velocidad (siempre 1.5×, nunca 2.25×).

**Valida: Requisitos 7.5, 15.7**

---

### Propiedad 14: Botellita incrementa ContadorGlobal en exactamente 1

*Para cualquier* ContadorGlobal con valor `n`, recoger una Botellita (por Player o Aliado) debe resultar en un ContadorGlobal de exactamente `n + 1`.

**Valida: Requisitos 7.7, 15.9**

---

### Propiedad 15: Transición de mapa preserva el estado del Player y Aliados

*Para cualquier* transición entre mapas, los HP del Player, la cantidad de Molotovs, el puntaje acumulado, el tiempo total, el nivel de dificultad y los efectos activos con su tiempo restante deben ser idénticos antes y después de la transición.

**Valida: Requisitos 12.1, 12.2, 12.3, 12.4, 12.5, 12.6**

---

### Propiedad 16: HUD refleja el estado del juego en tiempo real

*Para cualquier* cambio en HP del Player, ContadorGlobal o puntaje, el valor mostrado en el HUD debe ser igual al valor interno del sistema inmediatamente después del cambio.

**Valida: Requisitos 8.6, 8.11, 8.17**

---

### Propiedad 17: BarraDuracion visible si y solo si efecto activo

*Para cualquier* estado del efecto de Energética, la BarraDuracion en el HUD debe estar visible si y solo si el efecto está activo, y su proporción debe ser `remaining / 6.0`.

**Valida: Requisitos 8.14, 8.15**

---

### Propiedad 18: Pausa detiene toda la lógica de juego

*Para cualquier* estado de partida, cuando el PausaMenu está activo, ningún valor de estado del juego (HP, posiciones, temporizadores, ContadorGlobal) debe cambiar mientras la pausa permanece activa.

**Valida: Requisito 9b.1**

---

### Propiedad 19: Curación inteligente de Aliados va al personaje con menos HP

*Para cualquier* Aliado con HP al máximo que recoge una Manzana o Maruchan, la curación debe aplicarse al personaje (Player u otro Aliado) con el menor HP actual, sin superar su máximo.

**Valida: Requisitos 15.3, 15.5**

---

### Propiedad 20: Guardado y carga es round-trip

*Para cualquier* estado de partida serializado y guardado en un slot, cargarlo debe producir un estado idéntico al guardado (mismos HP, Molotovs, posición, aliados, puntaje, tiempo, efectos activos).

**Valida: Requisitos 23.4–23.16**

---

### Propiedad 21: Powerup spawn solo en ubicaciones transitables

*Para cualquier* Powerup generado por el PowerupSpawnSystem, su posición debe estar en una celda transitable del mapa (calle, vereda o plaza), nunca en un obstáculo.

**Valida: Requisito 7b.7**

---

### Propiedad 22: Aliado ataca cuando Enemy está en rango

*Para cualquier* Aliado y cualquier Enemy dentro del rango de detección del Aliado, el Aliado debe atacar al Enemy (no seguir al Player) mientras el Enemy permanezca en rango.

**Valida: Requisitos 14.3, 14.4**

---

## Manejo de Errores

| Situación | Comportamiento |
|---|---|
| Asset no encontrado en preload | Log de error + placeholder gráfico |
| localStorage lleno o bloqueado | MensajeEnPantalla "No se pudo guardar" |
| Slot de carga vacío | No acción, pantalla de slots permanece visible |
| Quickload sin guardado rápido | MensajeEnPantalla "No hay guardado rápido" |
| Pathfinding sin ruta disponible | Enemy se mueve en línea recta como fallback |
| Spawn sin punto válido disponible | Spawn omitido en ese ciclo, reintento en el siguiente |
| GameState corrupto al cargar | Slot marcado como inválido, no se carga |

---

## Estrategia de Testing

### Enfoque dual

Se usan **Vitest** para tests unitarios y de ejemplo, y **fast-check** para tests de propiedades. Ambos son complementarios: los unitarios verifican casos concretos y los de propiedades verifican invariantes generales con entradas aleatorias.

### Tests unitarios (Vitest)

Cubren casos concretos y de integración:
- Estado inicial del Player (HP=10, arma=Piedra, Molotovs=0)
- Primer spawn a los 60 segundos exactos
- Botones de GameOverScreen y PausaMenu navegan correctamente
- MensajeEnPantalla aparece en los eventos definidos
- Slot vacío no carga nada
- Quickload sin guardado rápido muestra mensaje

### Tests de propiedades (fast-check)

Configuración: **mínimo 100 iteraciones** por propiedad.

Cada test lleva un comentario de trazabilidad:

```js
// Feature: pinguinocracia-2, Property N: <texto de la propiedad>
fc.assert(fc.property(...), { numRuns: 100 })
```

Cada propiedad de corrección del diseño se implementa con **un único test de propiedad**.

Generadores necesarios:
- `fc.integer({ min: 0, max: 10 })` → HP de personaje
- `fc.integer({ min: 0, max: 100 })` → ContadorGlobal
- `fc.integer({ min: 0, max: 600 })` → tiempo de partida en segundos
- `fc.oneof(fc.constant('piedra'), fc.constant('molotov'))` → arma
- `fc.record({ hp, molotovs, score, ... })` → GameState parcial
- `fc.float({ min: 0, max: 1 })` → posición normalizada en el mapa
