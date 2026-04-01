# Pingüinocracia 2

Juego de acción top-down 2D para navegador web. Controlas a un estudiante que debe sobrevivir oleadas de policías, recoger powerups, reclutar aliados y avanzar por múltiples mapas hasta llegar a Plaza Italia.

Estilo visual **EstiloSketch**: lápiz pasta azul sobre hoja de cuaderno universitario.

## Jugar

🎮 **[Jugar online](https://mgaticah.github.io/pinguinocracia2/)**

## Controles

| Tecla | Acción |
|---|---|
| WASD / Flechas | Moverse |
| Espacio | Disparar (dirección que miras) |
| Clic izquierdo | Disparar (hacia el cursor) |
| Q | Alternar piedra / molotov |
| +/- o rueda del mouse | Zoom in / out |
| ESC | Pausar |
| F5 | Guardado rápido |
| F9 | Carga rápida |

## Mecánicas

- **4 mapas**: Barros Arana → Amunátegui → Lastarria → Plaza Italia (evento final)
- **Enemigos**: Policía Estándar (melee), Policía Montado (carga + empuje), Camión Lanza Agua (cono + ralentiza), Camión Lanza Gas (zona de daño)
- **Aliados**: Estándar, Rápido, Punk (+3 molotovs al aparecer). Se reclutan al completar mapas
- **Powerups**: Manzana (+2 HP), Maruchan (+5 HP), Energética (velocidad ×1.5), Botellita (+1 molotov)
- **Dificultad progresiva**: spawn cada 20s, nuevos tipos de enemigos con el tiempo, squads más grandes
- **Evento final**: Plaza Italia, 90 segundos de resistencia con todos los tipos de enemigos

## Stack

- **Phaser 3** — motor de juego
- **Vite** — bundler y dev server
- **Vitest + fast-check** — tests unitarios y property-based testing
- **EasyStar.js** — pathfinding A* para enemigos
- **Web Audio API** — efectos de sonido procedurales

## Desarrollo

```bash
npm install
npm run dev      # servidor de desarrollo en localhost:3000
npm test         # 531 tests
npm run build    # build de producción (ofuscado)
```

## Deploy

```bash
npm run build && npx gh-pages -d dist
```

## Assets

Los sprites van en `public/assets/`. Formato: PNG 240×192px (5 cols × 4 filas, 48×48 por frame).

```
Col 0      Col 1      Col 2      Col 3       Col 4
idle ↑     walk1 ↑    walk2 ↑    ataque1 ↑   ataque2 ↑
idle ↓     walk1 ↓    walk2 ↓    ataque1 ↓   ataque2 ↓
idle ←     walk1 ←    walk2 ←    ataque1 ←   ataque2 ←
idle →     walk1 →    walk2 →    ataque1 →   ataque2 →
```

Si un PNG no existe, el juego genera un placeholder de colores automáticamente.

## Licencia

Todos los derechos reservados.
