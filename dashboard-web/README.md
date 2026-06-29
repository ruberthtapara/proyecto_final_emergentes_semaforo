# Dashboard Web de Control de Acceso Vehicular (React + Vite)

Este es un dashboard web interactivo y responsivo para el sistema de control de acceso vehicular de tu ESP32 con Node-RED.

---

## 🚀 Cómo ejecutarlo localmente (Modo Desarrollo)

1. Asegúrate de estar dentro de la carpeta:
   ```bash
   cd /home/ivan/Proyectos/control-acceso-vehicular/dashboard-web
   ```
2. Ejecuta el servidor de desarrollo local:
   ```bash
   npm run dev
   ```
3. Abre el enlace que aparece en la consola (por defecto: `http://localhost:5173`).
4. ¡El dashboard se iniciará en **Modo Demo** por defecto para que veas todas las estadísticas y la barra moviéndose! Para conectarte a tu Node-RED, ingresa la URL de tu API (ejemplo: `http://TU_IP_VPS:1880/api/datos`) en la barra de configuración superior y haz clic en **Conectar API**.

---

## 📦 Cómo compilar para producción

Para generar la versión de producción optimizada y lista para subir a tu VPS o hosting:

1. Ejecuta:
   ```bash
   npm run build
   ```
2. Esto creará una carpeta llamada **`dist`** con los archivos estáticos optimizados (`index.html`, JavaScript, CSS e imágenes).

---

## 🌐 Opciones para desplegarlo en Internet

### Opción A: Hosting Gratuito (Vercel o Netlify) - *Recomendado*
Puedes subir la carpeta `dist` de forma completamente gratuita a plataformas de hosting para frontend:
1. Crea una cuenta gratuita en [Vercel](https://vercel.com) o [Netlify](https://www.netlify.com).
2. Sube la carpeta `dist` arrastrándola en su interfaz web o conectando tu repositorio de GitHub.
3. Te darán un enlace público seguro (`https://tu-proyecto.vercel.app`) al que podrás acceder desde cualquier lugar del mundo.

### Opción B: Hospedarlo en tu VPS con Nginx
Si deseas alojar la página directamente en tu VPS Elastika junto a tu Node-RED:
1. Instala Nginx en tu VPS:
   ```bash
   sudo apt install nginx -y
   ```
2. Sube los archivos de la carpeta `dist` del proyecto al directorio `/var/www/html` de tu VPS.
3. Abre el puerto 80 del VPS en el firewall:
   ```bash
   sudo ufw allow 80/tcp
   ```
4. Podrás entrar a tu dashboard escribiendo directamente la dirección IP de tu VPS en el navegador: `http://TU_IP_DEL_VPS`.

---

## 📱 Soporte PWA (Instalar como App en el celular)

Este proyecto incluye un archivo `manifest.json` y un icono en `public/favicon.svg`. 
Cuando lo subas a producción y entres a la página web desde el navegador de tu celular (Android o iOS), te dará la opción de **"Agregar a pantalla de inicio"** (o "Instalar aplicación"). Esto creará un icono de acceso directo en tu celular y se ejecutará en pantalla completa como si fuera una aplicación nativa.
