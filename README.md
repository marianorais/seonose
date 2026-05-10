# SeONose

SeONose es una aplicación web de quiz diario construida con React, TypeScript, Vite y Tailwind CSS.

## 🚀 Qué incluye

- Juego de preguntas diario con temporizador
- Modo de respuestas de texto y opción múltiple
- Persistencia local en `localStorage`
- Compartir resultado por WhatsApp, Twitter, Telegram, Email y portapapeles
- Temas visuales con modo claro, oscuro, negro, azul y sepia
- Estadísticas de partidas guardadas

## 💻 Desarrollo local

Instala dependencias y ejecuta el modo desarrollo:

```bash
npm install
npm run dev
```

La aplicación se abrirá en `http://localhost:5173` o en el puerto que indique Vite.

## 📦 Build de producción

```bash
npm run build
```

El resultado se genera en la carpeta `dist`.

## 🌐 Variables de entorno

La aplicación usa `VITE_API_BASE_URL` para apuntar al backend si está disponible.

Crea un archivo `.env` en la raíz con este contenido si quieres usar una API remota:

```env
VITE_API_BASE_URL=https://mi-backend.example.com
```

Si no tienes backend aún, puedes desplegar solo el frontend y seguir usando la app como demo estática.

## 📍 Deploy en Vercel

1. Sube tu proyecto a GitHub.
2. Crea un nuevo proyecto en Vercel.
3. Conecta el repositorio.
4. En `Build Command` usa:

```bash
npm run build
```

5. En `Output Directory` usa:

```bash
dist
```

6. Agrega la variable de entorno `VITE_API_BASE_URL` si tienes API:

- `VITE_API_BASE_URL=https://mi-backend.example.com`

7. Despliega.

## 📍 Deploy en Netlify

1. Conecta el repositorio en Netlify.
2. En `Build command` escribe:

```bash
npm run build
```

3. En `Publish directory` escribe:

```bash
dist
```

4. Agrega la variable de entorno `VITE_API_BASE_URL` si usas backend.
5. Autoriza el deploy.

Netlify también puede servir la app como SPA con esta configuración en `netlify.toml`.

## 🧠 Qué debes hacer antes de publicar

- Verifica que la app funcione en `npm run dev`.
- Asegúrate de que `VITE_API_BASE_URL` apunte a tu backend si lo necesitas.
- Si no tienes backend, la demo seguirá funcionando como app estática para prueba de UI/UX.

## 🧩 Notas sobre el backend

Si quieres desplegar también la API de .NET más adelante:

- Sube `backend/` a un servicio como Render, Railway, Fly.io o Azure.
- Configura la URL desde `VITE_API_BASE_URL`.
- Asegúrate de que el backend responda en `/api/questions` y `/api/questions/settings`.

## 📎 Archivos incluidos para deploy

- `vercel.json`: configuración opcional para Vercel
- `netlify.toml`: configuración opcional para Netlify
- `.env.example`: ejemplo de variable de entorno
