# RaceLine · documento de diseño

Juego #5 de BluBer Games. Carreras de carros en un circuito urbano en miniatura, vista aérea 2D (iPhone, vertical). Las reglas del estudio están en `../CLAUDE.md`.

## Idea central
Dibujas con el dedo la **línea de carrera** de tu carro antes de salir. La línea más rápida casi nunca es el centro de la pista: se entra abierto, se corta al vértice de la curva y se sale abierto. Dibujar mejor = más rápido. Calmado: planeas sin prisa y luego miras la carrera.

## Reglas (decididas)
- **Se dibuja primero**, antes de la carrera. No hay dibujo durante la carrera.
- **3 vueltas** por carrera.
- **Estrellas por lugar final:** 1.º = 3, 2.º = 2, 3.º = 1, 4.º = 0 (hay que repetir el nivel).
- **Número de carros: 4** (tú + 3 rivales), para que coincida con los 4 lugares. Confirmado.
- Carros de **colores distintos**, mismo aspecto general, muy detallados.
- **Circuito urbano en miniatura.**
- **Muchos niveles a futuro; por ahora 3.**
- Avanzar: con 1 estrella o más se desbloquea el siguiente nivel.

## Flujo de un nivel
1. **Trazo.** Ves la pista completa. Dibujas un solo giro cerrado (una vuelta) desde la línea de salida; el carro lo repite las 3 vueltas. Botón de borrar y rehacer; el trazo se puede corregir las veces que quieras.
2. **Suavizado.** El juego convierte el trazo en una curva suave (spline). Cualquier temblor se limpia.
3. **Carrera.** Semáforo en calma, 3 vueltas, los 4 carros a la vez. Solo miras.
4. **Resultado.** Lugar, estrellas y tu línea comparada con la ideal. Reintentar o siguiente.

## Cómo se mueve el carro (el corazón del juego)
- A lo largo de la línea se calcula la **curvatura** en cada punto.
- Velocidad máxima en un punto: `v = min(vMax, sqrt(aLateral / curvatura))`. Curva cerrada = lenta; curva abierta o recta = rápida.
- Aceleración y frenado con límites (el carro anticipa las curvas: frena antes).
- **Fuera de la pista** (pasto, banqueta): pierde velocidad. **Contra el muro:** roce suave, pierde velocidad, sin choques violentos.
- Línea que sale muy fuera o se cruza mal: se **ajusta al borde** de la pista para que siempre se pueda terminar.
- Los rivales siguen líneas calculadas por nivel con una habilidad (0.80–0.97 de la ideal) y una variación pequeña por carrera, para que no sea idéntico cada vez.
- Sin colisiones entre carros: si se acercan, se desvían un poco de lado (adelantamientos limpios).

## Niveles iniciales
| # | Nombre (EN) | Pista | Qué enseña |
|---|---|---|---|
| 1 | Plaza | Circuito de 4 curvas amplias alrededor de una plaza | Cortar al vértice. Rivales lentos |
| 2 | Downtown | Curvas en S, una horquilla, calles más angostas | Suavizar para no frenar de más. Rivales medios |
| 3 | Harbor Ave | Recta larga, chicane y horquilla al final | Frenar y salir bien. Rivales cercanos a la línea ideal |

## Identidad visual (propuesta, paleta propia)
Maqueta de ciudad vista desde arriba, con sombras suaves, relieve ligero de los edificios y luz cálida de tarde. Sin rombos ni azul del estudio como color principal.
- Suelo / banqueta: arena cálida `#E9DFCC`
- Asfalto: grafito `#2B2F36`, líneas de carril crema `#F3EBDD`
- Edificios: terracota `#D9A58B`, salvia `#A9C1A0`, gris piedra `#C9C4BA`, techos con detalles (tanques, claraboyas)
- Parques: verde suave `#9DB88C`
- Tu línea: ámbar `#F2A65A`, como tiza o lápiz que se apaga al pasar el carro
- Carros (4 colores): coral `#E5705B`, verde azulado `#3E9C91`, mostaza `#E8B23D`, ciruela `#7C5A8C`
- Tipografía: Montserrat / Figtree (estudio). Íconos de línea SVG, sin emojis.
- Detalle de miniatura: pequeños árboles, semáforos, cruces peatonales, autos estacionados fijos, peatones del tamaño de un punto.

## Sonido y vibración
- ASMR cálido: motor suave por carro (pitch ligado a la velocidad), nunca agudo. Un "thump" suave en cada acción de botón.
- El dibujo suena como lápiz sobre papel, muy tenue.
- Las melodías se reservan para el premio de estrellas (marimba de madera).
- Vibración ligera al soltar el trazo, al semáforo y al cruzar la meta; respeta el ajuste.
- App: sesión de audio "ambient". Web: "playback".

## Pantallas
Inicio · Selección de nivel (3 por ahora, con estrellas) · Trazo · Carrera · Resultado · Ajustes · Cómo jugar · Récords (mejor lugar y mejor tiempo por nivel).

## Plan técnico
1. **Prototipo web** de un solo HTML con una pista: dibujar, suavizar, simular 3 vueltas con 4 carros, comprobar que la línea se siente bien. Canvas 2D.
2. Los 3 niveles, estrellas, desbloqueo y pantallas.
3. Arte detallado de ciudad y carros, sonido, vibración, intro de BluBer.
4. App de iOS con Capacitor 7 y estructura del estudio.
