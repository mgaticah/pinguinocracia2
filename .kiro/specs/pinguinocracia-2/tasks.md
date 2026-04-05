# Plan de Implementación: Pingüinocracia 2

## Visión General

Implementación incremental de un juego top-down 2D para navegador con Phaser 3, Vite y JavaScript ESM. Cada tarea construye sobre la anterior, terminando con todos los sistemas integrados y funcionando.

## Tareas

- [x] 1. Configurar estructura del proyecto y scaffolding base
  - Inicializar proyecto Vite con soporte ESM
  - Configurar Phaser 3 como dependencia
  - Instalar y configurar Vitest y fast-check
  - Instalar EasyStar.js
  - Crear estructura de carpetas: `src/scenes`, `src/entities`, `src/systems`, `src/utils`, `public/assets`
  - Crear `src/main.js` con `Phaser.Game` configurado (1920×1080, Arcade Physics sin gravedad)
  - Registrar escenas vacías: BootScene, TitleScene, GameScene, HUDScene, PauseScene, GameOverScene, VictoryScene
  - Crear `src/EventBus.js` como singleton `Phaser.Events.EventEmitter`
  - _Requisitos: 1.1, 22.1_

- [x] 2. Implementar BootScene y TitleScene
  - [x] 2.1 Implementar BootScene con preload de assets placeholder
    - Cargar assets de prueba (imágenes placeholder PNG)
    - Transición automática a TitleScene al completar preload
    - Manejo de error: log + placeholder gráfico si asset no encontrado
    - _Requisitos: 22.1, 22.2_

  - [x] 2.2 Implementar TitleScene con fondo y MenuPrincipal
    - Renderizar fondo estilo cuaderno (líneas azules, margen rojo)
    - Mostrar LogoJuego (texto "PINGÜINOCRACIA 2" + subtítulo)
    - Crear botones: "Jugar", "Cargar partida", "Opciones", "Créditos"
    - "Jugar" → inicia GameScene; "Cargar partida" → muestra slots; otros → placeholder
    - _Requisitos: 22.2, 22.5, 22.6, 22.7, 22.11, 22.14, 22.15_

  - [ ]* 2.3 Test unitario: botones del MenuPrincipal navegan correctamente
    - Verificar que "Jugar" dispara transición a GameScene
    - _Requisitos: 22.14_

- [x] 3. Implementar Player y movimiento
  - [x] 3.1 Crear clase Player con movimiento WASD y física Arcade
    - HP=10, maxHp=10, speed=160, weapon='piedra'
    - Movimiento en 8 direcciones con normalización de velocidad diagonal
    - Colisión con obstáculos del tilemap
    - Animaciones: walk_up/down/left/right + idle por dirección
    - _Requisitos: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2_

  - [x] 3.2 Implementar `takeDamage(amount)` y `heal(amount)` en Player
    - HP nunca baja de 0 ni sube de maxHp
    - Emitir `player:damaged` y `player:healed` en EventBus
    - Si HP llega a 0, emitir `gameover`
    - _Requisitos: 3.2, 3.3, 3.4_

  - [ ]* 3.3 Test de propiedad: límites de HP del Player
    - **Propiedad 1: Límites de HP de cualquier personaje**
    - **Valida: Requisitos 3.2, 3.3**

  - [ ]* 3.4 Test de propiedad: Game Over cuando HP llega a 0
    - **Propiedad 2: Game Over cuando HP llega a 0**
    - **Valida: Requisito 3.4**

- [x] 4. Implementar sistema de armas del Player
  - [x] 4.1 Implementar Piedra y Molotov como proyectiles en GameScene
    - Piedra: daño=1, munición infinita, lanzar con clic izquierdo
    - Molotov: daño=5, consume ContadorGlobal, lanzar con clic izquierdo
    - Proyectiles en `projectileGroup`, destruir al impactar enemy u obstáculo
    - Tecla Q alterna arma; emitir `weapon:changed` en EventBus
    - Si Molotov y ContadorGlobal=0, no lanzar
    - _Requisitos: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_

  - [ ]* 4.2 Test de propiedad: alternancia de arma es round-trip
    - **Propiedad 4: Alternancia de arma es round-trip**
    - **Valida: Requisito 4.2**

  - [ ]* 4.3 Test de propiedad: Molotov requiere y consume ContadorGlobal
    - **Propiedad 5: Molotov requiere y consume ContadorGlobal**
    - **Valida: Requisitos 4.5, 4.6, 4.8**

  - [ ]* 4.4 Test de propiedad: daño de armas reduce HP del Enemy
    - **Propiedad 3: Daño de armas reduce HP del Enemy**
    - **Valida: Requisitos 4.4, 4.7**

- [x] 5. Implementar MapManager y carga de tilemaps
  - [x] 5.1 Crear MapManager con carga de tilemaps Tiled (JSON)
    - Capas: background, ground, obstacles, decorations, zones
    - Colisión en capa `obstacles` con `setCollisionByProperty({ collides: true })`
    - Exponer: `getSpawnPoints`, `getPowerupPoints`, `getExitZones`, `getEntryPoint`
    - Definir MapConfig para los 4 mapas: barros_arana, amunategui, lastarria, plaza_italia
    - _Requisitos: 10.1, 10.2, 10.3, 10.4, 10.13, 10.14, 10.17, 10.18, 10.19_

  - [x] 5.2 Configurar cámara con seguimiento del Player y límites del mapa
    - `camera.startFollow(player)` con bounds del tilemap
    - Cámara no excede límites del mapa
    - _Requisitos: 1.2, 1.3, 1.4, 10.10, 10.11, 10.12_

  - [ ]* 5.3 Test de propiedad: cámara no excede los límites del mapa
    - **Propiedad 7: Cámara no excede los límites del mapa**
    - **Valida: Requisitos 1.2, 1.4**

  - [ ]* 5.4 Test de propiedad: ningún personaje atraviesa obstáculos
    - **Propiedad 6: Ningún personaje atraviesa obstáculos**
    - **Valida: Requisitos 2.5, 5.14**

- [x] 6. Implementar enemigos base y pathfinding
  - [x] 6.1 Crear clase Enemy base con pathfinding EasyStar.js
    - `takeDamage(amount)`, `die()` con animación y emit `enemy:killed`
    - `findNearestTarget(targets)` entre Player y Aliados
    - Fallback a línea recta si no hay ruta disponible
    - Grid de pathfinding recalculado al cargar cada mapa
    - _Requisitos: 5.14, 5.15, 6b.1, 6b.2_

  - [x] 6.2 Implementar PolicíaEstándar y PolicíaMontado
    - PolicíaEstándar: 10 HP, velocidad base, daño=1, cooldown=1s
    - PolicíaMontado: 15 HP, velocidad×1.2, daño=2 + empuje al impactar
    - _Requisitos: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

  - [x] 6.3 Implementar CamiónLanzaAgua y CamiónLanzaGas
    - CamiónLanzaAgua: 30 HP, lento, ChorroDAgua en cono frontal (empuje + ralentiza)
    - CamiónLanzaGas: 25 HP, lento, ZonaDeGas circular (daño gradual + reduce visibilidad)
    - _Requisitos: 5.8, 5.9, 5.10, 5.11, 5.12, 5.13_

  - [ ]* 6.4 Test de propiedad: daño de armas reduce HP del Enemy (verificación Enemy)
    - **Propiedad 3: Daño de armas reduce HP del Enemy**
    - **Valida: Requisitos 14.5, 14.6**

- [x] 7. Implementar SpawnSystem y dificultad progresiva
  - [x] 7.1 Crear SpawnSystem con secuencia de intervalos y composiciones de squad
    - Primer spawn a los 60s; secuencia: [60000, 45000, 30000, 20000, 15000, 10000, 5000] ms
    - Tipos habilitados por tiempo: estándar siempre, montado ≥120s, agua ≥240s, gas ≥360s
    - Composiciones válidas de squad según diseño
    - Punto de spawn a distancia mínima del Player
    - _Requisitos: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 6.10, 6.11, 6.12, 6.13_

  - [ ]* 7.2 Test de propiedad: intervalo de spawn sigue la secuencia y respeta el mínimo
    - **Propiedad 8: Intervalo de spawn sigue la secuencia y respeta el mínimo**
    - **Valida: Requisitos 6.2, 6.3**

  - [ ]* 7.3 Test de propiedad: composición de squad solo incluye tipos habilitados por tiempo
    - **Propiedad 9: Composición de Squad solo incluye tipos habilitados por tiempo**
    - **Valida: Requisitos 6.4, 6.5, 6.6, 6.7, 6.8**

  - [ ]* 7.4 Test de propiedad: punto de spawn siempre a distancia mínima del Player
    - **Propiedad 10: Punto de spawn siempre a distancia mínima del Player**
    - **Valida: Requisitos 6.10, 7b.8**

- [x] 8. Implementar ScoreSystem y muerte de enemigos
  - [x] 8.1 Crear ScoreSystem con tabla de puntos y bonificaciones
    - Tabla: estandar=10, montado=20, agua=50, gas=40
    - `addKill(type)`, `addAllyBonus(count)`, `addTimeBonus(seconds)`, `addPowerupBonus()`
    - Emitir evento de score actualizado en EventBus
    - _Requisitos: 6b.3, 6b.4, 18.1, 24.20_

  - [ ]* 8.2 Test de propiedad: matar un Enemy incrementa el puntaje
    - **Propiedad 11: Matar un Enemy incrementa el puntaje**
    - **Valida: Requisitos 6b.3, 6b.4**

- [x] 9. Checkpoint — Asegurar que todos los tests pasen
  - Asegurar que todos los tests pasen, consultar al usuario si surgen dudas.

- [x] 10. Implementar PowerupSpawnSystem y powerups
  - [x] 10.1 Crear PowerupSpawnSystem con lógica de rareza y spawn
    - Pesos: manzana=alta, maruchan=baja, botellita=media, energetica=baja (alta en peligro)
    - Peligro: Player HP < 30% o ≥5 enemies activos
    - Spawn solo en celdas transitables, a distancia mínima del Player
    - _Requisitos: 7b.1, 7b.2, 7b.3, 7b.4, 7b.5, 7b.6, 7b.7, 7b.8_

  - [ ]* 10.2 Test de propiedad: powerup spawn solo en ubicaciones transitables
    - **Propiedad 21: Powerup spawn solo en ubicaciones transitables**
    - **Valida: Requisito 7b.7**

  - [x] 10.3 Implementar lógica de recolección de powerups (Player)
    - Manzana: +2 HP (sin superar máximo)
    - Maruchan: +5 HP (sin superar máximo)
    - Energética: velocidad×1.5 por 6s, no acumula (reinicia duración)
    - Botellita: ContadorGlobal +1
    - Powerup desaparece del mapa al ser recogido
    - Efectos visuales de recolección
    - _Requisitos: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10, 7.11, 7.12_

  - [ ]* 10.4 Test de propiedad: powerup desaparece del mapa al ser recogido
    - **Propiedad 12: Powerup desaparece del mapa al ser recogido**
    - **Valida: Requisitos 7.1, 15.1**

  - [ ]* 10.5 Test de propiedad: Energética no acumula velocidad (idempotencia)
    - **Propiedad 13: Energética no acumula velocidad**
    - **Valida: Requisitos 7.5, 15.7**

  - [ ]* 10.6 Test de propiedad: Botellita incrementa ContadorGlobal en exactamente 1
    - **Propiedad 14: Botellita incrementa ContadorGlobal en exactamente 1**
    - **Valida: Requisitos 7.7, 15.9**

- [x] 11. Implementar EffectSystem
  - [x] 11.1 Crear EffectSystem para gestionar efectos temporales
    - `applyEffect(entity, type, duration)` — reinicia si ya activo
    - `update(delta)` — decrementa timers, revierte efectos al expirar
    - `clearEffectsOnMapTransition(entity)` — mantiene efectos activos entre mapas
    - _Requisitos: 7.4, 7.5, 7.6, 7.12, 15.6, 15.7, 15.8_

- [x] 12. Implementar Aliados y FormationSystem
  - [x] 12.1 Crear clase Ally base con IA de seguimiento y ataque
    - Seguir al Player cuando no hay enemy en rango
    - Atacar al enemy más cercano en rango (Piedra o Molotov según ContadorGlobal)
    - `takeDamage(amount)`, `die()` con emit `ally:died`
    - _Requisitos: 14.1, 14.3, 14.4, 14.5, 14.6, 14.7_

  - [x] 12.2 Implementar subclases AliiadoEstándar, AliiadoRápido, AliadoPunk
    - Estándar: 10 HP, velocidad base
    - Rápido: 8 HP, velocidad×1.2
    - Punk: 12 HP, velocidad×0.9, mayor frecuencia de ataque, +3 molotovs al aparecer
    - _Requisitos: 13.6, 13.7, 13.8, 13.9, 14.8_

  - [x] 12.3 Crear FormationSystem con offsets relativos al Player
    - Posicionar aliados alrededor del Player sin superposición
    - _Requisitos: 14.2_

  - [x] 12.4 Implementar recolección de powerups por Aliados (curación inteligente)
    - Manzana/Maruchan: curar al aliado si HP < max; si HP = max, curar al personaje con menos HP
    - Energética: velocidad×1.5 por 6s en el aliado, no acumula
    - Botellita: ContadorGlobal +1
    - _Requisitos: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7, 15.8, 15.9_

  - [ ]* 12.5 Test de propiedad: límites de HP de Aliados
    - **Propiedad 1: Límites de HP de cualquier personaje (Aliados)**
    - **Valida: Requisitos 7.2, 7.3, 15.2, 15.4**

  - [ ]* 12.6 Test de propiedad: curación inteligente de Aliados
    - **Propiedad 19: Curación inteligente de Aliados va al personaje con menos HP**
    - **Valida: Requisitos 15.3, 15.5**

  - [ ]* 12.7 Test de propiedad: Aliado ataca cuando Enemy está en rango
    - **Propiedad 22: Aliado ataca cuando Enemy está en rango**
    - **Valida: Requisitos 14.3, 14.4**

- [x] 13. Implementar HUDScene
  - [x] 13.1 Crear HUDScene como overlay fija con todos los elementos
    - Barra de vida (esquina superior izquierda), iconos de aliados
    - Contador de Molotovs + icono de arma (esquina superior derecha)
    - Puntaje centrado en la parte superior
    - Nombre del mapa (aparece 2s al entrar a un mapa nuevo)
    - BarraDuracion de Energética (visible solo si efecto activo)
    - Temporizador del EventoFinal (solo en Plaza Italia)
    - Estilo EstiloSketch en todos los elementos
    - _Requisitos: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 8.10, 8.11, 8.12, 8.13, 8.14, 8.15, 8.16, 8.17, 8.18, 8.19_

  - [x] 13.2 Conectar HUDScene al EventBus
    - Suscribir a: `player:damaged`, `player:healed`, `enemy:killed`, `ally:died`, `molotov:changed`, `weapon:changed`, `map:transition`, `powerup:collected`, `energetica:tick`
    - _Requisitos: 8.6, 8.9, 8.11, 8.13, 8.17_

  - [ ]* 13.3 Test de propiedad: HUD refleja el estado del juego en tiempo real
    - **Propiedad 16: HUD refleja el estado del juego en tiempo real**
    - **Valida: Requisitos 8.6, 8.11, 8.17**

  - [ ]* 13.4 Test de propiedad: BarraDuracion visible si y solo si efecto activo
    - **Propiedad 17: BarraDuracion visible si y solo si efecto activo**
    - **Valida: Requisitos 8.14, 8.15**

- [x] 14. Implementar transición entre mapas y persistencia de estado
  - [x] 14.1 Implementar ZonaSalida y transición de mapa en GameScene
    - Overlap Player ↔ exitZones → pausa breve → carga nuevo mapa
    - Posicionar Player en PuntoDeEntrada del nuevo mapa
    - Limpiar enemies, powerups y proyectiles del mapa anterior
    - Mantener: HP, molotovs, efectos activos, puntaje, tiempo, nivel de dificultad, aliados
    - Emitir `map:transition` en EventBus
    - _Requisitos: 11.4, 11.5, 11.6, 11.7, 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 13.2, 13.3_

  - [x] 14.2 Otorgar un Aliado nuevo al completar un mapa
    - 20% probabilidad AliadoPunk, resto Estándar o Rápido según liceo
    - Mostrar MensajeEnPantalla "Nuevo aliado"
    - _Requisitos: 13.1, 13.2, 13.5, 9c.2_

  - [ ]* 14.3 Test de propiedad: transición de mapa preserva el estado del Player y Aliados
    - **Propiedad 15: Transición de mapa preserva el estado del Player y Aliados**
    - **Valida: Requisitos 12.1, 12.2, 12.3, 12.4, 12.5, 12.6**

- [x] 15. Implementar SaveSystem
  - [x] 15.1 Crear SaveSystem con serialización/deserialización de GameState
    - 4 slots: slot1, slot2, slot3, quicksave
    - `save(slotId, gameState)` → localStorage
    - `load(slotId)` → GameState | null; slot corrupto → marcado inválido
    - `listSlots()` → array con estado de cada slot (vacío/ocupado + fecha)
    - `buildGameState(scene)` y `restoreGameState(scene, state)`
    - _Requisitos: 23.1, 23.2, 23.3, 23.4, 23.5, 23.6, 23.7, 23.8, 23.9, 23.10, 23.11, 23.16, 23.17, 23.18_

  - [x] 15.2 Implementar teclas rápidas F5/F9 y mensajes de guardado
    - F5 → quicksave sin mostrar pantalla de slots
    - F9 → quickload; si vacío → MensajeEnPantalla "No hay guardado rápido"
    - Al guardar → MensajeEnPantalla "Partida guardada"
    - Manejo de localStorage lleno/bloqueado → MensajeEnPantalla "No se pudo guardar"
    - _Requisitos: 23.12, 23.13, 23.14, 23.15_

  - [ ]* 15.3 Test de propiedad: guardado y carga es round-trip
    - **Propiedad 20: Guardado y carga es round-trip**
    - **Valida: Requisitos 23.4–23.16**

  - [ ]* 15.4 Test unitario: slot vacío no carga nada
    - Verificar que `load` de slot vacío retorna null y no modifica el estado
    - _Requisitos: 23.17_

  - [ ]* 15.5 Test unitario: quickload sin guardado rápido muestra mensaje
    - _Requisitos: 23.15_

- [x] 16. Implementar PauseScene y GameOverScene
  - [x] 16.1 Implementar PauseScene como overlay al presionar ESC
    - Detener toda la lógica de juego (physics.pause, timers)
    - Botones: "Continuar", "Guardar partida", "Cargar partida", "Salir al menú principal"
    - "Continuar" → reanuda desde estado exacto pausado
    - _Requisitos: 9b.1, 9b.2, 9b.3, 9b.4, 9b.5, 9b.6_

  - [x] 16.2 Implementar GameOverScene
    - Mostrar "Game Over" con EstiloSketch
    - Botones: "Reintentar", "Cargar partida", "Menú principal"
    - Detener movimiento del Player y SpawnSystem
    - _Requisitos: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9_

  - [ ]* 16.3 Test de propiedad: pausa detiene toda la lógica de juego
    - **Propiedad 18: Pausa detiene toda la lógica de juego**
    - **Valida: Requisito 9b.1**

  - [ ]* 16.4 Test unitario: botones de GameOverScene navegan correctamente
    - Verificar que "Reintentar" reinicia la partida y "Menú principal" carga TitleScene
    - _Requisitos: 9.7, 9.9_

- [x] 17. Checkpoint — Asegurar que todos los tests pasen
  - Asegurar que todos los tests pasen, consultar al usuario si surgen dudas.

- [x] 18. Implementar EventoFinal y VictoryScene
  - [x] 18.1 Implementar FinalEventSystem para el mapa Plaza Italia
    - Al entrar a plaza_italia: mostrar "Manifestación final", iniciar contador (60–120s configurable)
    - Spawn constante de todos los tipos de enemy desde múltiples puntos
    - Squads de mayor tamaño que en mapas anteriores
    - Aliados atacan automáticamente sin alejarse del Player
    - _Requisitos: 24.1, 24.2, 24.3, 24.4, 24.5, 24.7, 24.8, 24.9, 24.10, 24.11_

  - [x] 18.2 Implementar VictoryScene con puntaje final
    - Mostrar "PINGÜINOCRACIA 2" + "Manifestación completada" con EstiloSketch
    - Calcular puntaje final: kills + aliados sobrevivientes + tiempo resistido + powerups
    - Botones: "Jugar nuevamente" y "Menú principal"
    - _Requisitos: 24.14, 24.15, 24.16, 24.17, 24.18, 24.20, 24.21_

- [x] 19. Integrar animaciones de personajes y assets visuales
  - [x] 19.1 Registrar y configurar animaciones de spritesheets en BootScene
    - Personajes (4×3, 48×48): player, policiaEstandar, policiaEspecial, aliadoEstandar, aliadoRapido, aliadoPunk
    - Vehículos (4×2, 96×96 o 128×128): camionAgua, camionGas
    - Powerups (2 frames): manzana, maruchan, energetica, botellita
    - Efectos: efecChorro (2–3 frames), efecGas (3 frames)
    - _Requisitos: 19.1, 19.2, 19.3, 19.4, 20.13, 20.14, 21.17, 21.18, 21.19, 21.20, 21.21, 21.22_

  - [x] 19.2 Aplicar animaciones correctas en Player, Enemies y Allies según dirección y estado
    - walk_up/down/left/right + idle por dirección en todos los personajes
    - Animación de muerte en enemies
    - _Requisitos: 2.3, 2.4, 6b.1_

- [x] 20. Integración final y cableado de sistemas
  - [x] 20.1 Cablear todos los sistemas en GameScene
    - Conectar SpawnSystem, PowerupSpawnSystem, EffectSystem, FormationSystem, ScoreSystem, SaveSystem, FinalEventSystem
    - Configurar todos los overlaps y colisiones de física Arcade
    - Verificar que EventBus propaga correctamente todos los eventos definidos
    - _Requisitos: todos los sistemas integrados_

  - [x] 20.2 Implementar MensajeEnPantalla como utilidad reutilizable
    - Texto temporal centrado en pantalla con EstiloSketch
    - Usado por: "Nivel completado", "Nuevo aliado", "Game Over", "Manifestación final", "Partida guardada", "No se pudo guardar", "No hay guardado rápido"
    - _Requisitos: 9c.1, 9c.2, 9c.3, 9c.4, 9c.5_

  - [x] 20.3 Verificar progresión completa: BootScene → TitleScene → GameScene → mapas → Plaza Italia → VictoryScene / GameOverScene
    - Recorrer el flujo completo con tests de integración automatizados
    - _Requisitos: flujo completo_

- [x] 21. Checkpoint final — Asegurar que todos los tests pasen
  - Asegurar que todos los tests pasen, consultar al usuario si surgen dudas.

## Notas

- Las tareas marcadas con `*` son opcionales y pueden omitirse para un MVP más rápido
- Cada tarea referencia requisitos específicos para trazabilidad
- Los tests de propiedades usan fast-check con mínimo 100 iteraciones (`{ numRuns: 100 }`)
- Cada test de propiedad incluye el comentario: `// Feature: pinguinocracia-2, Property N: <texto>`
- Los checkpoints aseguran validación incremental antes de continuar
