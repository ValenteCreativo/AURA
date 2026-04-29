#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <time.h>
#include "DHT.h"

#define DHTPIN 4
#define DHTTYPE DHT11

const char* ssid = "your-wifi";
const char* password = "your-password";
const char* apiUrl = "https://aura-tau-five.vercel.app/api/sensor";
const char* nodeId = "AURA-001";

const unsigned long SEND_INTERVAL_MS = 15000;
unsigned long lastSentAt = 0;

DHT dht(DHTPIN, DHTTYPE);
WiFiClientSecure secureClient;

String deriveState(float temperature, float humidity) {
  if (temperature > 34 || (temperature > 30 && humidity < 30)) {
    return "alert";
  }

  if (humidity < 35 || temperature > 28) {
    return "attention";
  }

  return "balanced";
}

void ensureWifi() {
  if (WiFi.status() == WL_CONNECTED) {
    return;
  }

  Serial.println("WiFi disconnected. Reconnecting...");
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.println("Connecting to WiFi...");
  }

  Serial.println("WiFi connected!");
  Serial.print("ESP32 IP Address: ");
  Serial.println(WiFi.localIP());
}

void setup() {
  Serial.begin(115200);
  dht.begin();

  Serial.println("Booting AURA node...");
  WiFi.mode(WIFI_STA);
  ensureWifi();
  configTime(0, 0, "pool.ntp.org", "time.nist.gov");

  secureClient.setInsecure();
}

void loop() {
  ensureWifi();

  unsigned long now = millis();
  if (now - lastSentAt < SEND_INTERVAL_MS) {
    delay(200);
    return;
  }

  lastSentAt = now;

  float humidity = dht.readHumidity();
  float temperature = dht.readTemperature();

  if (isnan(humidity) || isnan(temperature)) {
    Serial.println("Failed to read from DHT11 sensor.");
    return;
  }

  String state = deriveState(temperature, humidity);
  unsigned long long timestamp = (unsigned long long)time(nullptr) * 1000ULL;

  if (timestamp < 100000) {
    timestamp = (unsigned long long)millis();
  }

  String payload = "{";
  payload += "\"nodeId\":\"" + String(nodeId) + "\",";
  payload += "\"temperature\":" + String(temperature, 1) + ",";
  payload += "\"humidity\":" + String(humidity, 0) + ",";
  payload += "\"state\":\"" + state + "\",";
  payload += "\"timestamp\":" + String((unsigned long long)timestamp);
  payload += "}";

  HTTPClient http;
  http.begin(secureClient, apiUrl);
  http.addHeader("Content-Type", "application/json");

  Serial.println("Sending reading to AURA API...");
  Serial.println(payload);

  int httpResponseCode = http.POST(payload);
  String responseBody = http.getString();

  Serial.print("HTTP response code: ");
  Serial.println(httpResponseCode);
  Serial.print("Response body: ");
  Serial.println(responseBody);

  http.end();
}
