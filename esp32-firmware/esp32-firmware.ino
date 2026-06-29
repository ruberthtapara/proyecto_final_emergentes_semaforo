#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <ESP32Servo.h>
#include <WiFi.h>
#include <PubSubClient.h>

// --- CONFIGURACIÓN DE RED ---
const char* ssid     = "TU_SSID_WIFI";       // <-- ESCRIBE AQUÍ EL NOMBRE DE TU RED WI-FI (SSID)
const char* password = "TU_PASSWORD_WIFI";   // <-- ESCRIBE AQUÍ LA CONTRASEÑA DE TU RED WI-FI

// --- CONFIGURACIÓN MQTT ---
const char* mqtt_server    = "TU_IP_DEL_VPS";       // <-- ESCRIBE AQUÍ LA IP PÚBLICA DE TU VPS O BROKER
const int   mqtt_port      = 1883;
const char* mqtt_user      = "TU_USUARIO_MQTT";     // <-- ESCRIBE AQUÍ EL USUARIO DEL BROKER
const char* mqtt_password  = "TU_PASSWORD_MQTT";    // <-- ESCRIBE AQUÍ LA CONTRASEÑA DEL BROKER
const char* mqtt_topic     = "totora";
const char* mqtt_sub_topic = "totora/comandos";

// --- PANTALLA LCD ---
LiquidCrystal_I2C lcd(0x27, 16, 2);

// --- PINES ---
const int pinRojo     = 33;
const int pinAmarillo = 25;
const int pinBuzzer   = 18;
const int pinVerde    = 26;
const int pinServo    = 27;

// --- SENSOR ULTRASÓNICO ---
const int pinTrig = 5;
const int pinEcho = 19;
const int DISTANCIA_DETECCION = 15;
const int DISTANCIA_LEJOS     = 25;

Servo barrera;
WiFiClient   espClient;
PubSubClient client(espClient);

// --- Conteo dinámico ---
int contadorAutos = 0;
bool carroEnZona = false;
unsigned long ultimoDecremento = 0;
unsigned long intervaloDecremento = 5000;

// --- CONTROL DE OVERRIDE MANUAL (NUEVO) ---
bool overrideActivo = false;
String comandoManual = "";

// -------------------------------------------------------------
void actualizarLCD(String linea1, String linea2) {
  lcd.clear();
  delay(50);
  lcd.setCursor(0, 0);
  lcd.print(linea1);
  lcd.setCursor(0, 1);
  lcd.print(linea2);
}

// --- FUNCIÓN CALLBACK MQTT: RECIBE COMANDOS DEL DASHBOARD ---
void callback(char* topic, byte* payload, unsigned int length) {
  Serial.print("📥 Mensaje MQTT recibido en [");
  Serial.print(topic);
  Serial.print("]: ");

  String mensaje = "";
  for (int i = 0; i < length; i++) {
    mensaje += (char)payload[i];
  }
  Serial.println(mensaje);

  // Procesar comandos del dashboard
  if (mensaje == "ABRIR") {
    overrideActivo = true;
    comandoManual = "ABRIR";
    Serial.println("🚨 OVERRIDE MANUAL: BARRERA ABIERTA");
  } else if (mensaje == "CERRAR") {
    overrideActivo = true;
    comandoManual = "CERRAR";
    Serial.println("🚨 OVERRIDE MANUAL: BARRERA CERRADA");
  } else if (mensaje == "AUTO") {
    overrideActivo = false;
    comandoManual = "";
    Serial.println("🔄 CONTROL AUTOMÁTICO RESTABLECIDO");
  }
}

void verificarConexiones() {
  if (WiFi.status() != WL_CONNECTED) return;

  if (!client.connected()) {
    Serial.print("Intentando conexión MQTT...");
    String clientId = "ESP32Semaforo-" + String(random(0xffff), HEX);

    if (client.connect(clientId.c_str(), mqtt_user, mqtt_password)) {
      Serial.println(" ✅ Conectado al broker MQTT!");
      client.subscribe(mqtt_sub_topic);
      Serial.println("📡 Suscrito al tema: " + String(mqtt_sub_topic));
    } else {
      Serial.print(" ❌ Falló MQTT, código: ");
      Serial.println(client.state());
    }
  }
}

void enviarMensajeMQTT(String mensaje) {
  if (client.connected()) {
    client.publish(mqtt_topic, mensaje.c_str());
    Serial.println("📤 Publicado: " + mensaje);
  } else {
    Serial.println("⚠️ Sin conexión MQTT — mensaje no enviado");
  }
}

// -------------------------------------------------------------
long medirDistanciaRaw() {
  digitalWrite(pinTrig, LOW);
  delayMicroseconds(2);
  digitalWrite(pinTrig, HIGH);
  delayMicroseconds(10);
  digitalWrite(pinTrig, LOW);

  long duracion = pulseIn(pinEcho, HIGH, 30000);
  if (duracion == 0) return -1;

  return duracion * 0.034 / 2;
}

long medirDistancia() {
  long suma = 0;
  int validas = 0;

  for (int i = 0; i < 3; i++) {
    long d = medirDistanciaRaw();
    if (d > 0 && d < 400) {
      suma += d;
      validas++;
    }
    delay(10);
  }

  if (validas == 0) return -1;
  return suma / validas;
}

void apagarLuces() {
  digitalWrite(pinRojo, LOW);
  digitalWrite(pinAmarillo, LOW);
  digitalWrite(pinVerde, LOW);
}

unsigned long calcularCooldown(int autos) {
  if (autos <= 0)  return 5000;
  if (autos <= 3)  return 10000;
  if (autos <= 5)  return 20000;
  if (autos <= 10) return 30000;
  return 2000;
}

void procesarSensor(long distancia) {
  if (distancia <= 0) return;

  if (distancia < DISTANCIA_DETECCION) {
    if (!carroEnZona) {
      carroEnZona = true;
      contadorAutos++;

      Serial.println("🚗 Carro NUEVO #" + String(contadorAutos) + " a " + String(distancia) + " cm");

      apagarLuces();
      digitalWrite(pinRojo, HIGH);
      barrera.write(0);

      tone(pinBuzzer, 1000);
      actualizarLCD("CARRO #" + String(contadorAutos), "DIST: " + String(distancia) + " cm");
      enviarMensajeMQTT("ALERTA: Carro #" + String(contadorAutos) + " detectado a " + String(distancia) + " cm");

      delay(500);
      noTone(pinBuzzer);
    }
  } else if (distancia > DISTANCIA_LEJOS) {
    carroEnZona = false;
  }
}

void actualizarDecaimientoContador() {
  if (contadorAutos <= 0) return;

  unsigned long ahora = millis();
  if (ahora - ultimoDecremento >= intervaloDecremento) {
    contadorAutos--;
    ultimoDecremento = ahora;
    Serial.println("⬇️ Contador decae a: " + String(contadorAutos));
  }
}

// --- FUNCIÓN DE ESPERA NO BLOQUEANTE (MANTIENE VIVO EL MQTT) ---
void esperarYProcesar(unsigned long ms) {
  unsigned long inicio = millis();
  while (millis() - inicio < ms) {
    long d = medirDistancia();
    procesarSensor(d);
    actualizarDecaimientoContador();

    verificarConexiones();
    if (client.connected()) {
      client.loop(); // Llama continuamente a la librería MQTT
    }

    if (overrideActivo) {
      break; // Aborta la espera inmediatamente si mandas comando manual
    }
    delay(50);
  }
}

void setup() {
  Serial.begin(115200);
  delay(500);

  pinMode(pinRojo,     OUTPUT);
  pinMode(pinAmarillo, OUTPUT);
  pinMode(pinVerde,    OUTPUT);
  pinMode(pinBuzzer,   OUTPUT);

  pinMode(pinTrig, OUTPUT);
  pinMode(pinEcho, INPUT);

  apagarLuces();

  Wire.begin();
  Wire.setClock(10000);
  lcd.init();
  lcd.backlight();
  lcd.clear();

  actualizarLCD("CONECTANDO WIFI", "...");
  WiFi.begin(ssid, password);

  int intentos = 0;
  while (WiFi.status() != WL_CONNECTED && intentos < 20) {
    delay(500);
    Serial.print(".");
    intentos++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ WiFi conectado — IP: " + WiFi.localIP().toString());
    client.setServer(mqtt_server, mqtt_port);
    client.setCallback(callback); // Vincula tu callback
    actualizarLCD("WIFI CONECTADO", "CONFIGURANDO...");
  } else {
    Serial.println("\n❌ No se conectó al WiFi");
    actualizarLCD("WIFI ERROR", "MODO LOCAL");
  }
  delay(1000);

  verificarConexiones();

  ESP32PWM::allocateTimer(0);
  ESP32PWM::allocateTimer(1);
  barrera.setPeriodHertz(50);
  barrera.attach(pinServo, 500, 2400);
  barrera.write(90); // Abierta al inicio
  delay(500);

  ultimoDecremento = millis();
  actualizarLCD("SEMAFORO", "INTELIGENTE");
  delay(1500);
}

// -------------------------------------------------------------
void loop() {
  verificarConexiones();
  if (client.connected()) client.loop();

  // --- SI EL DASHBOARD MANDA COMANDO MANUAL ---
  while (overrideActivo) {
    verificarConexiones();
    if (client.connected()) client.loop();

    if (comandoManual == "ABRIR") {
      apagarLuces();
      digitalWrite(pinVerde, HIGH);
      barrera.write(90);
      actualizarLCD("CONTROL MANUAL", "BARRERA: ABIERTA");
    } else if (comandoManual == "CERRAR") {
      apagarLuces();
      digitalWrite(pinRojo, HIGH);
      barrera.write(0);
      actualizarLCD("CONTROL MANUAL", "BARRERA: CERRADA");
    }

    long d = medirDistancia();
    if (d > 0) {
      procesarSensor(d);
    }
    actualizarDecaimientoContador();
    delay(100);
  }

  // --- MODO AUTOMÁTICO SEMÁFORO ---
  contadorAutos = 0;
  Serial.println("🔄 Contador reiniciado a 0 (inicio de VERDE)");

  apagarLuces();
  digitalWrite(pinVerde, HIGH);
  barrera.write(90);
  actualizarLCD("LUZ: VERDE", "PASO LIBRE");
  enviarMensajeMQTT("VERDE: Paso libre, barrera abierta");

  // Espera no bloqueante de 5 segundos
  esperarYProcesar(5000);
  if (overrideActivo) return;
  digitalWrite(pinVerde, LOW);

  // Amarillo bajando (transición)
  actualizarLCD("LUZ: AMARILLO", "BAJANDO BARRERA");
  enviarMensajeMQTT("AMARILLO: Bajando barrera lentamente");

  for (int pos = 90; pos >= 0; pos -= 2) {
    if (overrideActivo) break;
    barrera.write(pos);

    long d = medirDistancia();
    procesarSensor(d);
    actualizarDecaimientoContador();

    verificarConexiones();
    if (client.connected()) client.loop(); // Sigue oyendo el MQTT mientras se mueve la barra

    digitalWrite(pinAmarillo, HIGH);
    delay(20);
    digitalWrite(pinAmarillo, LOW);
    delay(20);
  }
  if (overrideActivo) return;

  // Rojo
  digitalWrite(pinRojo, HIGH);
  barrera.write(0);
  actualizarLCD("LUZ: ROJO", "ALTO - NO PASAR");
  enviarMensajeMQTT("ROJO: Alto, barrera cerrada");

  unsigned long cooldown = calcularCooldown(contadorAutos);
  intervaloDecremento = cooldown;

  Serial.println("⏱️ Cooldown ROJO: " + String(cooldown) + "ms (autos activos: " + String(contadorAutos) + ")");
  actualizarLCD("ROJO - AUTOS:" + String(contadorAutos), "ESPERA: " + String(cooldown/1000) + "s");
  enviarMensajeMQTT("ROJO: Cooldown " + String(cooldown/1000) + "s (autos activos: " + String(contadorAutos) + ")");

  // Espera no bloqueante durante el tiempo de cooldown
  esperarYProcesar(cooldown);
  if (overrideActivo) return;
  digitalWrite(pinRojo, LOW);

  // Amarillo subiendo
  actualizarLCD("LUZ: AMARILLO", "SUBIENDO BARRERA");
  enviarMensajeMQTT("AMARILLO: Subiendo barrera lentamente");

  for (int pos = 0; pos <= 90; pos += 2) {
    if (overrideActivo) break;
    barrera.write(pos);

    actualizarDecaimientoContador();
    verificarConexiones();
    if (client.connected()) client.loop();

    digitalWrite(pinAmarillo, HIGH);
    delay(20);
    digitalWrite(pinAmarillo, LOW);
    delay(20);
  }
}
