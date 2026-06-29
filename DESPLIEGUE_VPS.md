# Guía de Despliegue en un Servidor VPS (Elastika.pe)

Un VPS (Servidor Privado Virtual) te permitirá tener tu servidor Node-RED encendido las **24 horas del día, los 7 días de la semana** con una dirección IP pública. Esto significa que tu ESP32 podrá reportar datos desde cualquier lugar con Wi-Fi, y tú podrás abrir tu Dashboard desde tu celular en cualquier lugar del mundo.

---

## 🛠️ Paso 1: Conectarte a tu VPS por SSH

Cuando compraste el VPS en Elastika.pe, te debieron dar:
* Una **Dirección IP** (ejemplo: `190.12.XX.XX`)
* Un **Usuario** (normalmente es `root`)
* Una **Contraseña**

Abre una terminal en tu computadora (en Linux/Mac) o usa la consola de comandos de Windows (CMD) y conéctate ejecutando:
```bash
ssh root@TU_IP_DEL_VPS
```
*(Te pedirá la contraseña, escríbela y presiona Enter).*

---

## 📦 Paso 2: Instalar Node.js y Node-RED en el VPS

Una vez dentro del VPS, ejecuta los siguientes comandos en orden para instalar todo lo necesario:

```bash
# 1. Actualizar el sistema
sudo apt update && sudo apt upgrade -y

# 2. Instalar Node.js (Versión estable 20)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. Comprobar que se instaló correctamente
node -v
npm -v

# 4. Instalar Node-RED globalmente en el sistema
sudo npm install -g --unsafe-perm node-red
```

---

## 🔄 Paso 3: Configurar Node-RED para que corra en segundo plano

Para evitar que Node-RED se apague al cerrar tu ventana de SSH, usaremos `PM2`, un gestor de procesos:

```bash
# 1. Instalar PM2 de forma global
sudo npm install -g pm2

# 2. Iniciar Node-RED bajo el control de PM2
pm2 start $(which node-red) --node-args="--max-old-space-size=512" -- -v

# 3. Guardar el estado para que se inicie automáticamente si el VPS se reinicia
pm2 save
pm2 startup
```
*(Copia y ejecuta el comando que PM2 te imprima en pantalla al final para habilitar el inicio automático).*

---

## 🛡️ Paso 4: Abrir el puerto 1880 en el Firewall del VPS

Por defecto, los VPS vienen bloqueados. Debemos abrir el puerto de Node-RED (`1880`):

```bash
# Habilitar el cortafuegos permitiendo SSH y Node-RED
sudo ufw allow ssh
sudo ufw allow 1880/tcp
sudo ufw enable
```
*(Presiona `y` y luego Enter para confirmar).*

Ahora puedes abrir tu navegador y entrar a: **`http://TU_IP_DEL_VPS:1880`** ¡y verás tu Node-RED funcionando en la nube!

---

## 🖥️ Paso 5: Desplegar el Dashboard sin depender de archivos locales

En lugar de leer el archivo `dashboard.html` desde el disco del servidor (lo cual requeriría subir el archivo por FTP al VPS), es mucho más fácil usar un nodo de tipo **`template`** que tenga todo el código HTML/CSS/JS pegado por dentro.

### Flujo de Node-RED Optimizado para VPS (Importación Directa):

1. Ve a tu Node-RED del VPS (`http://TU_IP_DEL_VPS:1880`).
2. Haz clic en **Import** en el menú.
3. Pega el JSON que está a continuación. 

*(Este JSON incluye los endpoints `/api/datos`, `/api/evento` y el `/dashboard` sirviendo directamente el código del dashboard embebido, por lo que no necesitas configurar nada en el disco del VPS).*

```json
[
    {
        "id": "flow_vps_control",
        "type": "tab",
        "label": "Control Acceso Vehicular VPS",
        "disabled": false,
        "info": ""
    },
    {
        "id": "http_dashboard_in_vps",
        "type": "http in",
        "z": "flow_vps_control",
        "name": "GET /dashboard",
        "url": "/dashboard",
        "method": "get",
        "upload": false,
        "swaggerDoc": "",
        "x": 120,
        "y": 100,
        "wires": [
            [
                "template_dashboard_code"
            ]
        ]
    },
    {
        "id": "template_dashboard_code",
        "type": "template",
        "z": "flow_vps_control",
        "name": "HTML Dashboard Embebido",
        "field": "payload",
        "fieldType": "msg",
        "format": "handlebars",
        "syntax": "mustache",
        "template": "<!-- PEGA AQUÍ TODO EL CONTENIDO DEL ARCHIVO dashboard.html -->",
        "output": "str",
        "x": 360,
        "y": 100,
        "wires": [
            [
                "http_dashboard_res_vps"
            ]
        ]
    },
    {
        "id": "http_dashboard_res_vps",
        "type": "http response",
        "z": "flow_vps_control",
        "name": "Responder HTML",
        "statusCode": "200",
        "headers": {
            "Content-Type": "text/html; charset=utf-8"
        },
        "x": 590,
        "y": 100,
        "wires": []
    },
    {
        "id": "http_api_datos_in_vps",
        "type": "http in",
        "z": "flow_vps_control",
        "name": "GET /api/datos",
        "url": "/api/datos",
        "method": "get",
        "upload": false,
        "swaggerDoc": "",
        "x": 120,
        "y": 180,
        "wires": [
            [
                "get_stats_vps"
            ]
        ]
    },
    {
        "id": "get_stats_vps",
        "type": "function",
        "z": "flow_vps_control",
        "name": "Obtener Stats",
        "func": "let stats = global.get(\"vehiculo_stats\") || {\n    todayCount: 0,\n    totalCount: 0,\n    gateState: \"CERRADA\",\n    lastDistance: 150,\n    hourlyTraffic: Array(12).fill(0),\n    logs: []\n};\n\nmsg.payload = stats;\nreturn msg;",
        "outputs": 1,
        "noerr": 0,
        "initialize": "",
        "finalize": "",
        "libs": [],
        "x": 340,
        "y": 180,
        "wires": [
            [
                "http_api_res_vps"
            ]
        ]
    },
    {
        "id": "http_api_res_vps",
        "type": "http response",
        "z": "flow_vps_control",
        "name": "Responder JSON",
        "statusCode": "200",
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
        },
        "x": 590,
        "y": 180,
        "wires": []
    },
    {
        "id": "http_post_evento_vps",
        "type": "http in",
        "z": "flow_vps_control",
        "name": "POST /api/evento",
        "url": "/api/evento",
        "method": "post",
        "upload": false,
        "swaggerDoc": "",
        "x": 130,
        "y": 260,
        "wires": [
            [
                "process_event_vps"
            ]
        ]
    },
    {
        "id": "process_event_vps",
        "type": "function",
        "z": "flow_vps_control",
        "name": "Procesar Evento ESP32",
        "func": "let stats = global.get(\"vehiculo_stats\") || {\n    todayCount: 0,\n    totalCount: 0,\n    gateState: \"CERRADA\",\n    lastDistance: 150,\n    hourlyTraffic: Array(12).fill(0),\n    logs: []\n};\n\nlet payload = msg.payload;\nlet distancia = parseInt(payload.distancia) || 150;\nlet estado = payload.estado_barrera || \"CERRADA\";\nlet evento = payload.evento || \"lectura\";\n\nstats.lastDistance = distancia;\nstats.gateState = estado;\n\nlet now = new Date();\n// Ajustar formato de hora local para los logs\nlet timeStr = now.toLocaleDateString() + \" \" + now.toLocaleTimeString();\n\nif (evento === \"deteccion\") {\n    stats.todayCount += 1;\n    stats.totalCount += 1;\n    stats.hourlyTraffic[11] += 1;\n    stats.logs.push({\n        time: timeStr,\n        event: \"Vehículo Detectado\",\n        distance: distancia + \" cm\",\n        state: \"ABIERTA\"\n    });\n} else if (evento === \"cierre\") {\n    stats.logs.push({\n        time: timeStr,\n        event: \"Barrera Cerrada\",\n        distance: distancia + \" cm\",\n        state: \"CERRADA\"\n    });\n}\n\nif (stats.logs.length > 50) {\n    stats.logs.shift();\n}\n\nglobal.set(\"vehiculo_stats\", stats);\n\nmsg.payload = { status: \"success\", message: \"Datos actualizados en VPS\" };\nreturn msg;",
        "outputs": 1,
        "noerr": 0,
        "initialize": "",
        "finalize": "",
        "libs": [],
        "x": 370,
        "y": 260,
        "wires": [
            [
                "http_post_res_vps"
            ]
        ]
    },
    {
        "id": "http_post_res_vps",
        "type": "http response",
        "z": "flow_vps_control",
        "name": "OK 200",
        "statusCode": "200",
        "headers": {},
        "x": 580,
        "y": 260,
        "wires": []
    }
]
```

### 💡 Nota importante:
En el nodo **`HTML Dashboard Embebido`**, haz doble clic y en el cuadro de texto del código reemplaza la línea `<!-- PEGA AQUÍ TODO EL CONTENIDO DEL ARCHIVO dashboard.html -->` con todo el código del archivo **[dashboard.html](file:///home/ivan/Proyectos/control-acceso-vehicular/dashboard.html)**. ¡Haz clic en **Deploy** y tu dashboard estará en la nube listo en `http://TU_IP_DEL_VPS:1880/dashboard`!

---

## 📡 Paso 6: Configurar el ESP32 con la nueva IP

En el código del ESP32, cambia la IP local por la IP de tu VPS:
```cpp
// Cambia esto en el archivo de tu ESP32:
const char* serverUrl = "http://TU_IP_DEL_VPS:1880/api/evento";
```
¡Y listo! Tu ESP32 mandará los datos a internet y el dashboard los graficará al instante.
