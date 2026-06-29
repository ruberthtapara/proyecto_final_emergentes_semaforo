# Guía de Configuración del Broker MQTT (Mosquitto)

Este directorio contiene las especificaciones y archivos necesarios para la configuración del Broker MQTT, el cual es el núcleo de la mensajería asíncrona entre el microcontrolador ESP32 y el servidor backend Node-RED.

---

## 📡 Parámetros de Red y Conexión (Producción en VPS)

En el informe técnico del proyecto, se estableció la conexión con el broker Mosquitto en el servidor en la nube con los siguientes datos:
* **Host/IP del Broker:** `TU_IP_DEL_VPS`
* **Puerto Estándar:** `1883` (TCP no cifrado)
* **Usuario:** `TU_USUARIO_MQTT`
* **Contraseña:** `TU_PASSWORD_MQTT`
* **Protocolo:** MQTT v3.1.1 (con empaquetado ligero)

---

## 🗺️ Topología de Tópicos y Canales

El sistema utiliza comunicación bidireccional estructurada en dos tópicos clave:

### 1. Canal de Telemetría y Eventos (`totora`)
* **Dirección:** ESP32 $\rightarrow$ Broker $\rightarrow$ Node-RED / Dashboard.
* **QoS (Quality of Service):** QoS 0 (Entrega rápida al vuelo, idóneo para red estable y telemetría de alta frecuencia).
* **Payload Esperado (Formato JSON):**
  ```json
  {
    "evento": "deteccion",
    "distancia": 12,
    "estado_barrera": "ABIERTA",
    "vehiculos_hoy": 3
  }
  ```
* **Eventos Soportados:**
  * `"reinicio"`: Al arrancar el ESP32.
  * `"deteccion"`: Al identificar un vehículo cerca ($\le 15$ cm).
  * `"cierre"`: Al despejarse la entrada ($> 25$ cm).
  * `"comando_abrir"`: Confirmación de orden remota ABRIR.
  * `"comando_cerrar"`: Confirmación de orden remota CERRAR.

### 2. Canal de Control Remoto (`totora/comandos`)
* **Dirección:** Dashboard Web / Node-RED $\rightarrow$ Broker $\rightarrow$ ESP32.
* **QoS:** QoS 0.
* **Mensajes de Texto Plano Soportados:**
  * `ABRIR`: Fuerza la apertura física de la barrera (servo a 90° y semáforo tricolor encendido) desactivando la lógica automática.
  * `CERRAR`: Fuerza el cierre físico (servo a 0° y semáforo rojo encendido) desactivando la lógica automática.
  * `AUTO`: Restablece el control dinámico al sensor ultrasónico local.

---

## ⚙️ Uso de Archivo de Configuración Local

Si decides probar o desplegar el Broker Mosquitto localmente en lugar de usar la IP del VPS:
1. Instala Eclipse Mosquitto en tu máquina.
2. Reemplaza el archivo por defecto de configuración con el archivo [mosquitto.conf](file:///C:/control-acceso-vehicular/mqtt/mosquitto.conf).
3. Inicia el servicio desde tu consola:
   ```bash
   mosquitto -c mqtt/mosquitto.conf
   ```
