# Agua para Fernanda 💧

Una mini web app para llevar la cuenta del agua del día, con una meta de 2 L.
Es HTML, CSS y JavaScript sin frameworks: sin backend, sin cuentas, sin cookies y sin analítica.
Todo se guarda solo en el navegador del celular de Fernanda (`localStorage`).

## Archivos

```
index.html          Estructura de la pantalla
styles.css          Diseño (colores al inicio del archivo)
app.js              Lógica (configuración al inicio del archivo)
manifest.json       Permite "Agregar a pantalla de inicio"
service-worker.js   Permite abrirla sin conexión
icons/              Íconos de la app
fonts/              Tipografía Nunito, incluida en el proyecto (licencia OFL)
```

## 1. Abrirla en tu computadora

Desde la carpeta del proyecto, levanta un servidor local:

```bash
python3 -m http.server 8000
```

y entra a <http://localhost:8000>.

(Con doble clic en `index.html` también funciona, pero el navegador bloquea la tipografía
en archivos locales y verás una fuente del sistema. Publicada en GitHub Pages se ve bien.)

## 2. Probarla

- Toca **+250 ml** / **+500 ml**: el vaso sube y aparece un mensajito.
- **Agregar otra cantidad** abre un campo para escribir los mililitros.
- **Deshacer** quita el último registro.
- Recarga la página: el progreso se mantiene.
- Al llegar a 2000 ml aparece la felicitación (solo una vez por día).
- **Tu semana** muestra los últimos 7 días.

Para ver el celular desde la computadora: en Chrome abre las herramientas de desarrollo
(`F12`) y activa la vista de dispositivo (ícono de celular).

Para reiniciar la prueba desde cero: herramientas de desarrollo → **Application** →
**Local Storage** → borra la clave `agua-fernanda-v1`.

Para simular el cambio de día: en esa misma clave, cambia `"date"` de `today` a una fecha
anterior (por ejemplo `"2026-01-01"`) y recarga. La app guarda ese día en el historial y
empieza en 0 ml.

## 3. Publicarla gratis en GitHub Pages

1. Sube estos archivos a un repositorio de GitHub (la carpeta raíz debe contener `index.html`).
2. En el repositorio, ve a **Settings → Pages**.
3. En **Build and deployment → Source**, elige **Deploy from a branch**.
4. En **Branch**, elige la rama (por ejemplo `main`) y la carpeta **/ (root)**. Pulsa **Save**.
5. Espera uno o dos minutos. GitHub mostrará arriba el enlace, algo como
   `https://TU-USUARIO.github.io/NOMBRE-DEL-REPO/`.
6. Ese es el enlace que le compartes a Fernanda.

> Nota: con cuentas gratuitas, GitHub Pages solo funciona en repositorios **públicos**.
> El código será visible, pero los datos de Fernanda no: viven solo en su celular.

**Agregarla a la pantalla de inicio:**
- iPhone (Safari): botón Compartir → **Agregar a inicio**.
- Android (Chrome): menú ⋮ → **Agregar a la pantalla principal** / **Instalar app**.

## 4. Cambiar el nombre

En `app.js`, al inicio:

```js
const CONFIG = {
  name: "Fernanda",
```

Cambia `"Fernanda"` por el nombre que quieras. Si además quieres que el nombre cambie en el
título de la pestaña antes de que cargue la app y en el nombre al instalarla, edítalo también
en `<title>` de `index.html` y en `"name"` de `manifest.json`.

## 5. Cambiar la meta diaria

En el mismo `CONFIG` de `app.js`:

```js
  goalMl: 2000,              // meta en mililitros
  quickAmounts: [250, 500],  // botones rápidos
```

La etiqueta "Meta de hoy", el vaso y el porcentaje se ajustan solos.

## 6. Cambiar los colores

Al inicio de `styles.css`, dentro de `:root`, están todas las variables de color:

```css
--water-top: #7dc6f3;     /* agua, parte de arriba */
--water-bottom: #3a90dc;  /* agua, parte de abajo */
--accent: #2b74ba;        /* porcentaje y botones de acción */
--lavender-ink: #6a5fb8;  /* "Tu semana" */
--bg-top / --bg-bottom    /* degradado del fondo */
```

Cambia los valores y recarga.

## Después de publicar cambios

El service worker siempre intenta traer primero la versión más reciente, así que basta con
recargar la página. Si en algún celular se queda una versión vieja, sube el número en
`const CACHE = "agua-v1";` de `service-worker.js` (por ejemplo a `"agua-v2"`).

## Privacidad

- Sin servidores, sin cuentas, sin cookies, sin analítica.
- La tipografía está incluida en el proyecto, así que la app no hace peticiones a terceros.
- Los datos se quedan en el navegador del dispositivo. Si Fernanda borra los datos del
  navegador (o cambia de celular), el historial empieza de nuevo.
