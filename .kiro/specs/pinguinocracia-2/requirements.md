# Documento de Requisitos

## Introducción

Pingüinocracia 2 es un juego de acción 2D con vista cenital (top-down) para navegador web, desarrollado con HTML5, JavaScript y Phaser. El jugador controla a un estudiante con uniforme escolar azul que debe sobrevivir oleadas progresivas de policías enemigos. El jugador puede recoger powerups, cambiar entre armas y resistir el mayor tiempo posible antes de ser derrotado.

## Glosario

- **Game**: El sistema principal del juego que gestiona el ciclo de vida, escenas y estado global.
- **Player**: El personaje controlado por el usuario, representado como un estudiante con uniforme azul.
- **Enemy**: Unidad enemiga controlada por la IA que persigue y ataca al Player y a los Aliados. Puede ser PolicíaEstándar, PolicíaMontado, CamiónLanzaAgua o CamiónLanzaGas.
- **PolicíaEstándar**: Tipo de Enemy con 10 HP, velocidad base, ataque cuerpo a cuerpo de 1 punto de daño y cooldown de 1 segundo.
- **PolicíaMontado**: Tipo de Enemy con 15 HP, velocidad un 20% mayor a la base, que embiste al objetivo infligiendo 2 puntos de daño y empujándolo al impactar.
- **CamiónLanzaAgua**: Tipo de Enemy con 30 HP, movimiento lento, que dispara un chorro continuo en cono frontal a distancia, empuja y ralentiza a los afectados.
- **CamiónLanzaGas**: Tipo de Enemy con 25 HP, movimiento lento, que dispara nubes de gas creando una ZonaDeGas circular en el suelo.
- **ZonaDeGas**: Área circular persistente en el Map generada por el CamiónLanzaGas que causa daño gradual y reduce la visibilidad del Player mientras permanece en ella.
- **ChorroDAgua**: Proyectil continuo en cono frontal disparado por el CamiónLanzaAgua que empuja y ralentiza a los objetivos impactados.
- **Squad**: Grupo de enemigos que aparecen juntos en el mapa. La composición varía según el tiempo de partida.
- **Weapon**: Arma equipada por el Player para atacar enemigos. Puede ser Piedra o Molotov.
- **Piedra**: Arma de munición infinita que inflige 1 punto de daño.
- **Molotov**: Arma de munición limitada que inflige 5 puntos de daño. Consume Botellitas.
- **Botellita**: Powerup de frecuencia media que agrega 1 Molotov al ContadorGlobal al ser recogido. También es el recurso consumible que permite usar Molotovs.
- **Powerup**: Objeto recogible en el mapa que se activa automáticamente al ser recogido por el Player o un Aliado, y desaparece del Map al ser recogido.
- **Manzana**: Powerup de curación común que restaura 2 puntos de vida a quien lo recoge.
- **Maruchan**: Powerup de curación rara que restaura 5 puntos de vida a quien lo recoge.
- **Energética**: Powerup raro que incrementa la velocidad de movimiento de quien lo recoge en un 50% durante 6 segundos. No se acumula; recoger otra mientras está activa reinicia la duración.
- **PowerupSpawnSystem**: Sistema responsable de generar Powerups en el Map de forma aleatoria según reglas de rareza y ubicación.
- **SpawnSystem**: Sistema responsable de generar Squads de enemigos en intervalos progresivos.
- **HUD**: Interfaz de usuario superpuesta que muestra información de estado del Player durante la partida, con estilo visual dibujado a mano con lápiz pasta azul sobre fondo de hoja de cuaderno universitario.
- **GameOverScreen**: Pantalla completa que se muestra cuando el Player pierde todos sus puntos de vida.
- **PausaMenu**: Menú superpuesto que se activa al presionar ESC, detiene el juego y ofrece opciones de gestión de partida.
- **MensajeEnPantalla**: Texto temporal centrado en pantalla que informa al jugador de eventos relevantes durante la partida.
- **BarraDuracion**: Barra visual que representa el tiempo restante de un efecto activo y se vacía progresivamente hasta desaparecer al agotarse.
- **Camera**: Componente que sigue al Player y renderiza la porción visible del mapa.
- **Map**: Escenario del juego, de dimensiones mayores a la pantalla, con obstáculos transitables.
- **ZonaDeSalida**: Área del Map que, al ser pisada por el Player, inicia la transición al siguiente Map conectado.
- **PuntoDeEntrada**: Coordenada del Map donde el Player y los aliados aparecen al llegar desde otro Map.
- **Aliado**: Personaje autónomo controlado por la IA que acompaña y apoya al Player durante la partida.
- **AliiadoEstándar**: Tipo de Aliado con 10 HP, velocidad normal y capacidad de usar Piedras y Molotovs.
- **AliiadoRápido**: Tipo de Aliado con 8 HP, velocidad 20% mayor a la base y daño normal. Asociado a colegios de niñas.
- **AliadoPunk**: Tipo de Aliado con 12 HP, velocidad 10% menor a la base, comportamiento más agresivo y que agrega 3 Molotovs al contador global al aparecer. Tiene 20% de probabilidad de aparecer.
- **ContadorGlobal**: Reserva compartida de Molotovs accesible tanto por el Player como por los Aliados.
- **FormacionAliados**: Disposición espacial de los Aliados alrededor del Player para evitar superposición.
- **EstiloSketch**: Estética visual del juego basada en trazos irregulares dibujados a mano con lápiz pasta azul sobre fondo de hoja de cuaderno universitario con líneas horizontales azules y margen rojo opcional.
- **ElementoMapa**: Cualquier componente visual o funcional del Map, incluyendo calles, veredas, esquinas, cruces, plazas pequeñas, patios escolares, muros, rejas y obstáculos varios.
- **PuntoSpawnEnemigo**: Coordenada en el borde del Map donde el SpawnSystem puede generar Squads de enemigos.
- **PuntoSpawnPowerup**: Coordenada transitable del Map donde el PowerupSpawnSystem puede generar Powerups.
- **ZonaSalida**: Área marcada en el borde del Map que, al ser pisada por el Player, inicia la transición al Map conectado. Sinónimo de ZonaDeSalida.
- **Spritesheet**: Archivo PNG con fondo transparente que contiene todos los frames de animación de un personaje organizados en una grilla uniforme de 4 columnas (direcciones) × 3 filas (frames por dirección).
- **FramePersonaje**: Unidad mínima de animación de un personaje, de 48×48 píxeles, que representa una pose específica en una dirección determinada dentro de un Spritesheet.
- **AnimacionCaminar**: Secuencia de 3 FramePersonaje (idle, walk1, walk2) reproducidos en ciclo para representar el desplazamiento de un personaje en una de las 4 direcciones cardinales.
- **SpriteObjeto**: Archivo PNG individual con fondo transparente que representa un objeto del juego (arma o powerup) en vista cenital, con dimensiones de 32×32 o 48×48 píxeles, centrado en el canvas y compatible con Phaser.
- **SpriteArma**: SpriteObjeto que representa un arma lanzable por el Player o los Aliados (Piedra, Molotov), con EstiloSketch consistente con el resto del juego.
- **SpritePowerup**: SpriteObjeto que representa un Powerup recogible en el Map (Botellita, Manzana, Maruchan, Energética), visualmente distinguible de las armas mediante un EfectoRecogible.
- **EfectoRecogible**: Indicador visual aplicado a los SpritePowerup para señalar que son recogibles, compuesto por un leve brillo y un contorno/outline adicional sobre el sprite base.
- **SpriteVehiculo**: Archivo PNG con fondo transparente que contiene todos los frames de animación de un vehículo enemigo (CamiónLanzaAgua o CamiónLanzaGas) organizados en una grilla de 4 columnas (direcciones) × 2 filas (frames por dirección), con dimensiones de 96×96 o 128×128 píxeles por frame, compatible con Phaser.
- **EfectoChorro**: Sprite animado independiente que representa el chorro de agua disparado por el CamiónLanzaAgua, con forma de cono frontal y 2-3 frames de animación, en EstiloSketch.
- **EfectoGas**: Sprite animado independiente que representa la nube de gas disparada por el CamiónLanzaGas, con forma circular y animación de expansión en 3 frames, en EstiloSketch.
- **FrameVehiculo**: Unidad mínima de animación de un vehículo enemigo, de 96×96 o 128×128 píxeles, que representa una pose específica en una dirección determinada dentro de un SpriteVehiculo.
- **PantallaTitulo**: Escena inicial del juego que muestra el LogoJuego, el fondo estilo cuaderno universitario y el MenuPrincipal antes de que el jugador inicie una partida.
- **MenuPrincipal**: Conjunto de botones interactivos presentados en la PantallaTitulo que permiten al jugador iniciar una partida nueva, cargar una partida guardada, acceder a opciones o ver los créditos.
- **LogoJuego**: Elemento visual de la PantallaTitulo compuesto por el texto "PINGÜINOCRACIA 2" en tipografía escrita a mano, un pingüino dibujado estilo caricatura integrado al texto y el subtítulo "escape por santiago centro", exportado como asset separado compatible con Phaser.
- **MusicaTitulo**: Pista de audio en loop corto con estilo punk californiano (guitarra simple y batería rápida) que se reproduce a volumen bajo durante la PantallaTitulo.
- **SlotGuardado**: Espacio de almacenamiento en localStorage del navegador que contiene el estado completo de una partida guardada. El juego dispone de 4 slots: Slot 1, Slot 2, Slot 3 y Guardado rápido.
- **EventoFinal**: Fase de resistencia cronometrada que se activa al entrar al Map "Plaza Italia", con spawn constante de todos los tipos de Enemy y duración configurable de entre 60 y 120 segundos.
- **PantallaVictoria**: Pantalla completa que se muestra cuando el Player sobrevive el EventoFinal, con el puntaje final calculado y opciones para jugar nuevamente o volver al menú principal.

---

## Requisitos

### Requisito 1: Renderizado y Cámara

**User Story:** Como jugador, quiero una vista cenital con cámara que me siga, para poder explorar un mapa más grande que la pantalla.

#### Criterios de Aceptación

1. THE Game SHALL renderizar el mundo con vista top-down (cenital).
2. THE Camera SHALL seguir la posición del Player en todo momento durante la partida.
3. THE Map SHALL tener dimensiones mayores a las dimensiones de la pantalla visible.
4. WHEN el Player se acerca al borde del Map, THE Camera SHALL dejar de desplazarse más allá de los límites del Map.

---

### Requisito 2: Movimiento del Jugador

**User Story:** Como jugador, quiero moverme en 8 direcciones con las teclas WASD y ver animaciones de caminar, para tener una experiencia de movimiento fluida.

#### Criterios de Aceptación

1. WHEN el jugador presiona las teclas W, A, S o D, THE Player SHALL moverse en la dirección correspondiente a una velocidad base definida.
2. WHEN el jugador presiona dos teclas de dirección simultáneamente, THE Player SHALL moverse en diagonal (8 direcciones).
3. WHEN el Player está en movimiento, THE Player SHALL reproducir la animación de caminar.
4. WHEN el jugador suelta todas las teclas de dirección, THE Player SHALL detenerse y mostrar la animación de reposo.
5. WHEN el Player colisiona con un obstáculo del Map, THE Player SHALL detenerse sin atravesarlo.

---

### Requisito 3: Sistema de Vida del Jugador

**User Story:** Como jugador, quiero tener 10 puntos de vida y recibir daño de los enemigos, para que el juego tenga una condición de derrota.

#### Criterios de Aceptación

1. THE Player SHALL iniciar cada partida con 10 puntos de vida.
2. THE Player SHALL tener un máximo de 10 puntos de vida en todo momento.
3. WHEN el Player recibe daño, THE Player SHALL reducir sus puntos de vida en la cantidad correspondiente al daño recibido.
4. IF los puntos de vida del Player llegan a 0, THEN THE Game SHALL activar la condición de Game Over.

---

### Requisito 4: Sistema de Armas

**User Story:** Como jugador, quiero cambiar entre Piedra y Molotov con la tecla Q y disparar con clic, para tener opciones de combate variadas.

#### Criterios de Aceptación

1. THE Player SHALL iniciar cada partida con la Piedra equipada y munición de Molotov en 0.
2. WHEN el jugador presiona la tecla Q, THE Player SHALL alternar el arma equipada entre Piedra y Molotov.
3. WHILE la Piedra está equipada, THE Player SHALL poder lanzar Piedras con munición ilimitada al hacer clic.
4. WHEN una Piedra impacta a un Enemy, THE Enemy SHALL recibir 1 punto de daño.
5. WHILE la Molotov está equipada y el Player tiene al menos 1 Botellita, THE Player SHALL poder lanzar una Molotov al hacer clic.
6. WHEN una Molotov es lanzada, THE Player SHALL consumir 1 Botellita de su inventario.
7. WHEN una Molotov impacta a un Enemy, THE Enemy SHALL recibir 5 puntos de daño.
8. IF el jugador intenta lanzar una Molotov y el Player tiene 0 Botellitas, THEN THE Game SHALL no lanzar el proyectil y mantener el arma equipada sin cambios.
9. THE HUD SHALL mostrar el arma actualmente equipada por el Player.

---

### Requisito 5: Tipos de Enemigos

**User Story:** Como jugador, quiero enfrentarme a distintos tipos de enemigos con comportamientos y atributos únicos, para que el juego represente un desafío variado y progresivo.

#### Criterios de Aceptación

1. THE PolicíaEstándar SHALL iniciar con 10 puntos de vida y moverse a velocidad base.
2. WHILE el PolicíaEstándar está activo en el Map, THE PolicíaEstándar SHALL moverse en dirección al objetivo más cercano entre el Player y los Aliados activos.
3. WHEN el PolicíaEstándar está en rango de cuerpo a cuerpo del objetivo, THE PolicíaEstándar SHALL infligir 1 punto de daño al objetivo.
4. WHEN el PolicíaEstándar inflige daño, THE PolicíaEstándar SHALL iniciar un cooldown de 1 segundo antes de poder volver a atacar.
5. THE PolicíaMontado SHALL iniciar con 15 puntos de vida y moverse a una velocidad un 20% mayor a la velocidad base.
6. WHILE el PolicíaMontado está activo en el Map, THE PolicíaMontado SHALL moverse en dirección al objetivo más cercano entre el Player y los Aliados activos.
7. WHEN el PolicíaMontado impacta al objetivo, THE PolicíaMontado SHALL infligir 2 puntos de daño y empujar al objetivo en la dirección del impacto.
8. THE CamiónLanzaAgua SHALL iniciar con 30 puntos de vida y moverse a velocidad lenta.
9. WHILE el CamiónLanzaAgua está activo en el Map, THE CamiónLanzaAgua SHALL disparar un ChorroDAgua continuo en cono frontal hacia el objetivo más cercano.
10. WHEN el ChorroDAgua impacta al Player o a un Aliado, THE CamiónLanzaAgua SHALL empujar al objetivo en la dirección del chorro y reducir su velocidad de movimiento durante el tiempo de contacto.
11. THE CamiónLanzaGas SHALL iniciar con 25 puntos de vida y moverse a velocidad lenta.
12. WHILE el CamiónLanzaGas está activo en el Map, THE CamiónLanzaGas SHALL disparar nubes de gas que crean una ZonaDeGas circular en el suelo.
13. WHILE el Player permanece dentro de una ZonaDeGas, THE ZonaDeGas SHALL infligir daño gradual al Player y reducir su visibilidad.
14. WHILE cualquier Enemy está activo en el Map, THE Enemy SHALL evitar obstáculos del Map durante su desplazamiento.
15. WHILE múltiples Enemies están activos en el Map, THE Enemy SHALL evitar superponerse con otros Enemies durante su desplazamiento.

---

### Requisito 6: Sistema de Spawn y Dificultad Progresiva

**User Story:** Como jugador, quiero que los enemigos aparezcan en oleadas progresivamente más frecuentes y con mayor variedad, para que la dificultad aumente con el tiempo de forma clara y predecible.

#### Criterios de Aceptación

1. THE SpawnSystem SHALL generar el primer Squad 60 segundos después del inicio de la partida.
2. THE SpawnSystem SHALL reducir el intervalo de spawn de forma progresiva siguiendo la secuencia: 60s → 45s → 30s → 20s → 15s → 10s → 5s.
3. THE SpawnSystem SHALL mantener el intervalo mínimo de spawn en 5 segundos sin reducirlo más.
4. WHILE el tiempo de partida es menor a 2 minutos, THE SpawnSystem SHALL generar Squads compuestos únicamente por PolicíasEstándar.
5. WHEN el tiempo de partida alcanza los 2 minutos, THE SpawnSystem SHALL incluir PolicíasMontados en la composición de los Squads generados.
6. WHEN el tiempo de partida alcanza los 4 minutos, THE SpawnSystem SHALL incluir CamionesDeLanzaAgua en la composición de los Squads generados.
7. WHEN el tiempo de partida alcanza los 6 minutos, THE SpawnSystem SHALL incluir CamionesDeLanzaGas en la composición de los Squads generados.
8. THE SpawnSystem SHALL generar Squads con composiciones mixtas válidas, incluyendo: 4 PolicíasEstándar, 3 PolicíasEstándar + 1 PolicíaMontado, 2 PolicíasEstándar + 1 PolicíaMontado + 1 CamiónLanzaAgua, y 1 CamiónLanzaAgua + 3 PolicíasMontados.
9. THE SpawnSystem SHALL generar Squads en los bordes del Map o en calles abiertas del Map.
10. IF el punto de spawn seleccionado está a menos de una distancia mínima del Player, THEN THE SpawnSystem SHALL seleccionar otro punto de spawn más alejado.
11. WHEN el tiempo sobrevivido aumenta, THE SpawnSystem SHALL incrementar la dificultad de los Squads generados.
12. WHEN el Player transita a un Map avanzado, THE SpawnSystem SHALL incrementar la dificultad de los Squads respecto al Map anterior.
13. WHEN el número de Aliados activos aumenta, THE SpawnSystem SHALL incrementar la dificultad de los Squads generados para compensar el apoyo adicional.

---

### Requisito 6b: Comportamiento al Morir de Enemigos y Puntaje

**User Story:** Como jugador, quiero que los enemigos desaparezcan con una animación al morir y que reciba puntos por eliminarlos, para que el combate tenga retroalimentación visual y recompensa.

#### Criterios de Aceptación

1. WHEN un Enemy recibe daño y sus puntos de vida llegan a 0, THE Enemy SHALL reproducir una animación simple de muerte.
2. WHEN la animación de muerte de un Enemy finaliza, THE Enemy SHALL ser eliminado del Map.
3. WHEN un Enemy es eliminado del Map, THE Game SHALL incrementar el puntaje del Player en la cantidad correspondiente al tipo de Enemy eliminado.
4. THE HUD SHALL actualizar el puntaje del Player de forma inmediata cuando un Enemy sea eliminado.

---

### Requisito 7: Powerups

**User Story:** Como jugador, quiero recoger powerups del mapa que se activen automáticamente al contacto, para obtener ventajas de forma inmediata durante la partida.

#### Criterios de Aceptación

1. WHEN el Player o un Aliado colisiona con cualquier Powerup en el Map, THE Powerup SHALL activarse automáticamente y ser eliminado del Map inmediatamente.

**Manzana:**

2. WHEN el Player colisiona con una Manzana en el Map, THE Player SHALL recuperar 2 puntos de vida sin superar su máximo de 10.

**Maruchan:**

3. WHEN el Player colisiona con una Maruchan en el Map, THE Player SHALL recuperar 5 puntos de vida sin superar su máximo de 10.

**Energética:**

4. WHEN el Player colisiona con una Energética en el Map y el efecto de Energética no está activo, THE Player SHALL incrementar su velocidad de movimiento en un 50% durante exactamente 6 segundos.
5. WHEN el Player colisiona con una Energética en el Map y el efecto de Energética ya está activo, THE Player SHALL reiniciar la duración del efecto a 6 segundos sin acumular velocidad adicional.
6. WHEN el efecto de la Energética expira, THE Player SHALL retornar a su velocidad base.

**Botellita:**

7. WHEN el Player colisiona con una Botellita en el Map, THE ContadorGlobal SHALL incrementarse en 1 Molotov.

**Efectos visuales:**

8. WHEN el Player recoge una Manzana o Maruchan, THE Game SHALL mostrar un efecto visual de curación sobre el personaje que recibió la curación.
9. WHEN el Player recoge una Energética, THE Game SHALL mostrar un efecto visual de velocidad sobre el Player.
10. WHEN el Player recoge una Botellita, THE Game SHALL mostrar un efecto visual de molotov agregada sobre el Player.

**Persistencia:**

11. WHEN el Player transita a un nuevo Map, THE Game SHALL eliminar todos los Powerups presentes en el Map anterior sin transferirlos al nuevo Map.
12. WHEN el Player transita a un nuevo Map y el efecto de Energética está activo, THE Game SHALL mantener el efecto con el tiempo restante en el nuevo Map.

---

### Requisito 7b: Spawn de Powerups en el Mapa

**User Story:** Como jugador, quiero que los powerups aparezcan de forma aleatoria en el mapa con distintas frecuencias según su rareza, para que recogerlos sea parte natural de la exploración y el combate.

#### Criterios de Aceptación

1. THE PowerupSpawnSystem SHALL generar Powerups en ubicaciones aleatorias del Map durante la partida.
2. THE PowerupSpawnSystem SHALL generar Manzanas con frecuencia alta respecto a los demás tipos de Powerup.
3. THE PowerupSpawnSystem SHALL generar Maruchanes con frecuencia baja respecto a las Manzanas.
4. THE PowerupSpawnSystem SHALL generar Botellitas con frecuencia media respecto a los demás tipos de Powerup.
5. WHEN el Player tiene menos del 30% de sus puntos de vida o hay 5 o más Enemies activos en el Map, THE PowerupSpawnSystem SHALL incrementar la probabilidad de generar una Energética en el siguiente spawn.
6. WHILE la condición de peligro no está activa, THE PowerupSpawnSystem SHALL generar Energéticas con frecuencia baja respecto a las Manzanas.
7. THE PowerupSpawnSystem SHALL generar Powerups únicamente en ubicaciones transitables del Map: calles, veredas y plazas.
8. IF el punto de spawn seleccionado para un Powerup está a menos de una distancia mínima del Player, THEN THE PowerupSpawnSystem SHALL seleccionar otro punto de spawn más alejado.
9. WHEN el Player transita a un nuevo Map, THE PowerupSpawnSystem SHALL eliminar todos los Powerups presentes en el Map anterior sin transferirlos al nuevo Map.

---

### Requisito 8: HUD (Interfaz de Usuario)

**User Story:** Como jugador, quiero ver mi estado en pantalla en todo momento con un estilo visual coherente y dibujado a mano, para tomar decisiones informadas durante el juego.

#### Criterios de Aceptación

**Estilo visual general:**

1. THE HUD SHALL renderizar todos sus elementos con estilo visual dibujado a mano con lápiz pasta azul sobre fondo de hoja de cuaderno universitario.
2. THE HUD SHALL permanecer fija en pantalla independientemente del desplazamiento de la Camera.
3. THE HUD SHALL adaptar las posiciones y tamaños de sus elementos a la resolución de pantalla activa, manteniendo las posiciones relativas en cualquier resolución.

**Barra de vida:**

4. THE HUD SHALL mostrar la barra de vida del Player en la esquina superior izquierda de la pantalla en todo momento durante la partida.
5. THE HUD SHALL representar los 10 HP máximos del Player como el ancho completo de la barra de vida.
6. WHEN los puntos de vida del Player cambian, THE HUD SHALL actualizar la barra de vida de forma inmediata para reflejar los HP actuales.
7. THE HUD SHALL renderizar la barra de vida con estilo dibujado a mano.

**Contador de aliados:**

8. THE HUD SHALL mostrar el contador de Aliados vivos con iconos pequeños debajo de la barra de vida en la esquina superior izquierda.
9. WHEN un Aliado muere, THE HUD SHALL actualizar el contador de Aliados de forma inmediata.

**Molotovs:**

10. THE HUD SHALL mostrar el contador de Molotovs disponibles del ContadorGlobal en la esquina superior derecha de la pantalla, acompañado de un icono de molotov dibujado a mano.
11. WHEN el ContadorGlobal cambia, THE HUD SHALL actualizar el contador de Molotovs de forma inmediata.

**Arma actual:**

12. THE HUD SHALL mostrar el arma actualmente equipada por el Player junto al contador de Molotovs en la esquina superior derecha, mediante un icono simple dibujado a mano.
13. WHEN el Player cambia de arma al presionar Q, THE HUD SHALL actualizar el icono del arma de forma inmediata.

**Powerup activo - Energética:**

14. WHEN el efecto de Energética está activo en el Player, THE HUD SHALL mostrar una BarraDuracion que se vacía progresivamente durante los 6 segundos de duración del efecto.
15. WHEN el efecto de Energética expira, THE HUD SHALL ocultar la BarraDuracion de la Energética.

**Puntaje:**

16. THE HUD SHALL mostrar el puntaje actual del Player centrado en la parte superior de la pantalla en todo momento durante la partida.
17. WHEN el puntaje del Player cambia, THE HUD SHALL actualizar el puntaje de forma inmediata.

**Nombre del mapa:**

18. WHEN el Player entra a un nuevo Map, THE HUD SHALL mostrar el nombre del Map centrado en pantalla.
19. WHEN han transcurrido 2 segundos desde que el nombre del Map fue mostrado, THE HUD SHALL ocultar el nombre del Map.

---

### Requisito 9: Pantalla de Game Over

**User Story:** Como jugador, quiero ver una pantalla de Game Over cuando pierdo con opciones claras para continuar, para saber que la partida ha terminado y poder reintentar o volver al menú.

#### Criterios de Aceptación

1. WHEN la condición de Game Over es activada, THE GameOverScreen SHALL ocupar la pantalla completa y mostrarse al jugador.
2. WHEN la GameOverScreen está visible, THE Game SHALL detener el movimiento del Player y la generación de Squads.
3. THE GameOverScreen SHALL mostrar el texto "Game Over" con el estilo visual dibujado a mano del HUD.
4. THE GameOverScreen SHALL mostrar un botón "Reintentar" que permite al jugador iniciar una nueva partida.
5. THE GameOverScreen SHALL mostrar un botón "Cargar partida" que permite al jugador cargar un slot de guardado.
6. THE GameOverScreen SHALL mostrar un botón "Menú principal" que permite al jugador volver al menú principal del juego.
7. WHEN el jugador selecciona "Reintentar" desde la GameOverScreen, THE Game SHALL reiniciar la partida con todos los valores en su estado inicial.
8. WHEN el jugador selecciona "Cargar partida" desde la GameOverScreen, THE Game SHALL mostrar la lista de slots de guardado disponibles para seleccionar.
9. WHEN el jugador selecciona "Menú principal" desde la GameOverScreen, THE Game SHALL cargar la escena del menú principal.

---

### Requisito 9b: Menú de Pausa

**User Story:** Como jugador, quiero pausar el juego en cualquier momento presionando ESC y acceder a opciones de gestión de partida, para poder interrumpir la sesión sin perder mi progreso.

#### Criterios de Aceptación

1. WHEN el jugador presiona la tecla ESC durante la partida, THE PausaMenu SHALL mostrarse y THE Game SHALL detener toda la lógica de juego, incluyendo movimiento del Player, movimiento de Enemies, movimiento de Aliados, SpawnSystem, temporizadores de efectos activos y cualquier otro proceso de juego en curso.
2. WHEN el PausaMenu está visible, THE PausaMenu SHALL mostrar exactamente las siguientes opciones: "Continuar", "Guardar partida", "Cargar partida" y "Salir al menú principal".
3. WHEN el jugador selecciona "Continuar" desde el PausaMenu, THE Game SHALL reanudar la lógica de juego desde el estado exacto en que fue pausada.
4. WHEN el jugador selecciona "Guardar partida" desde el PausaMenu, THE Game SHALL mostrar la pantalla de selección de slots de guardado.
5. WHEN el jugador selecciona "Cargar partida" desde el PausaMenu, THE Game SHALL mostrar la lista de slots de guardado disponibles para seleccionar.
6. WHEN el jugador selecciona "Salir al menú principal" desde el PausaMenu, THE Game SHALL cargar la escena del menú principal.

---

### Requisito 9c: Mensajes en Pantalla

**User Story:** Como jugador, quiero ver mensajes temporales en pantalla que me informen de eventos importantes durante la partida, para recibir retroalimentación clara sobre mi progreso.

#### Criterios de Aceptación

1. WHEN el Player completa un Map, THE Game SHALL mostrar un MensajeEnPantalla con el texto "Nivel completado" centrado en pantalla.
2. WHEN el Player obtiene un nuevo Aliado, THE Game SHALL mostrar un MensajeEnPantalla con el texto "Nuevo aliado" centrado en pantalla.
3. WHEN la condición de Game Over es activada, THE Game SHALL mostrar un MensajeEnPantalla con el texto "Game Over" como parte de la GameOverScreen.
4. WHEN el Player transita al Map final "Plaza Italia", THE Game SHALL mostrar un MensajeEnPantalla con el texto "Manifestación final" centrado en pantalla.
5. THE MensajeEnPantalla SHALL renderizarse con el estilo visual dibujado a mano del HUD.

---

### Requisito 10: Estructura de Mapas

**User Story:** Como jugador, quiero explorar múltiples mapas con estética de cuaderno dibujado a mano que representan sectores de Santiago centro, para tener una experiencia de juego variada y con sentido de lugar.

#### Criterios de Aceptación

**Contenido y variación:**

1. THE Game SHALL contener múltiples Map distintos, cada uno representando el sector alrededor de un liceo emblemático de Santiago centro.
2. THE Map SHALL definir exactamente un PuntoDeEntrada donde el Player aparece al llegar desde otro Map.
3. THE Map SHALL definir exactamente un punto de spawn inicial del Player para el primer Map de la partida.
4. THE Map SHALL contener al menos una ZonaSalida que conecta con otro Map distinto.
5. WHEN el Player transita entre Maps, THE Game SHALL presentar Maps con rutas, salidas y obstáculos distintos entre sí.

**Estilo visual (EstiloSketch):**

6. THE Map SHALL renderizarse con vista cenital (top-down) y EstiloSketch: trazos irregulares dibujados a mano con lápiz pasta azul sobre fondo de hoja de cuaderno universitario con líneas horizontales azules.
7. THE Map SHALL representar calles, veredas, nombres de calles, flechas y anotaciones con trazos irregulares que imitan escritura y dibujo manual.
8. WHERE el diseño del Map lo incluya, THE Map SHALL mostrar un margen rojo vertical en el borde izquierdo, consistente con la estética de cuaderno universitario.

**Tamaño y cámara:**

9. THE Map SHALL representar aproximadamente 6 cuadras de extensión.
10. THE Map SHALL tener dimensiones mayores a las dimensiones de la pantalla visible.
11. THE Camera SHALL seguir al Player con scroll suave durante el desplazamiento por el Map.
12. WHEN el Player se acerca al borde del Map, THE Camera SHALL dejar de desplazarse más allá de los límites del Map.

**ElementosMapa y colisiones:**

13. THE Map SHALL contener los siguientes ElementoMapa transitables: calles, veredas, esquinas, cruces, plazas pequeñas y patios escolares.
14. THE Map SHALL contener los siguientes ElementoMapa que bloquean el movimiento: muros, edificios, árboles, rejas y mobiliario urbano.
15. WHEN el Player o un Enemy colisiona con un ElementoMapa que bloquea el movimiento, THE Game SHALL detener el desplazamiento del personaje sin permitirle atravesarlo.
16. WHILE el Player o un Enemy se desplaza sobre calles o veredas, THE Game SHALL permitir el movimiento libre sin restricciones de colisión.

**Puntos de spawn:**

17. THE Map SHALL definir exactamente un punto de spawn inicial del Player en una ubicación transitable del Map.
18. THE Map SHALL definir PuntoSpawnEnemigo en los bordes del Map para la generación de Squads por el SpawnSystem.
19. THE Map SHALL distribuir PuntoSpawnPowerup en ubicaciones transitables del Map para la generación de Powerups por el PowerupSpawnSystem.

---

### Requisito 11: Salidas y Transición entre Mapas

**User Story:** Como jugador, quiero poder salir de un mapa por sus zonas de salida para avanzar al siguiente sector, para sentir progresión geográfica en el juego.

#### Criterios de Aceptación

**Zonas de salida:**

1. THE Map SHALL tener múltiples ZonaSalida ubicadas en los bordes del Map, cada una conectada a un Map distinto.
2. THE Map SHALL renderizar cada ZonaSalida con EstiloSketch: zona marcada con borde dibujado a mano e indicador simple que señale la dirección de salida.
3. WHILE el Player no está en una ZonaSalida, THE ZonaSalida SHALL permanecer visible en el borde del Map como referencia de navegación.

**Transición:**

4. WHEN el Player entra en una ZonaSalida, THE Game SHALL pausar brevemente la partida antes de cargar el nuevo Map.
5. WHEN el nuevo Map es cargado, THE Game SHALL posicionar al Player en el PuntoDeEntrada del nuevo Map.
6. WHEN el Player entra en una ZonaSalida, THE HUD SHALL mostrar el nombre del nuevo Map al jugador.
7. WHEN el nuevo Map es cargado, THE Camera SHALL centrarse en la posición del Player con scroll suave.

---

### Requisito 12: Persistencia de Estado entre Mapas

**User Story:** Como jugador, quiero que mi progreso se mantenga al cambiar de mapa, para no perder lo que he acumulado durante la partida.

#### Criterios de Aceptación

1. WHEN el Player transita a un nuevo Map, THE Game SHALL mantener los puntos de vida actuales del Player.
2. WHEN el Player transita a un nuevo Map, THE Game SHALL mantener la cantidad de Molotovs del Player.
3. WHEN el Player transita a un nuevo Map, THE Game SHALL mantener los efectos de Powerup activos con tiempo restante, incluyendo el efecto de Energética.
4. WHEN el Player transita a un nuevo Map, THE Game SHALL mantener el puntaje acumulado del Player.
5. WHEN el Player transita a un nuevo Map, THE Game SHALL mantener el tiempo total sobrevivido.
6. WHEN el Player transita a un nuevo Map, THE Game SHALL mantener el nivel de dificultad actual del SpawnSystem.

---

### Requisito 13: Sistema de Aliados - Obtención y Tipos

**User Story:** Como jugador, quiero obtener aliados al completar mapas y que cada aliado tenga características propias, para tener apoyo variado en los sectores siguientes.

#### Criterios de Aceptación

1. WHEN el Player completa un Map, THE Game SHALL otorgar al Player exactamente un Aliado nuevo.
2. WHEN el nuevo Map es cargado, THE Game SHALL hacer aparecer a todos los Aliados activos junto al Player en el PuntoDeEntrada.
3. WHEN el Player transita a un nuevo Map, THE Game SHALL mantener a todos los Aliados vivos, sus puntos de vida actuales y su tipo.
4. WHEN un Aliado recibe daño y sus puntos de vida llegan a 0, THE Aliado SHALL ser eliminado permanentemente de la partida.
5. THE Game SHALL generar un AliadoPunk con una probabilidad del 20% al otorgar un Aliado; en caso contrario, THE Game SHALL generar un AliiadoEstándar o AliiadoRápido según el liceo del Map completado.
6. THE AliiadoEstándar SHALL iniciar con 10 puntos de vida y velocidad de movimiento base.
7. THE AliiadoRápido SHALL iniciar con 8 puntos de vida y velocidad de movimiento un 20% mayor a la velocidad base.
8. THE AliadoPunk SHALL iniciar con 12 puntos de vida y velocidad de movimiento un 10% menor a la velocidad base.
9. WHEN un AliadoPunk aparece en el Map, THE ContadorGlobal SHALL incrementarse en 3 Molotovs.

---

### Requisito 14: Comportamiento IA de Aliados

**User Story:** Como jugador, quiero que mis aliados me sigan y ataquen enemigos automáticamente, para que su apoyo sea efectivo sin requerir mi control directo.

#### Criterios de Aceptación

1. WHILE no hay Enemy en rango de detección del Aliado, THE Aliado SHALL seguir al Player manteniendo una distancia corta.
2. WHILE múltiples Aliados están activos, THE FormacionAliados SHALL posicionar a los Aliados alrededor del Player sin superponerse entre ellos.
3. WHEN un Aliado detecta un Enemy dentro de su rango de detección, THE Aliado SHALL dejar de seguir al Player y atacar al Enemy automáticamente.
4. WHEN un Aliado ataca, THE Aliado SHALL usar el arma disponible: Piedra si no hay Molotovs en el ContadorGlobal, o Molotov si el ContadorGlobal tiene al menos 1 Molotov.
5. WHEN un Aliado lanza una Piedra e impacta a un Enemy, THE Enemy SHALL recibir 1 punto de daño.
6. WHEN un Aliado lanza una Molotov e impacta a un Enemy, THE Enemy SHALL recibir 5 puntos de daño.
7. WHEN un Aliado lanza una Molotov, THE ContadorGlobal SHALL reducirse en 1 Molotov.
8. THE AliadoPunk SHALL atacar con mayor frecuencia que el AliiadoEstándar y el AliiadoRápido.

---

### Requisito 15: Powerups para Aliados

**User Story:** Como jugador, quiero que mis aliados puedan recoger powerups y que la curación se aplique de forma inteligente, para que los recursos del mapa beneficien al miembro del grupo más necesitado.

#### Criterios de Aceptación

1. WHEN un Aliado colisiona con cualquier Powerup en el Map, THE Powerup SHALL activarse automáticamente y ser eliminado del Map inmediatamente.

**Manzana y Maruchan (curación inteligente):**

2. WHEN un Aliado colisiona con una Manzana en el Map y el Aliado tiene puntos de vida inferiores a su máximo, THE Aliado SHALL recuperar 2 puntos de vida sin superar su máximo.
3. WHEN un Aliado colisiona con una Manzana en el Map y el Aliado tiene los puntos de vida al máximo, THE Game SHALL aplicar la curación de 2 puntos de vida al personaje con menos puntos de vida entre el Player y los demás Aliados activos, sin superar el máximo de ese personaje.
4. WHEN un Aliado colisiona con una Maruchan en el Map y el Aliado tiene puntos de vida inferiores a su máximo, THE Aliado SHALL recuperar 5 puntos de vida sin superar su máximo.
5. WHEN un Aliado colisiona con una Maruchan en el Map y el Aliado tiene los puntos de vida al máximo, THE Game SHALL aplicar la curación de 5 puntos de vida al personaje con menos puntos de vida entre el Player y los demás Aliados activos, sin superar el máximo de ese personaje.

**Energética:**

6. WHEN un Aliado colisiona con una Energética en el Map y el efecto de Energética no está activo en ese Aliado, THE Aliado SHALL incrementar su velocidad de movimiento en un 50% durante exactamente 6 segundos.
7. WHEN un Aliado colisiona con una Energética en el Map y el efecto de Energética ya está activo en ese Aliado, THE Aliado SHALL reiniciar la duración del efecto a 6 segundos sin acumular velocidad adicional.
8. WHEN el efecto de la Energética expira en un Aliado, THE Aliado SHALL retornar a su velocidad base.

**Botellita:**

9. WHEN un Aliado colisiona con una Botellita en el Map, THE ContadorGlobal SHALL incrementarse en 1 Molotov.

**Efectos visuales:**

10. WHEN un Aliado recoge una Manzana o Maruchan, THE Game SHALL mostrar un efecto visual de curación sobre el personaje que recibió la curación.
11. WHEN un Aliado recoge una Energética, THE Game SHALL mostrar un efecto visual de velocidad sobre el Aliado que la recogió.
12. WHEN un Aliado recoge una Botellita, THE Game SHALL mostrar un efecto visual de molotov agregada sobre el Aliado que la recogió.

---

### Requisito 16: Progresión de Dificultad por Mapa

**User Story:** Como jugador, quiero que cada mapa sea más difícil que el anterior, para que el juego represente un desafío creciente.

#### Criterios de Aceptación

1. WHEN el Player transita a un nuevo Map, THE SpawnSystem SHALL incrementar la velocidad de spawn de Squads respecto al Map anterior.
2. WHEN el Player transita a un nuevo Map, THE SpawnSystem SHALL incrementar la cantidad de enemigos por Squad respecto al Map anterior.
3. WHEN el Player transita a un nuevo Map, THE Map SHALL incluir enemigos especiales no presentes en Maps anteriores.

---

### Requisito 17: Mapa Final - Plaza Italia

**User Story:** Como jugador, quiero llegar a Plaza Italia como destino final tras recorrer todos los mapas, para tener un objetivo claro de victoria en un escenario más abierto y desafiante.

#### Criterios de Aceptación

**Definición y acceso:**

1. THE Game SHALL definir "Plaza Italia" como el Map final de la progresión.
2. WHEN el Player ha recorrido todos los Maps previos y transita al Map final, THE Game SHALL cargar el Map "Plaza Italia".
3. THE Map "Plaza Italia" SHALL representar el sector de Plaza Italia de Santiago centro.

**Diseño del mapa:**

4. THE Map "Plaza Italia" SHALL tener una zona central grande y abierta con menor densidad de obstáculos que los Maps anteriores.
5. THE Map "Plaza Italia" SHALL tener múltiples accesos que conecten con los bordes del Map, permitiendo la llegada de Squads desde distintas direcciones.
6. THE Map "Plaza Italia" SHALL mantener el EstiloSketch consistente con los demás Maps: trazos a mano con lápiz pasta azul sobre fondo de cuaderno universitario.
7. THE Map "Plaza Italia" SHALL definir PuntoSpawnEnemigo en múltiples bordes del Map para reflejar el acceso desde distintas direcciones.

---

### Requisito 18: Puntaje por Aliados Sobrevivientes

**User Story:** Como jugador, quiero recibir puntos extra por cada aliado vivo al cambiar de mapa y ver cuántos aliados han sobrevivido, para que mantener a mis aliados con vida tenga valor estratégico.

#### Criterios de Aceptación

1. WHEN el Player transita a un nuevo Map, THE Game SHALL incrementar el puntaje del Player por cada Aliado vivo en ese momento.
2. THE HUD SHALL mostrar el contador de Aliados activos en todo momento durante la partida.
3. WHEN la GameOverScreen está visible, THE GameOverScreen SHALL mostrar la cantidad total de Aliados que sobrevivieron hasta el final de la partida.

---

### Requisito 19: Assets Visuales - Spritesheets de Personajes

**User Story:** Como desarrollador, quiero disponer de spritesheets de personajes con formato técnico definido y estilo visual consistente con el EstiloSketch del juego, para integrarlos directamente en Phaser sin requerir ajustes adicionales.

#### Criterios de Aceptación

**Formato técnico:**

1. THE Spritesheet SHALL ser un archivo PNG con fondo transparente por cada personaje.
2. THE Spritesheet SHALL organizar los FramePersonaje en una grilla uniforme de 4 columnas (direcciones: arriba, abajo, izquierda, derecha) × 3 filas (frames: idle, walk1, walk2), totalizando 12 FramePersonaje por personaje.
3. THE FramePersonaje SHALL tener dimensiones exactas de 48×48 píxeles.
4. THE Spritesheet SHALL ser compatible con la configuración de Phaser frameWidth: 48, frameHeight: 48.

**Estilo visual:**

5. THE Spritesheet SHALL renderizar cada personaje con EstiloSketch: dibujado a mano con lápiz pasta azul, líneas simples, colores planos suaves y vista cenital (top-down).
6. THE Spritesheet SHALL incluir una sombra circular pequeña dibujada a mano debajo de cada personaje en todos los FramePersonaje.
7. THE Spritesheet SHALL mantener escala, proporción y estilo visual consistentes entre todos los personajes.

**AnimacionCaminar:**

8. THE AnimacionCaminar SHALL representar un ciclo de movimiento simple y minimalista mediante los 3 FramePersonaje de cada dirección (idle, walk1, walk2).

**Personajes requeridos:**

9. THE Game SHALL disponer de un Spritesheet para el Player con uniforme azul, pantalón gris y mochila.
10. THE Game SHALL disponer de un Spritesheet para el PolicíaEstándar con uniforme verde, casco simple y postura rígida.
11. THE Game SHALL disponer de un Spritesheet para el PolicíaMontado que represente a un policía con uniforme verde montado sobre un caballo simple, con AnimacionCaminar del caballo.
12. THE Game SHALL disponer de un Spritesheet para el AliiadoEstándar con uniforme escolar distinto al del Player.
13. THE Game SHALL disponer de un Spritesheet para el AliiadoRápido con uniforme escolar femenino que refleje su mayor ligereza.
14. THE Game SHALL disponer de un Spritesheet para el AliadoPunk con complexión más robusta, peinado punk, mochila y postura agresiva.

---

### Requisito 20: Assets Visuales - Sprites de Objetos y Powerups

**User Story:** Como desarrollador, quiero disponer de sprites individuales para cada objeto, arma y powerup del juego con formato técnico definido y estilo visual consistente con el EstiloSketch, para integrarlos directamente en Phaser sin requerir ajustes adicionales.

#### Criterios de Aceptación

**Formato técnico:**

1. THE SpriteObjeto SHALL ser un archivo PNG con fondo transparente por cada objeto.
2. THE SpriteObjeto SHALL tener dimensiones de 32×32 o 48×48 píxeles, centrado en el canvas.
3. THE SpriteObjeto SHALL ser compatible con la configuración de carga de imágenes de Phaser.

**Estilo visual:**

4. THE SpriteObjeto SHALL renderizarse con EstiloSketch: dibujado a mano con lápiz pasta azul, líneas simples, colores planos suaves, vista cenital (top-down) y outline azul minimalista.
5. THE SpriteObjeto SHALL mantener escala, proporción y estilo visual consistentes entre todos los objetos del juego.

**Sprites de armas requeridos:**

6. THE Game SHALL disponer de un SpriteArma para la Piedra que represente una forma pequeña e irregular dibujada a mano con EstiloSketch.
7. THE Game SHALL disponer de un SpriteArma para la Molotov que represente una botellita con mecha en vista cenital con EstiloSketch.

**Sprites de powerups requeridos:**

8. THE Game SHALL disponer de un SpritePowerup para la Botellita que represente una botella pequeña visualmente distinta a la Molotov, con EfectoRecogible aplicado.
9. THE Game SHALL disponer de un SpritePowerup para la Manzana que represente una manzana en vista cenital con forma simple dibujada a mano, con EfectoRecogible aplicado.
10. THE Game SHALL disponer de un SpritePowerup para la Maruchan que represente un vaso de noodles visto desde arriba, simple y legible, con EfectoRecogible aplicado.
11. THE Game SHALL disponer de un SpritePowerup para la Energética que represente una lata en vista cenital con EstiloSketch, con EfectoRecogible aplicado.

**Efecto visual de recogible:**

12. THE EfectoRecogible SHALL aplicarse a todos los SpritePowerup mediante un leve brillo y un contorno/outline adicional que los distinga visualmente de los SpriteArma.

**Animación de 2 frames:**

13. THE SpritePowerup SHALL incluir exactamente 2 frames de animación: un frame base y un frame con EfectoRecogible activo (brillo o escala levemente mayor).
14. WHEN un SpritePowerup está presente en el Map, THE Game SHALL reproducir la animación de 2 frames del SpritePowerup en ciclo continuo para indicar que es recogible.

**Exportación:**

15. THE Game SHALL disponer de cada SpriteObjeto como archivo PNG individual.
16. WHERE se requiera optimización de assets, THE Game SHALL disponer de un spritesheet agrupado con todos los SpriteObjeto.

---

### Requisito 21: Assets Visuales - Sprites de Vehículos Enemigos

**User Story:** Como desarrollador, quiero disponer de spritesheets y sprites de efectos para los vehículos enemigos con formato técnico definido y estilo visual consistente con el EstiloSketch del juego, para integrarlos directamente en Phaser sin requerir ajustes adicionales.

#### Criterios de Aceptación

**Formato técnico:**

1. THE SpriteVehiculo SHALL ser un archivo PNG con fondo transparente por cada vehículo enemigo.
2. THE SpriteVehiculo SHALL organizar los FrameVehiculo en una grilla de 4 columnas (direcciones: arriba, abajo, izquierda, derecha) × 2 filas (frames: idle, movimiento), totalizando 8 FrameVehiculo por vehículo.
3. THE FrameVehiculo SHALL tener dimensiones de 96×96 o 128×128 píxeles, centrado en el canvas.
4. THE SpriteVehiculo SHALL ser compatible con la configuración de Phaser frameWidth y frameHeight correspondientes al tamaño definido.
5. THE EfectoChorro SHALL ser un archivo PNG con fondo transparente, independiente del SpriteVehiculo del CamiónLanzaAgua.
6. THE EfectoGas SHALL ser un archivo PNG con fondo transparente, independiente del SpriteVehiculo del CamiónLanzaGas.

**Escala:**

7. THE SpriteVehiculo SHALL representar a los vehículos enemigos con un tamaño visualmente mayor al de los FramePersonaje de los personajes del juego.

**Estilo visual:**

8. THE SpriteVehiculo SHALL renderizarse con EstiloSketch: dibujado a mano con lápiz pasta azul, líneas simples e irregulares, colores planos suaves y vista cenital (top-down), consistente con los personajes existentes del juego.
9. THE SpriteVehiculo SHALL incluir una sombra simple dibujada a mano debajo del vehículo en todos los FrameVehiculo.
10. THE SpriteVehiculo SHALL mantener escala, proporción y estilo visual consistentes entre el CamiónLanzaAgua y el CamiónLanzaGas.

**Spritesheet CamiónLanzaAgua:**

11. THE Game SHALL disponer de un SpriteVehiculo para el CamiónLanzaAgua que represente un vehículo grande en vista cenital con cañón frontal visible y EstiloSketch.
12. THE SpriteVehiculo del CamiónLanzaAgua SHALL contener 8 FrameVehiculo organizados en 4 direcciones × 2 frames (idle, movimiento).
13. THE SpriteVehiculo del CamiónLanzaAgua SHALL soportar las animaciones: idle, movimiento y disparo de agua.

**Spritesheet CamiónLanzaGas:**

14. THE Game SHALL disponer de un SpriteVehiculo para el CamiónLanzaGas que represente un vehículo de tamaño similar al CamiónLanzaAgua con tubo superior visible y EstiloSketch.
15. THE SpriteVehiculo del CamiónLanzaGas SHALL contener 8 FrameVehiculo organizados en 4 direcciones × 2 frames (idle, movimiento).
16. THE SpriteVehiculo del CamiónLanzaGas SHALL soportar las animaciones: idle, movimiento y disparo de gas.

**Sprite EfectoChorro:**

17. THE Game SHALL disponer de un EfectoChorro para el CamiónLanzaAgua que represente un cono frontal de agua con EstiloSketch.
18. THE EfectoChorro SHALL contener entre 2 y 3 frames de animación.
19. WHEN el CamiónLanzaAgua dispara, THE Game SHALL reproducir la animación del EfectoChorro en ciclo continuo durante el tiempo de disparo.

**Sprite EfectoGas:**

20. THE Game SHALL disponer de un EfectoGas para el CamiónLanzaGas que represente una nube circular con EstiloSketch.
21. THE EfectoGas SHALL contener exactamente 3 frames de animación que representen la expansión de la nube.
22. WHEN el CamiónLanzaGas dispara, THE Game SHALL reproducir la animación del EfectoGas en ciclo continuo durante el tiempo de disparo.

---

### Requisito 22: Pantalla de Título y Menú Principal

**User Story:** Como jugador, quiero ver una pantalla de título con estilo visual consistente con el juego y un menú principal claro, para poder iniciar o retomar una partida de forma intuitiva.

#### Criterios de Aceptación

**Resolución y compatibilidad:**

1. THE PantallaTitulo SHALL renderizarse a una resolución de 1920×1080 píxeles y ser compatible con Phaser.

**Fondo:**

2. THE PantallaTitulo SHALL renderizar un fondo que represente una hoja de cuaderno universitario con líneas horizontales azules, margen rojo vertical y textura de papel, consistente con el EstiloSketch del juego.
3. THE fondo de la PantallaTitulo SHALL exportarse como asset separado compatible con Phaser.
4. WHEN la PantallaTitulo está activa, THE PantallaTitulo SHALL aplicar un leve movimiento al fondo mediante parallax o vibración sutil.

**Logo:**

5. THE LogoJuego SHALL mostrar el texto "PINGÜINOCRACIA 2" en tipografía escrita a mano, irregular, estilo lápiz pasta, de color azul tinta, centrado en pantalla.
6. THE LogoJuego SHALL incluir un pingüino dibujado en estilo caricatura simple integrado al texto del logo.
7. THE LogoJuego SHALL mostrar el subtítulo "escape por santiago centro" escrito a mano debajo del texto principal.
8. THE LogoJuego SHALL exportarse como asset separado compatible con Phaser.
9. WHEN la PantallaTitulo está activa, THE LogoJuego SHALL aplicar un parpadeo suave al pingüino integrado.
10. WHEN la PantallaTitulo está activa, THE LogoJuego SHALL aplicar una vibración leve estilo dibujo animado al conjunto del logo.

**Menú principal - Botones:**

11. THE MenuPrincipal SHALL mostrar exactamente los siguientes botones en la PantallaTitulo: "Jugar", "Cargar partida", "Opciones" y "Créditos".
12. THE MenuPrincipal SHALL renderizar cada botón con estilo dibujado a mano: rectángulos irregulares con outline azul y diseño minimalista, consistente con el EstiloSketch del juego.
13. THE MenuPrincipal SHALL exportar cada botón como asset separado compatible con Phaser.
14. WHEN el jugador selecciona "Jugar" desde el MenuPrincipal, THE Game SHALL iniciar una nueva partida.
15. WHEN el jugador selecciona "Cargar partida" desde el MenuPrincipal, THE Game SHALL cargar el estado de la última partida guardada.
16. WHEN el jugador selecciona "Opciones" desde el MenuPrincipal, THE Game SHALL mostrar la pantalla de opciones del juego.
17. WHEN el jugador selecciona "Créditos" desde el MenuPrincipal, THE Game SHALL mostrar la pantalla de créditos del juego.

**Música:**

18. WHEN la PantallaTitulo está activa, THE MusicaTitulo SHALL reproducirse en loop continuo a volumen bajo.
19. THE MusicaTitulo SHALL tener estilo punk californiano con guitarra simple y batería rápida.
20. WHEN el jugador inicia una partida desde el MenuPrincipal, THE MusicaTitulo SHALL detenerse.

---

### Requisito 23: Sistema de Guardado y Carga de Partida

**User Story:** Como jugador, quiero guardar mi partida en slots nombrados y cargarla más tarde, para poder retomar el juego desde donde lo dejé sin perder mi progreso.

#### Criterios de Aceptación

**Slots de guardado:**

1. THE Game SHALL disponer de exactamente 4 slots de guardado: "Slot 1", "Slot 2", "Slot 3" y "Guardado rápido".
2. THE Game SHALL persistir todos los slots de guardado en el localStorage del navegador.
3. THE Game SHALL mostrar en la pantalla de selección de slots el estado de cada slot: vacío u ocupado con fecha y hora del guardado.

**Guardar partida:**

4. WHEN el jugador selecciona un slot desde la pantalla de guardado, THE Game SHALL guardar el estado completo de la partida en ese slot.
5. THE Game SHALL guardar en el slot el siguiente estado del Player: posición actual, puntos de vida actuales, velocidad base, arma equipada actualmente.
6. THE Game SHALL guardar en el slot el siguiente estado de los Aliados: cantidad de Aliados activos, tipo de cada Aliado (AliiadoEstándar, AliiadoRápido o AliadoPunk), puntos de vida actuales de cada Aliado y posición relativa al Player.
7. THE Game SHALL guardar en el slot el siguiente estado del inventario: cantidad de Molotovs disponibles en el ContadorGlobal.
8. THE Game SHALL guardar en el slot el siguiente estado del Map: identificador del Map actual, PuntoDeEntrada del Map actual y ZonasSalida desbloqueadas.
9. THE Game SHALL guardar en el slot el siguiente estado de dificultad: tiempo total sobrevivido, nivel de spawn actual del SpawnSystem y tipos de enemigos especiales activos.
10. THE Game SHALL guardar en el slot el siguiente estado de powerups activos: si el efecto de Energética está activo y el tiempo restante del efecto.
11. THE Game SHALL guardar en el slot el puntaje actual del Player.
12. WHEN el guardado en un slot se completa, THE Game SHALL mostrar un MensajeEnPantalla con el texto "Partida guardada" centrado en pantalla.

**Teclas rápidas:**

13. WHEN el jugador presiona la tecla F5 durante la partida, THE Game SHALL guardar el estado actual de la partida en el slot "Guardado rápido" sin mostrar la pantalla de selección de slots.
14. WHEN el jugador presiona la tecla F9 durante la partida, THE Game SHALL cargar el estado guardado en el slot "Guardado rápido" sin mostrar la pantalla de selección de slots.
15. IF el slot "Guardado rápido" está vacío cuando el jugador presiona F9, THEN THE Game SHALL no realizar ninguna acción y mostrar un MensajeEnPantalla indicando que no hay guardado rápido disponible.

**Cargar partida:**

16. WHEN el jugador selecciona un slot ocupado desde la pantalla de carga, THE Game SHALL restaurar el estado completo de la partida exactamente como fue guardado, incluyendo todos los campos definidos en los criterios 5 al 11.
17. IF el jugador selecciona un slot vacío desde la pantalla de carga, THEN THE Game SHALL no realizar ninguna acción y mantener la pantalla de selección de slots visible.
18. WHEN la partida es cargada desde un slot, THE Game SHALL posicionar al Player en la posición guardada del Map correspondiente con todos los Aliados activos en sus posiciones relativas.

---

### Requisito 24: Evento Final - Manifestación en Plaza Italia

**User Story:** Como jugador, quiero que al llegar a Plaza Italia se desencadene un evento final de resistencia con condición de victoria clara, para que el juego tenga un cierre épico y satisfactorio.

#### Criterios de Aceptación

**Entrada al mapa final:**

1. WHEN el Player entra al Map "Plaza Italia", THE Game SHALL mostrar un MensajeEnPantalla con el texto "Plaza Italia" centrado en pantalla y pausar brevemente antes de iniciar el evento.
2. WHEN el Map "Plaza Italia" es cargado, THE Camera SHALL centrarse en la posición del Player con scroll suave.
3. WHEN el Map "Plaza Italia" es cargado, THE FormacionAliados SHALL reagrupar a todos los Aliados activos alrededor del Player en el PuntoDeEntrada.

**Inicio del evento:**

4. WHEN la pausa de entrada al Map "Plaza Italia" finaliza, THE Game SHALL iniciar el EventoFinal con un contador de tiempo visible en el HUD.
5. THE EventoFinal SHALL tener una duración de entre 60 y 120 segundos, definida en la configuración del juego.

**Mapa y diseño:**

6. THE Map "Plaza Italia" SHALL tener una zona central grande y abierta con menor densidad de obstáculos que los Maps anteriores, con múltiples calles conectadas que permitan la llegada de Squads desde distintas direcciones.

**Spawn durante el evento:**

7. WHILE el EventoFinal está activo, THE SpawnSystem SHALL generar Squads de forma constante con dificultad alta, incluyendo todos los tipos de Enemy activos: PolicíaEstándar, PolicíaMontado, CamiónLanzaAgua y CamiónLanzaGas.
8. WHILE el EventoFinal está activo, THE SpawnSystem SHALL generar Squads de mayor tamaño que en los Maps anteriores.
9. WHILE el EventoFinal está activo, THE SpawnSystem SHALL generar Squads desde múltiples PuntoSpawnEnemigo en los bordes del Map "Plaza Italia".

**Comportamiento de aliados:**

10. WHILE el EventoFinal está activo, THE Aliado SHALL atacar automáticamente a los Enemies cercanos sin necesidad de alejarse del Player.
11. WHILE el EventoFinal está activo, THE Aliado SHALL poder recibir daño y morir de forma permanente.

**HUD durante el evento:**

12. WHILE el EventoFinal está activo, THE HUD SHALL mostrar el tiempo restante del EventoFinal en pantalla de forma visible.
13. WHILE el EventoFinal está activo, THE HUD SHALL mostrar el contador de Aliados vivos y la barra de vida del Player.

**Condición de victoria:**

14. WHEN el contador de tiempo del EventoFinal llega a 0 y el Player sigue vivo, THE Game SHALL mostrar un MensajeEnPantalla con el texto "Manifestación completada" y cargar la PantallaVictoria.
15. THE PantallaVictoria SHALL mostrar el texto "PINGÜINOCRACIA 2" y "Manifestación completada" con EstiloSketch.
16. THE PantallaVictoria SHALL mostrar el puntaje final calculado según los criterios definidos.
17. THE PantallaVictoria SHALL mostrar un botón "Jugar nuevamente" que reinicia la partida desde el inicio.
18. THE PantallaVictoria SHALL mostrar un botón "Menú principal" que carga la PantallaTitulo.

**Condición de derrota:**

19. WHEN los puntos de vida del Player llegan a 0 durante el EventoFinal, THE Game SHALL activar la condición de Game Over de la misma forma que en cualquier otro Map.

**Puntaje final:**

20. WHEN la PantallaVictoria es mostrada, THE Game SHALL calcular el puntaje final sumando: puntos por Aliados sobrevivientes al finalizar el EventoFinal, puntos por tiempo resistido durante el EventoFinal, puntos acumulados por Enemies derrotados durante toda la partida y puntos por Powerups recogidos durante toda la partida.
21. THE PantallaVictoria SHALL mostrar el puntaje final con EstiloSketch, consistente con el HUD del juego.
