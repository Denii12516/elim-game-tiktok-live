# ELIM GAME + TikTok LIVE

Esta versión conecta el tablero con un servidor Node.js que recibe eventos de TikTok LIVE y envía los regalos al tablero en tiempo real.

## Requisitos

- Node.js 20 o superior.
- Una computadora (Windows, macOS o Linux) para ejecutar el servidor.
- Tu cuenta de TikTok debe estar haciendo LIVE para probar la conexión.

El conector usado es `tiktok-live-connector`. Es una biblioteca **no oficial** que lee el Webcast interno de TikTok LIVE; TikTok puede cambiar ese sistema y romper la conexión.

## Instalación

1. Descomprime esta carpeta.
2. Abre una terminal dentro de la carpeta.
3. Ejecuta:

```bash
npm install
```

4. Después ejecuta:

```bash
npm start
```

5. En el navegador abre:

```text
http://localhost:3000
```

**No abras `elim_game_tiktok.html` directamente con `content://`.**

## Conectar tu LIVE

En el tablero escribe tu usuario, por ejemplo:

```text
@miusuario
```

y pulsa:

**🔗 ENLAZAR LIVE**

El servidor intentará conectarse a tu LIVE.

Cuando se conecte aparecerá:

**● TIKTOK LIVE CONECTADO**

## Regalos

Cuando alguien mande un regalo, el servidor toma:

- usuario
- valor del regalo en diamantes/monedas disponible en el evento
- cantidad final de la racha (`repeatCount`)
- foto de perfil cuando esté disponible

y lo manda al tablero.

Las rachas se procesan en el evento final para evitar contar el mismo regalo varias veces.

## Cómo funciona con tu tablero

El tablero conserva tus reglas:

- `C` = monedas necesarias para una entrada.
- Una persona puede conseguir varias entradas.
- Las entradas aparecen revueltas.
- `INSTA` puede activar `WINNER` cuando un regalo individual alcanza esa cantidad.
- El tablero controla las eliminaciones y la animación.

## Importante sobre TikTok

Este método no es una API oficial de TikTok. El proyecto de conexión es de ingeniería inversa. No introduzcas contraseñas, cookies `sessionid` ni códigos de TikTok en este tablero.

Si la biblioteca deja de conectarse después de un cambio de TikTok, habrá que actualizar el conector o usar un servicio WebSocket administrado compatible.
