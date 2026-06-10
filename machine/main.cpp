#include <Arduino.h>
#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>
#include <PubSubClient.h>
#include <Servo.h>
#include <LittleFS.h>
#include <ArduinoJson.h>
#include <time.h>
#include <bearssl/bearssl.h>
#include <WiFiClientSecureBearSSL.h>

// ======================================================
// PET FEEDER MACHINE FIRMWARE — V4
// Target: ESP8266 / NodeMCU / Arduino framework
//
// Spec features:
// - Config version 3
// - configId / configVersion / issuedAt / expiresAt
// - HMAC-SHA256 signature verify
// - Upload config file without extension
// - Preview first, Apply later
// - Apply requires setup PIN
// - active / pending / backup config
// - Wi-Fi + Time + MQTT test before promoting active config
// - MQTT TCP or TLS using mqttUseTls
// - keepSetupApEnabled support
// - feed_once(openDurationMs)
// - local feeding schedule
// - telemetry/state/event/ack
// ======================================================

// ================= FACTORY CONFIG =================
// IMPORTANT:
// These values must be unique per physical device in production.
// Server must store the same device_secret for this machine.
const char *FACTORY_MACHINE_CODE = "PF-ESP8266-001";
const char *DEVICE_SECRET = "CHANGE_ME_DEVICE_SECRET";

// ================= HARDWARE CONFIG =================
const uint8_t FEEDER_PIN = D5;        // GPIO14
const uint8_t LED_PIN = LED_BUILTIN;  // active LOW
const uint8_t SETUP_BUTTON_PIN = D3;  // optional; GPIO0, use carefully

const uint8_t SERVO_CLOSE_ANGLE = 0;
const uint8_t SERVO_OPEN_ANGLE = 90;

// ================= SETUP AP =================
const char *AP_SSID_DEFAULT = "Feeder-ESP8266";
const char *AP_PASS_DEFAULT = "12345678"; // >= 8 chars
const uint32_t TEMP_AP_ENABLE_MS = 10UL * 60UL * 1000UL;

// ================= FILES =================
const char *CONFIG_ACTIVE_PATH = "/config.active.json";
const char *CONFIG_PENDING_PATH = "/config.pending.json";
const char *CONFIG_BACKUP_PATH = "/config.backup.json";
const char *SETUP_PIN_PATH = "/setup_pin.json";
const char *BOOT_STATE_PATH = "/boot_state.json";

// ================= LIMITS =================
const size_t MAX_CONFIG_UPLOAD_BYTES = 8192;
const uint8_t MAX_SCHEDULE_ITEMS = 8;

const uint32_t MIN_OPEN_DURATION_MS = 100;
const uint32_t MAX_OPEN_DURATION_MS = 600000;

const uint32_t WIFI_CONNECT_TIMEOUT_MS = 15000;
const uint32_t MQTT_CONNECT_TIMEOUT_MS = 10000;
const uint32_t MQTT_RECONNECT_INTERVAL_MS = 5000;
const uint32_t TELEMETRY_INTERVAL_MS = 15000;
const uint32_t SCHEDULE_CHECK_INTERVAL_MS = 3000;
const uint32_t TIME_RESYNC_INTERVAL_MS = 6UL * 60UL * 60UL * 1000UL;

const uint8_t MAX_PIN_FAIL_BEFORE_LOCK = 5;
const uint32_t PIN_LOCK_SHORT_MS = 60UL * 1000UL;
const uint32_t PIN_LOCK_LONG_MS = 5UL * 60UL * 1000UL;

const char *DEFAULT_SETUP_PIN = "123456";

// ================= GLOBAL OBJECTS =================
ESP8266WebServer server(80);

WiFiClient wifiClientPlain;
BearSSL::WiFiClientSecure wifiClientSecure;
PubSubClient mqttPlain(wifiClientPlain);
PubSubClient mqttSecure(wifiClientSecure);
PubSubClient *mqttClient = &mqttPlain;

Servo feederServo;

// ================= DATA STRUCTURES =================
struct FeedingScheduleItem {
  String id;
  uint8_t hour = 0;
  uint8_t minute = 0;
  uint32_t openDurationMs = 1200;
  bool enabled = true;
  int lastRunYDay = -1;
};

struct AppConfig {
  uint16_t version = 3;
  String configId = "";
  uint32_t configVersion = 0;
  uint32_t issuedAt = 0;
  uint32_t expiresAt = 0;

  String machineCode = FACTORY_MACHINE_CODE;
  String deviceId = "feeder001";

  String wifiSsid = "";
  String wifiPass = "";

  String mqttHost = "";
  uint16_t mqttPort = 1883;
  bool mqttUseTls = false;
  String mqttUser = "";
  String mqttPass = "";

  String timezone = "Asia/Bangkok";
  int timezoneOffsetSec = 25200;

  bool keepSetupApEnabled = true;

  bool scheduleEnabled = false;
  uint8_t scheduleCount = 0;
  FeedingScheduleItem schedules[MAX_SCHEDULE_ITEMS];

  String providerName = "";
  String providerBrand = "";
  String providerWebsite = "";
  String providerContact = "";
  String providerNote = "";

  String signature = "";
};

struct SetupPinData {
  bool changed = false;
  String salt = "";
  String hash = "";
  uint32_t updatedAt = 0;
};

struct BootState {
  String activeConfigId = "";
  uint32_t activeConfigVersion = 0;
  uint8_t bootFailCount = 0;
  uint32_t lastBootAt = 0;
};

AppConfig activeConfig;
AppConfig previewConfig;
bool hasActiveConfig = false;
bool hasPreviewConfig = false;

String previewErrorCode = "";
String previewErrorMessage = "";
bool previewExpiryWarning = false;

SetupPinData setupPin;
BootState bootState;

// ================= RUNTIME STATE =================
bool isFeeding = false;
bool doorOpen = false;
String feederMode = "idle";

unsigned long feedingEndAt = 0;
String currentFeedSource = "";
String currentFeedRequestId = "";
String currentFeedScheduleId = "";
uint32_t currentFeedDurationMs = 0;

bool timeSynced = false;
unsigned long lastTimeSyncAttemptAt = 0;
unsigned long lastMqttReconnectAttempt = 0;
unsigned long lastTelemetryAt = 0;
unsigned long lastScheduleCheckAt = 0;

bool apEnabled = false;
bool tempApEnabled = false;
unsigned long tempApDisableAt = 0;

uint8_t pinFailCount = 0;
unsigned long pinLockedUntil = 0;

String topicCmd;
String topicState;
String topicOnline;
String topicTelemetry;
String topicEvent;
String topicAck;

String uploadBuffer;
bool uploadTooLarge = false;

// ================= BASIC UTILS =================
String esc(const String &in) {
  String out;
  out.reserve(in.length() + 8);
  for (size_t i = 0; i < in.length(); i++) {
    char c = in[i];
    if (c == '&') out += "&amp;";
    else if (c == '<') out += "&lt;";
    else if (c == '>') out += "&gt;";
    else if (c == '"') out += "&quot;";
    else if (c == '\'') out += "&#39;";
    else out += c;
  }
  return out;
}

String twoDigits(int v) {
  return v < 10 ? "0" + String(v) : String(v);
}

String scheduleTimeString(const FeedingScheduleItem &item) {
  return twoDigits(item.hour) + ":" + twoDigits(item.minute);
}

uint32_t nowEpoch() {
  time_t now = time(nullptr);
  if (now < 100000) return 0;
  return (uint32_t)now;
}

bool isTimeValid() {
  return nowEpoch() > 100000;
}

bool isDigitChar(char c) {
  return c >= '0' && c <= '9';
}

bool validateOpenDuration(uint32_t durationMs) {
  return durationMs >= MIN_OPEN_DURATION_MS && durationMs <= MAX_OPEN_DURATION_MS;
}

void buildTopics(const String &deviceId) {
  String id = deviceId.length() ? deviceId : "feeder001";
  topicCmd = "feeder/" + id + "/cmd";
  topicState = "feeder/" + id + "/state";
  topicOnline = "feeder/" + id + "/online";
  topicTelemetry = "feeder/" + id + "/telemetry";
  topicEvent = "feeder/" + id + "/event";
  topicAck = "feeder/" + id + "/ack";
}

bool parseHHmm(const String &s, uint8_t &hour, uint8_t &minute) {
  if (s.length() != 5) return false;
  if (!isDigitChar(s[0]) || !isDigitChar(s[1])) return false;
  if (s[2] != ':') return false;
  if (!isDigitChar(s[3]) || !isDigitChar(s[4])) return false;

  int h = (s[0] - '0') * 10 + (s[1] - '0');
  int m = (s[3] - '0') * 10 + (s[4] - '0');

  if (h < 0 || h > 23) return false;
  if (m < 0 || m > 59) return false;

  hour = (uint8_t)h;
  minute = (uint8_t)m;
  return true;
}

// ================= CRYPTO =================
String bytesToHex(const uint8_t *bytes, size_t len) {
  const char *hex = "0123456789abcdef";
  String out;
  out.reserve(len * 2);
  for (size_t i = 0; i < len; i++) {
    out += hex[(bytes[i] >> 4) & 0x0F];
    out += hex[bytes[i] & 0x0F];
  }
  return out;
}

String sha256Hex(const String &message) {
  br_sha256_context ctx;
  uint8_t out[32];

  br_sha256_init(&ctx);
  br_sha256_update(&ctx, message.c_str(), message.length());
  br_sha256_out(&ctx, out);

  return bytesToHex(out, sizeof(out));
}

String hmacSha256Hex(const String &key, const String &message) {
  br_hmac_key_context kc;
  br_hmac_context ctx;
  uint8_t out[32];

  br_hmac_key_init(&kc, &br_sha256_vtable, key.c_str(), key.length());
  br_hmac_init(&ctx, &kc, 0);
  br_hmac_update(&ctx, message.c_str(), message.length());
  br_hmac_out(&ctx, out);

  return bytesToHex(out, sizeof(out));
}

bool constantTimeEquals(const String &a, const String &b) {
  if (a.length() != b.length()) return false;
  uint8_t diff = 0;
  for (size_t i = 0; i < a.length(); i++) {
    diff |= (uint8_t)a[i] ^ (uint8_t)b[i];
  }
  return diff == 0;
}

// ================= PIN =================
String makeDefaultSalt() {
  return "salt_" + String(ESP.getChipId(), HEX) + "_" + String(ESP.getFlashChipId(), HEX);
}

bool isPinFormatValid(const String &pin) {
  if (pin.length() < 6 || pin.length() > 12) return false;
  for (size_t i = 0; i < pin.length(); i++) {
    if (!isDigitChar(pin[i])) return false;
  }
  return true;
}

String hashPin(const String &pin, const String &salt) {
  return sha256Hex(pin + ":" + salt);
}

bool saveSetupPin() {
  DynamicJsonDocument doc(512);
  doc["setupPinChanged"] = setupPin.changed;
  doc["setupPinSalt"] = setupPin.salt;
  doc["setupPinHash"] = setupPin.hash;
  doc["setupPinUpdatedAt"] = setupPin.updatedAt;

  File f = LittleFS.open(SETUP_PIN_PATH, "w");
  if (!f) return false;
  serializeJsonPretty(doc, f);
  f.close();
  return true;
}

void initDefaultSetupPin() {
  setupPin.changed = false;
  setupPin.salt = makeDefaultSalt();
  setupPin.hash = hashPin(DEFAULT_SETUP_PIN, setupPin.salt);
  setupPin.updatedAt = nowEpoch();
  saveSetupPin();
}

bool loadSetupPin() {
  if (!LittleFS.exists(SETUP_PIN_PATH)) {
    initDefaultSetupPin();
    return true;
  }

  File f = LittleFS.open(SETUP_PIN_PATH, "r");
  if (!f) {
    initDefaultSetupPin();
    return false;
  }

  DynamicJsonDocument doc(512);
  DeserializationError err = deserializeJson(doc, f);
  f.close();

  if (err) {
    initDefaultSetupPin();
    return false;
  }

  setupPin.changed = doc["setupPinChanged"] | false;
  setupPin.salt = (const char *)(doc["setupPinSalt"] | "");
  setupPin.hash = (const char *)(doc["setupPinHash"] | "");
  setupPin.updatedAt = doc["setupPinUpdatedAt"] | 0;

  if (setupPin.salt.length() == 0 || setupPin.hash.length() == 0) {
    initDefaultSetupPin();
  }

  return true;
}

bool isPinLocked() {
  if (pinLockedUntil == 0) return false;
  if ((long)(millis() - pinLockedUntil) >= 0) {
    pinLockedUntil = 0;
    return false;
  }
  return true;
}

bool verifyPin(const String &pin) {
  if (isPinLocked()) return false;

  String computed = hashPin(pin, setupPin.salt);
  computed.toLowerCase();
  String stored = setupPin.hash;
  stored.toLowerCase();

  bool ok = constantTimeEquals(computed, stored);
  if (ok) {
    pinFailCount = 0;
    pinLockedUntil = 0;
    return true;
  }

  pinFailCount++;
  if (pinFailCount >= MAX_PIN_FAIL_BEFORE_LOCK) {
    pinLockedUntil = millis() + (pinFailCount >= MAX_PIN_FAIL_BEFORE_LOCK * 2 ? PIN_LOCK_LONG_MS : PIN_LOCK_SHORT_MS);
  }

  return false;
}

bool changePin(const String &oldPin, const String &newPin, String &errorCode, String &errorMessage) {
  if (!isPinFormatValid(newPin)) {
    errorCode = "invalid_new_pin";
    errorMessage = "PIN mới phải gồm 6-12 chữ số.";
    return false;
  }

  if (isPinLocked()) {
    errorCode = "pin_locked";
    errorMessage = "Sai PIN quá nhiều lần. Vui lòng thử lại sau.";
    return false;
  }

  if (!verifyPin(oldPin)) {
    errorCode = "invalid_pin";
    errorMessage = "PIN cũ không đúng.";
    return false;
  }

  setupPin.changed = true;
  setupPin.salt = makeDefaultSalt() + "_" + String(millis());
  setupPin.hash = hashPin(newPin, setupPin.salt);
  setupPin.updatedAt = nowEpoch();
  saveSetupPin();

  errorCode = "";
  errorMessage = "";
  return true;
}

void resetPinToDefault() {
  initDefaultSetupPin();
  pinFailCount = 0;
  pinLockedUntil = 0;
  Serial.println("[PIN] Reset to default.");
}

// ================= FILE UTILS =================
bool readFileString(const char *path, String &out) {
  if (!LittleFS.exists(path)) return false;
  File f = LittleFS.open(path, "r");
  if (!f) return false;
  out = f.readString();
  f.close();
  return true;
}

bool writeFileString(const char *path, const String &data) {
  File f = LittleFS.open(path, "w");
  if (!f) return false;
  f.print(data);
  f.close();
  return true;
}

bool copyFile(const char *from, const char *to) {
  String data;
  if (!readFileString(from, data)) return false;
  return writeFileString(to, data);
}

void deleteFileIfExists(const char *path) {
  if (LittleFS.exists(path)) LittleFS.remove(path);
}

// ================= CONFIG SIGNING =================
String buildSigningPayload(const AppConfig &c) {
  String p;
  p.reserve(3072);

  p += "version=" + String(c.version) + "\n";
  p += "configId=" + c.configId + "\n";
  p += "configVersion=" + String(c.configVersion) + "\n";
  p += "issuedAt=" + String(c.issuedAt) + "\n";
  p += "expiresAt=" + String(c.expiresAt) + "\n";
  p += "machineCode=" + c.machineCode + "\n";
  p += "deviceId=" + c.deviceId + "\n";
  p += "wifiSsid=" + c.wifiSsid + "\n";
  p += "wifiPass=" + c.wifiPass + "\n";
  p += "mqttHost=" + c.mqttHost + "\n";
  p += "mqttPort=" + String(c.mqttPort) + "\n";
  p += "mqttUseTls=" + String(c.mqttUseTls ? "true" : "false") + "\n";
  p += "mqttUser=" + c.mqttUser + "\n";
  p += "mqttPass=" + c.mqttPass + "\n";
  p += "timezone=" + c.timezone + "\n";
  p += "timezoneOffsetSec=" + String(c.timezoneOffsetSec) + "\n";
  p += "keepSetupApEnabled=" + String(c.keepSetupApEnabled ? "true" : "false") + "\n";

  p += "schedule.enabled=" + String(c.scheduleEnabled ? "true" : "false") + "\n";
  p += "schedule.count=" + String(c.scheduleCount) + "\n";

  for (uint8_t i = 0; i < c.scheduleCount; i++) {
    const FeedingScheduleItem &item = c.schedules[i];
    p += "schedule." + String(i) + ".id=" + item.id + "\n";
    p += "schedule." + String(i) + ".time=" + scheduleTimeString(item) + "\n";
    p += "schedule." + String(i) + ".openDurationMs=" + String(item.openDurationMs) + "\n";
    p += "schedule." + String(i) + ".enabled=" + String(item.enabled ? "true" : "false") + "\n";
  }

  p += "provider.name=" + c.providerName + "\n";
  p += "provider.brand=" + c.providerBrand + "\n";
  p += "provider.website=" + c.providerWebsite + "\n";
  p += "provider.contact=" + c.providerContact + "\n";
  p += "provider.note=" + c.providerNote;

  return p;
}

// ================= CONFIG PARSING =================
void setConfigDefaults(AppConfig &c) {
  c.version = 3;
  c.configId = "";
  c.configVersion = 0;
  c.issuedAt = 0;
  c.expiresAt = 0;

  c.machineCode = FACTORY_MACHINE_CODE;
  c.deviceId = "feeder001";

  c.wifiSsid = "";
  c.wifiPass = "";

  c.mqttHost = "";
  c.mqttPort = 1883;
  c.mqttUseTls = false;
  c.mqttUser = "";
  c.mqttPass = "";

  c.timezone = "Asia/Bangkok";
  c.timezoneOffsetSec = 25200;

  c.keepSetupApEnabled = true;

  c.scheduleEnabled = false;
  c.scheduleCount = 0;
  for (uint8_t i = 0; i < MAX_SCHEDULE_ITEMS; i++) {
    c.schedules[i] = FeedingScheduleItem();
  }

  c.providerName = "";
  c.providerBrand = "";
  c.providerWebsite = "";
  c.providerContact = "";
  c.providerNote = "";

  c.signature = "";
}

bool isExpiredIfTimeKnown(const AppConfig &c) {
  if (!isTimeValid()) return false;
  if (c.expiresAt == 0) return false;
  return nowEpoch() > c.expiresAt;
}

bool isVersionTooOld(const AppConfig &candidate) {
  if (!hasActiveConfig) return false;
  if (candidate.configVersion < activeConfig.configVersion) return true;
  if (candidate.configVersion == activeConfig.configVersion && candidate.configId != activeConfig.configId) return true;
  return false;
}

bool parseConfigJson(
  const String &json,
  AppConfig &out,
  bool enforceVersionRule,
  bool enforceExpiryIfTimeKnown,
  String &errorCode,
  String &errorMessage,
  bool &expiryWarning
) {
  setConfigDefaults(out);
  expiryWarning = false;

  DynamicJsonDocument doc(3072);
  DeserializationError err = deserializeJson(doc, json);
  if (err) {
    errorCode = "bad_json";
    errorMessage = "File JSON không hợp lệ.";
    return false;
  }

  out.version = doc["version"] | 0;
  if (out.version != 3) {
    errorCode = "unsupported_config_version";
    errorMessage = "Chỉ hỗ trợ config version 3.";
    return false;
  }

  out.configId = (const char *)(doc["configId"] | "");
  out.configVersion = doc["configVersion"] | 0;
  out.issuedAt = doc["issuedAt"] | 0;
  out.expiresAt = doc["expiresAt"] | 0;

  if (out.configId.length() == 0) {
    errorCode = "config_id_required";
    errorMessage = "Thiếu configId.";
    return false;
  }

  if (out.configVersion == 0) {
    errorCode = "config_version_required";
    errorMessage = "Thiếu configVersion.";
    return false;
  }

  out.machineCode = (const char *)(doc["machineCode"] | "");
  out.deviceId = (const char *)(doc["deviceId"] | "");

  if (out.machineCode != FACTORY_MACHINE_CODE) {
    errorCode = "machine_code_mismatch";
    errorMessage = "File này không dành cho thiết bị này.";
    return false;
  }

  if (out.deviceId.length() == 0) {
    errorCode = "device_id_required";
    errorMessage = "Thiếu deviceId.";
    return false;
  }

  out.wifiSsid = (const char *)(doc["wifiSsid"] | "");
  out.wifiPass = (const char *)(doc["wifiPass"] | "");

  if (out.wifiSsid.length() == 0) {
    errorCode = "wifi_ssid_required";
    errorMessage = "Thiếu Wi-Fi SSID.";
    return false;
  }

  out.mqttHost = (const char *)(doc["mqttHost"] | "");
  out.mqttPort = doc["mqttPort"] | 1883;
  out.mqttUseTls = doc["mqttUseTls"] | false;
  out.mqttUser = (const char *)(doc["mqttUser"] | "");
  out.mqttPass = (const char *)(doc["mqttPass"] | "");

  if (out.mqttHost.length() == 0) {
    errorCode = "mqtt_host_required";
    errorMessage = "Thiếu MQTT host.";
    return false;
  }

  out.timezone = (const char *)(doc["timezone"] | "Asia/Bangkok");
  out.timezoneOffsetSec = doc["timezoneOffsetSec"] | 25200;
  out.keepSetupApEnabled = doc["keepSetupApEnabled"] | true;

  JsonObject schedule = doc["feedingSchedule"].as<JsonObject>();
  out.scheduleEnabled = schedule["enabled"] | false;
  out.scheduleCount = 0;

  JsonArray items = schedule["items"].as<JsonArray>();
  if (!items.isNull()) {
    if (items.size() > MAX_SCHEDULE_ITEMS) {
      errorCode = "too_many_schedule_items";
      errorMessage = "Số mốc lịch vượt quá giới hạn.";
      return false;
    }

    for (JsonObject itemObj : items) {
      FeedingScheduleItem item;

      item.id = (const char *)(itemObj["id"] | "");
      if (item.id.length() == 0) {
        item.id = "meal_" + String(out.scheduleCount + 1);
      }

      String timeText = (const char *)(itemObj["time"] | "");
      if (!parseHHmm(timeText, item.hour, item.minute)) {
        errorCode = "invalid_schedule_time";
        errorMessage = "Giờ lịch không hợp lệ.";
        return false;
      }

      item.openDurationMs = itemObj["openDurationMs"] | 0;
      if (!validateOpenDuration(item.openDurationMs)) {
        errorCode = "invalid_open_duration";
        errorMessage = "Thời gian mở cửa không hợp lệ.";
        return false;
      }

      item.enabled = itemObj["enabled"] | true;
      item.lastRunYDay = -1;

      out.schedules[out.scheduleCount++] = item;
    }
  }

  JsonObject provider = doc["provider"].as<JsonObject>();
  out.providerName = (const char *)(provider["name"] | "");
  out.providerBrand = (const char *)(provider["brand"] | "");
  out.providerWebsite = (const char *)(provider["website"] | "");
  out.providerContact = (const char *)(provider["contact"] | "");
  out.providerNote = (const char *)(provider["note"] | "");

  out.signature = (const char *)(doc["signature"] | "");
  if (out.signature.length() == 0) {
    errorCode = "signature_required";
    errorMessage = "Thiếu signature.";
    return false;
  }

  if (enforceVersionRule && isVersionTooOld(out)) {
    errorCode = "config_version_too_old";
    errorMessage = "Config version cũ hơn hoặc trùng version nhưng khác configId.";
    return false;
  }

  if (!isTimeValid() && out.expiresAt > 0) {
    expiryWarning = true;
  }

  if (enforceExpiryIfTimeKnown && isExpiredIfTimeKnown(out)) {
    errorCode = "config_expired";
    errorMessage = "File cấu hình đã hết hạn.";
    return false;
  }

  String payload = buildSigningPayload(out);
  String expected = hmacSha256Hex(String(DEVICE_SECRET), payload);

  out.signature.toLowerCase();
  expected.toLowerCase();

  if (!constantTimeEquals(out.signature, expected)) {
    errorCode = "invalid_signature";
    errorMessage = "Signature không hợp lệ.";
    return false;
  }

  errorCode = "";
  errorMessage = "";
  return true;
}

void configToJsonDoc(const AppConfig &c, JsonDocument &doc) {
  doc["version"] = c.version;
  doc["configId"] = c.configId;
  doc["configVersion"] = c.configVersion;
  doc["issuedAt"] = c.issuedAt;
  doc["expiresAt"] = c.expiresAt;

  doc["machineCode"] = c.machineCode;
  doc["deviceId"] = c.deviceId;

  doc["wifiSsid"] = c.wifiSsid;
  doc["wifiPass"] = c.wifiPass;

  doc["mqttHost"] = c.mqttHost;
  doc["mqttPort"] = c.mqttPort;
  doc["mqttUseTls"] = c.mqttUseTls;
  doc["mqttUser"] = c.mqttUser;
  doc["mqttPass"] = c.mqttPass;

  doc["timezone"] = c.timezone;
  doc["timezoneOffsetSec"] = c.timezoneOffsetSec;
  doc["keepSetupApEnabled"] = c.keepSetupApEnabled;

  JsonObject schedule = doc.createNestedObject("feedingSchedule");
  schedule["enabled"] = c.scheduleEnabled;
  JsonArray items = schedule.createNestedArray("items");

  for (uint8_t i = 0; i < c.scheduleCount; i++) {
    JsonObject item = items.createNestedObject();
    item["id"] = c.schedules[i].id;
    item["time"] = scheduleTimeString(c.schedules[i]);
    item["openDurationMs"] = c.schedules[i].openDurationMs;
    item["enabled"] = c.schedules[i].enabled;
  }

  JsonObject provider = doc.createNestedObject("provider");
  provider["name"] = c.providerName;
  provider["brand"] = c.providerBrand;
  provider["website"] = c.providerWebsite;
  provider["contact"] = c.providerContact;
  provider["note"] = c.providerNote;

  doc["signature"] = c.signature;
}

String serializeConfig(const AppConfig &c) {
  DynamicJsonDocument doc(3072);
  configToJsonDoc(c, doc);
  String out;
  serializeJsonPretty(doc, out);
  return out;
}

bool saveConfigToFile(const char *path, const AppConfig &c) {
  return writeFileString(path, serializeConfig(c));
}

bool loadConfigFromFile(const char *path, AppConfig &out, bool enforceVersionRule, bool enforceExpiryIfTimeKnown) {
  String json;
  if (!readFileString(path, json)) return false;

  String errCode, errMsg;
  bool expiryWarn = false;
  if (!parseConfigJson(json, out, enforceVersionRule, enforceExpiryIfTimeKnown, errCode, errMsg, expiryWarn)) {
    Serial.printf("[CONFIG] Load failed %s: %s - %s\n", path, errCode.c_str(), errMsg.c_str());
    return false;
  }

  return true;
}

bool saveBootState() {
  DynamicJsonDocument doc(512);
  doc["activeConfigId"] = bootState.activeConfigId;
  doc["activeConfigVersion"] = bootState.activeConfigVersion;
  doc["bootFailCount"] = bootState.bootFailCount;
  doc["lastBootAt"] = bootState.lastBootAt;

  File f = LittleFS.open(BOOT_STATE_PATH, "w");
  if (!f) return false;
  serializeJsonPretty(doc, f);
  f.close();
  return true;
}

void loadBootState() {
  bootState = BootState();

  if (!LittleFS.exists(BOOT_STATE_PATH)) return;

  File f = LittleFS.open(BOOT_STATE_PATH, "r");
  if (!f) return;

  DynamicJsonDocument doc(512);
  DeserializationError err = deserializeJson(doc, f);
  f.close();

  if (err) return;

  bootState.activeConfigId = (const char *)(doc["activeConfigId"] | "");
  bootState.activeConfigVersion = doc["activeConfigVersion"] | 0;
  bootState.bootFailCount = doc["bootFailCount"] | 0;
  bootState.lastBootAt = doc["lastBootAt"] | 0;
}

bool promotePendingToActive() {
  if (!LittleFS.exists(CONFIG_PENDING_PATH)) return false;

  if (LittleFS.exists(CONFIG_ACTIVE_PATH)) {
    copyFile(CONFIG_ACTIVE_PATH, CONFIG_BACKUP_PATH);
  }

  if (!copyFile(CONFIG_PENDING_PATH, CONFIG_ACTIVE_PATH)) {
    return false;
  }

  deleteFileIfExists(CONFIG_PENDING_PATH);

  AppConfig newActive;
  if (!loadConfigFromFile(CONFIG_ACTIVE_PATH, newActive, false, false)) {
    return false;
  }

  activeConfig = newActive;
  hasActiveConfig = true;

  bootState.activeConfigId = activeConfig.configId;
  bootState.activeConfigVersion = activeConfig.configVersion;
  bootState.bootFailCount = 0;
  bootState.lastBootAt = nowEpoch();
  saveBootState();

  buildTopics(activeConfig.deviceId);
  return true;
}

bool rollbackToBackup() {
  if (!LittleFS.exists(CONFIG_BACKUP_PATH)) return false;
  if (!copyFile(CONFIG_BACKUP_PATH, CONFIG_ACTIVE_PATH)) return false;

  AppConfig restored;
  if (!loadConfigFromFile(CONFIG_ACTIVE_PATH, restored, false, false)) return false;

  activeConfig = restored;
  hasActiveConfig = true;

  bootState.activeConfigId = activeConfig.configId;
  bootState.activeConfigVersion = activeConfig.configVersion;
  bootState.bootFailCount = 0;
  bootState.lastBootAt = nowEpoch();
  saveBootState();

  buildTopics(activeConfig.deviceId);
  return true;
}

void loadActiveOrBackup() {
  hasActiveConfig = false;
  setConfigDefaults(activeConfig);

  if (loadConfigFromFile(CONFIG_ACTIVE_PATH, activeConfig, false, false)) {
    hasActiveConfig = true;
    buildTopics(activeConfig.deviceId);
    return;
  }

  Serial.println("[CONFIG] Active invalid or missing. Trying backup...");
  if (rollbackToBackup()) {
    Serial.println("[CONFIG] Rolled back to backup.");
    return;
  }

  Serial.println("[CONFIG] No valid config. Setup AP required.");
}

// ================= AP CONTROL =================
void enableSetupAp(bool temporary) {
  WiFi.mode(WIFI_AP_STA);
  if (!apEnabled) {
    bool ok = WiFi.softAP(AP_SSID_DEFAULT, AP_PASS_DEFAULT);
    apEnabled = ok;
    Serial.printf("[AP] %s IP=%s\n", ok ? "enabled" : "failed", WiFi.softAPIP().toString().c_str());
  }

  if (temporary) {
    tempApEnabled = true;
    tempApDisableAt = millis() + TEMP_AP_ENABLE_MS;
  }
}

void disableSetupApIfAllowed() {
  // Always keep Setup AP enabled for config updates
  return;

  if (!apEnabled) return;
  if (!hasActiveConfig) return;
  if (activeConfig.keepSetupApEnabled) return;
  if (WiFi.status() != WL_CONNECTED) return;

  WiFi.softAPdisconnect(true);
  apEnabled = false;
  tempApEnabled = false;
  Serial.println("[AP] disabled");
}

void updateTempAp() {
  if (!tempApEnabled) return;
  if ((long)(millis() - tempApDisableAt) >= 0) {
    tempApEnabled = false;
    disableSetupApIfAllowed();
  }
}

// ================= SERVO / FEEDING =================
void applyDoorState(bool open) {
  doorOpen = open;
  feederServo.write(open ? SERVO_OPEN_ANGLE : SERVO_CLOSE_ANGLE);
  digitalWrite(LED_PIN, open ? LOW : HIGH);
}

void publishState();
void publishEvent(const String &event, const String &source, const String &requestId, uint32_t durationMs, const String &scheduleId = "");
void publishAck(const String &requestId, const String &action, bool ok, const String &error, const String &message);

bool startFeeding(uint32_t openDurationMs, const String &source, const String &requestId, const String &scheduleId = "") {
  if (!validateOpenDuration(openDurationMs)) {
    if (requestId.length() > 0) {
      publishAck(requestId, "feed_once", false, "invalid_open_duration", "Invalid openDurationMs.");
    }
    return false;
  }

  if (isFeeding) {
    if (requestId.length() > 0) {
      publishAck(requestId, "feed_once", false, "device_is_feeding", "Device is already feeding.");
    }
    return false;
  }

  isFeeding = true;
  feederMode = "feeding";
  currentFeedSource = source;
  currentFeedRequestId = requestId;
  currentFeedScheduleId = scheduleId;
  currentFeedDurationMs = openDurationMs;
  feedingEndAt = millis() + openDurationMs;

  applyDoorState(true);
  publishState();

  if (requestId.length() > 0) {
    publishAck(requestId, "feed_once", true, "", "accepted");
  }

  publishEvent("feed_started", source, requestId, openDurationMs, scheduleId);
  return true;
}

void updateFeeding() {
  if (!isFeeding) return;

  if ((long)(millis() - feedingEndAt) >= 0) {
    applyDoorState(false);
    isFeeding = false;
    feederMode = "idle";

    publishState();
    publishEvent("feed_finished", currentFeedSource, currentFeedRequestId, currentFeedDurationMs, currentFeedScheduleId);

    currentFeedSource = "";
    currentFeedRequestId = "";
    currentFeedScheduleId = "";
    currentFeedDurationMs = 0;
  }
}

// ================= WIFI / TIME =================
bool connectWiFiWithConfig(const AppConfig &c, uint32_t timeoutMs) {
  if (c.wifiSsid.length() == 0) return false;

  Serial.printf("[WIFI] Connecting to SSID: %s\n", c.wifiSsid.c_str());

  WiFi.mode(WIFI_AP_STA);
  WiFi.begin(c.wifiSsid.c_str(), c.wifiPass.c_str());

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < timeoutMs) {
    delay(250);
    server.handleClient();
    yield();
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("[WIFI] Connected. IP=%s\n", WiFi.localIP().toString().c_str());
    return true;
  }

  Serial.println("[WIFI] Connect failed.");
  return false;
}

void syncTimeWithConfig(const AppConfig &c, bool force = false) {
  if (WiFi.status() != WL_CONNECTED) return;

  unsigned long nowMs = millis();
  if (!force && timeSynced && nowMs - lastTimeSyncAttemptAt < TIME_RESYNC_INTERVAL_MS) return;

  lastTimeSyncAttemptAt = nowMs;

  Serial.println("[TIME] Syncing NTP...");
  configTime(c.timezoneOffsetSec, 0, "pool.ntp.org", "time.nist.gov");

  unsigned long start = millis();
  while (millis() - start < 8000) {
    if (isTimeValid()) {
      timeSynced = true;
      Serial.printf("[TIME] Synced epoch=%lu\n", (unsigned long)nowEpoch());
      publishEvent("time_synced", "system", "", 0);
      return;
    }
    delay(200);
    server.handleClient();
    yield();
  }

  timeSynced = false;
  Serial.println("[TIME] Sync failed.");
}

// ================= MQTT =================
void mqttCallback(char *topic, byte *payload, unsigned int length);

void selectMqttClient(const AppConfig &c) {
  if (c.mqttUseTls) {
    wifiClientSecure.setInsecure(); // For first production phase. Prefer CA cert later.
    mqttClient = &mqttSecure;
  } else {
    mqttClient = &mqttPlain;
  }

  mqttClient->setCallback(mqttCallback);
  mqttClient->setBufferSize(1024);
  mqttClient->setServer(c.mqttHost.c_str(), c.mqttPort);
}

bool connectMqttWithConfig(const AppConfig &c, bool publishOnConnect) {
  if (WiFi.status() != WL_CONNECTED) return false;
  if (c.mqttHost.length() == 0) return false;

  buildTopics(c.deviceId);
  selectMqttClient(c);

  String clientId = "feeder-" + c.deviceId + "-" + String(ESP.getChipId(), HEX);

  DynamicJsonDocument willDoc(256);
  willDoc["deviceId"] = c.deviceId;
  willDoc["online"] = false;
  willDoc["epoch"] = nowEpoch();

  String willPayload;
  serializeJson(willDoc, willPayload);

  bool ok;
  if (c.mqttUser.length() > 0) {
    ok = mqttClient->connect(
      clientId.c_str(),
      c.mqttUser.c_str(),
      c.mqttPass.c_str(),
      topicOnline.c_str(),
      1,
      true,
      willPayload.c_str()
    );
  } else {
    ok = mqttClient->connect(
      clientId.c_str(),
      topicOnline.c_str(),
      1,
      true,
      willPayload.c_str()
    );
  }

  if (!ok) {
    Serial.printf("[MQTT] Connect failed rc=%d (host=%s, port=%d)\n", mqttClient->state(), c.mqttHost.c_str(), c.mqttPort);
    return false;
  }

  mqttClient->subscribe(topicCmd.c_str(), 1);
  Serial.println("[MQTT] Connected and subscribed.");

  if (publishOnConnect) {
    DynamicJsonDocument doc(256);
    doc["deviceId"] = c.deviceId;
    doc["online"] = true;
    doc["epoch"] = nowEpoch();
    doc["uptimeSec"] = millis() / 1000;

    String payload;
    serializeJson(doc, payload);
    mqttClient->publish(topicOnline.c_str(), payload.c_str(), true);
  }

  return true;
}

bool testWifiTimeMqtt(const AppConfig &candidate, String &errorCode, String &errorMessage) {
  if (mqttClient->connected()) mqttClient->disconnect();
  WiFi.disconnect();

  bool wifiOk = connectWiFiWithConfig(candidate, WIFI_CONNECT_TIMEOUT_MS);
  if (!wifiOk) {
    errorCode = "wifi_connect_failed";
    errorMessage = "Không kết nối được Wi-Fi.";
    return false;
  }

  syncTimeWithConfig(candidate, true);

  if (isTimeValid() && candidate.expiresAt > 0 && nowEpoch() > candidate.expiresAt) {
    errorCode = "config_expired";
    errorMessage = "File cấu hình đã hết hạn sau khi đồng bộ thời gian.";
    return false;
  }

  bool mqttOk = connectMqttWithConfig(candidate, false);
  if (!mqttOk) {
    errorCode = "mqtt_connect_failed";
    errorMessage = "Không kết nối được MQTT Server.";
    return false;
  }

  mqttClient->disconnect();

  errorCode = "";
  errorMessage = "";
  return true;
}

// ================= MQTT PUBLISH =================
void publishJson(const String &topic, JsonDocument &doc, bool retained) {
  if (!mqttClient || !mqttClient->connected()) return;

  String payload;
  serializeJson(doc, payload);
  mqttClient->publish(topic.c_str(), payload.c_str(), retained);
}

void publishOnline(bool online) {
  if (!hasActiveConfig || !mqttClient->connected()) return;

  DynamicJsonDocument doc(384);
  doc["deviceId"] = activeConfig.deviceId;
  doc["online"] = online;
  doc["epoch"] = nowEpoch();
  doc["uptimeSec"] = millis() / 1000;
  doc["activeConfigId"] = activeConfig.configId;
  doc["activeConfigVersion"] = activeConfig.configVersion;

  publishJson(topicOnline, doc, true);
}

void publishState() {
  if (!hasActiveConfig || !mqttClient->connected()) return;

  DynamicJsonDocument doc(512);
  doc["deviceId"] = activeConfig.deviceId;
  doc["mode"] = feederMode;
  doc["isFeeding"] = isFeeding;
  doc["doorOpen"] = doorOpen;
  doc["epoch"] = nowEpoch();
  doc["uptimeSec"] = millis() / 1000;
  doc["activeConfigId"] = activeConfig.configId;
  doc["activeConfigVersion"] = activeConfig.configVersion;

  publishJson(topicState, doc, true);
}

void publishTelemetry() {
  Serial.printf("[TELEMETRY] Checking: hasActiveConfig=%d, wifiConnected=%d, mqttConnected=%d\n",
                hasActiveConfig, (WiFi.status() == WL_CONNECTED), (mqttClient && mqttClient->connected()));
  if (!hasActiveConfig || !mqttClient->connected()) return;
  Serial.println("[TELEMETRY] Publishing telemetry to MQTT...");

  DynamicJsonDocument doc(1024);
  doc["deviceId"] = activeConfig.deviceId;

  doc["wifiConnected"] = (WiFi.status() == WL_CONNECTED);
  doc["rssi"] = (WiFi.status() == WL_CONNECTED) ? WiFi.RSSI() : -127;
  doc["ip"] = (WiFi.status() == WL_CONNECTED) ? WiFi.localIP().toString() : "";

  doc["serverConnected"] = mqttClient->connected();

  doc["timeSynced"] = timeSynced;
  doc["epoch"] = nowEpoch();

  doc["scheduleEnabled"] = activeConfig.scheduleEnabled;
  doc["scheduleCount"] = activeConfig.scheduleCount;

  doc["mode"] = feederMode;
  doc["isFeeding"] = isFeeding;
  doc["doorOpen"] = doorOpen;

  doc["heap"] = ESP.getFreeHeap();
  doc["uptimeSec"] = millis() / 1000;

  doc["activeConfigId"] = activeConfig.configId;
  doc["activeConfigVersion"] = activeConfig.configVersion;

  publishJson(topicTelemetry, doc, false);
}

void publishEvent(const String &event, const String &source, const String &requestId, uint32_t durationMs, const String &scheduleId) {
  if (!hasActiveConfig || !mqttClient->connected()) return;

  DynamicJsonDocument doc(768);
  doc["deviceId"] = activeConfig.deviceId;
  doc["event"] = event;
  if (source.length() > 0) doc["source"] = source;
  if (requestId.length() > 0) doc["requestId"] = requestId;
  if (scheduleId.length() > 0) doc["scheduleId"] = scheduleId;
  if (durationMs > 0) doc["openDurationMs"] = durationMs;

  doc["configId"] = activeConfig.configId;
  doc["configVersion"] = activeConfig.configVersion;
  doc["epoch"] = nowEpoch();
  doc["uptimeSec"] = millis() / 1000;

  publishJson(topicEvent, doc, false);
}

void publishAck(const String &requestId, const String &action, bool ok, const String &error, const String &message) {
  if (!hasActiveConfig || !mqttClient->connected()) return;

  DynamicJsonDocument doc(512);
  doc["deviceId"] = activeConfig.deviceId;
  doc["requestId"] = requestId;
  doc["action"] = action;
  doc["ok"] = ok;
  if (!ok && error.length() > 0) doc["error"] = error;
  doc["message"] = message;
  doc["epoch"] = nowEpoch();

  publishJson(topicAck, doc, false);
}

// ================= MQTT COMMANDS =================
void handleMqttCommand(const String &msg) {
  Serial.printf("[MQTT] CMD %s\n", msg.c_str());

  DynamicJsonDocument doc(768);
  DeserializationError err = deserializeJson(doc, msg);
  if (err) {
    // legacy/manual testing fallback only
    if (msg == "1" || msg == "on" || msg == "ON" || msg == "true") {
      startFeeding(1200, "remote_legacy", "", "");
    }
    return;
  }

  String requestId = (const char *)(doc["requestId"] | "");
  String action = (const char *)(doc["action"] | "");

  if (requestId.length() == 0 && action != "ping") {
    // Server command should always have requestId.
    requestId = "missing_request_id";
  }

  if (action == "feed_once") {
    uint32_t durationMs = doc["openDurationMs"] | doc["durationMs"] | 0;
    startFeeding(durationMs, "remote", requestId, "");
    return;
  }

  if (action == "ping") {
    publishAck(requestId, "ping", true, "", "pong");
    return;
  }

  if (action == "sync_time") {
    uint32_t epoch = doc["epoch"] | 0;
    int offset = doc["timezoneOffsetSec"] | activeConfig.timezoneOffsetSec;

    if (epoch > 100000) {
      timeval tv;
      tv.tv_sec = epoch;
      tv.tv_usec = 0;
      settimeofday(&tv, nullptr);

      activeConfig.timezoneOffsetSec = offset;
      timeSynced = true;

      publishAck(requestId, "sync_time", true, "", "time_synced");
      publishEvent("time_synced", "server", requestId, 0);
    } else {
      publishAck(requestId, "sync_time", false, "invalid_epoch", "Invalid epoch.");
    }
    return;
  }

  if (action == "reboot") {
    publishAck(requestId, "reboot", true, "", "rebooting");
    delay(300);
    ESP.restart();
    return;
  }

  publishAck(requestId, action.length() ? action : "unknown", false, "unknown_action", "Unknown action.");
}

void mqttCallback(char *topic, byte *payload, unsigned int length) {
  String msg;
  msg.reserve(length + 1);

  for (unsigned int i = 0; i < length; i++) {
    msg += (char)payload[i];
  }

  if (String(topic) == topicCmd) {
    handleMqttCommand(msg);
  }
}

// ================= SCHEDULE =================
void checkSchedule() {
  if (!hasActiveConfig) return;
  if (!activeConfig.scheduleEnabled || activeConfig.scheduleCount == 0) return;
  if (!timeSynced || !isTimeValid()) return;
  if (isFeeding) return;

  time_t raw = time(nullptr);
  struct tm *tmNow = localtime(&raw);
  if (!tmNow) return;

  for (uint8_t i = 0; i < activeConfig.scheduleCount; i++) {
    FeedingScheduleItem &item = activeConfig.schedules[i];

    if (!item.enabled) continue;
    if (tmNow->tm_hour != item.hour) continue;
    if (tmNow->tm_min != item.minute) continue;
    if (item.lastRunYDay == tmNow->tm_yday) continue;

    item.lastRunYDay = tmNow->tm_yday;

    publishEvent("schedule_triggered", "schedule", "", item.openDurationMs, item.id);
    startFeeding(item.openDurationMs, "schedule", "", item.id);
    return;
  }
}

// ================= WEB UI =================
String schedulePreviewText(const AppConfig &c) {
  if (!c.scheduleEnabled || c.scheduleCount == 0) return "Chưa thiết lập";
  return String(c.scheduleCount) + " lần/ngày";
}

String schedulePreviewHtml(const AppConfig &c) {
  if (!c.scheduleEnabled || c.scheduleCount == 0) return "Chưa thiết lập";

  String out = String(c.scheduleCount) + " lần/ngày<ul>";
  for (uint8_t i = 0; i < c.scheduleCount; i++) {
    const FeedingScheduleItem &item = c.schedules[i];
    out += "<li>";
    out += esc(scheduleTimeString(item));
    out += " - mở ";
    out += String(item.openDurationMs / 1000.0, 1);
    out += " giây";
    if (!item.enabled) out += " (tắt)";
    out += "</li>";
  }
  out += "</ul>";
  return out;
}

String providerText(const AppConfig &c) {
  String provider = c.providerBrand;
  if (provider.length() > 0 && c.providerName.length() > 0) provider += " - ";
  provider += c.providerName;
  return provider;
}

String htmlPage() {
  String html = R"HTML(
<!doctype html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Pet Feeder Setup</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 860px; margin: 20px auto; padding: 0 12px; }
    h2 { margin: 8px 0 12px; }
    .card { border: 1px solid #ddd; border-radius: 12px; padding: 14px; margin-bottom: 12px; }
    .row { margin: 8px 0; }
    .muted { color: #666; font-size: 13px; }
    .ok { color: #10893e; font-weight: 700; }
    .bad { color: #d13438; font-weight: 700; }
    .warn { color: #b36b00; font-weight: 700; }
    button { padding: 10px 14px; border: none; border-radius: 8px; cursor: pointer; background: #2563eb; color: white; margin-top: 8px; }
    button:disabled { background: #aaa; cursor: not-allowed; }
    input[type=file], input[type=password], input[type=text] { width: 100%; box-sizing: border-box; padding: 9px; border: 1px solid #ddd; border-radius: 8px; }
    code { background: #f5f5f5; padding: 2px 6px; border-radius: 6px; }
    pre { background: #f8f8f8; border-radius: 8px; padding: 10px; white-space: pre-wrap; }
    .line { display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding: 6px 0; gap: 10px; }
    .line b { text-align: right; }
    label { display:block; margin: 10px 0 4px; font-weight: 600; }
  </style>
</head>
<body>
  <h2>Pet Feeder Setup</h2>

  <div class="card">
    <h3>Trạng thái thiết bị</h3>
    <div class="line"><span>Machine Code</span><b id="machineCode">-</b></div>
    <div class="line"><span>Device ID</span><b id="deviceId">-</b></div>
    <div class="line"><span>Active Config</span><b id="activeConfig">-</b></div>
    <div class="line"><span>Wi-Fi</span><b id="wifi">-</b></div>
    <div class="line"><span>AP setup</span><b id="ap">-</b></div>
    <div class="line"><span>Đồng bộ thời gian</span><b id="time">-</b></div>
    <div class="line"><span>Kết nối máy chủ</span><b id="mqtt">-</b></div>
    <div class="line"><span>Feeder</span><b id="mode">-</b></div>
    <div class="muted">AP mặc định: <code>Feeder-ESP8266</code> / <code>12345678</code>, IP: <code>192.168.4.1</code></div>
  </div>

  <div class="card">
    <h3>Upload file cấu hình</h3>
    <p class="muted">Chọn file cấu hình không extension do Server/Mobile App/Web App tạo. Máy sẽ verify signature và chỉ preview thông tin an toàn. Chưa lưu gì cho đến khi nhập PIN và bấm Apply.</p>
    <form method="POST" action="/upload" enctype="multipart/form-data">
      <input type="file" name="configFile" />
      <div class="row"><button type="submit">Upload & Preview</button></div>
    </form>
  </div>

  <div class="card">
    <h3>Preview cấu hình</h3>
    <div id="preview">Chưa có file hợp lệ được upload.</div>

    <label>Setup PIN</label>
    <input id="pin" type="password" placeholder="Nhập PIN để Apply" />
    <button id="applyBtn" onclick="applyConfig()" disabled>Apply cấu hình</button>
    <pre id="applyResult"></pre>
  </div>

  <div class="card">
    <h3>Đổi Setup PIN</h3>
    <label>PIN cũ</label>
    <input id="oldPin" type="password" placeholder="PIN cũ" />
    <label>PIN mới</label>
    <input id="newPin" type="password" placeholder="6-12 chữ số" />
    <button onclick="changePin()">Đổi PIN</button>
    <pre id="pinResult"></pre>
  </div>

<script>
function escHtml(s) {
  return String(s || '').replace(/[&<>"']/g, function(m) {
    return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m];
  });
}

async function refreshStatus() {
  try {
    const r = await fetch('/api/status');
    const d = await r.json();

    document.getElementById('machineCode').innerText = d.machineCode || '-';
    document.getElementById('deviceId').innerText = d.deviceId || '-';
    document.getElementById('activeConfig').innerText = d.activeConfigId ? (d.activeConfigId + ' / v' + d.activeConfigVersion) : '-';
    document.getElementById('wifi').innerText = d.wifiConnected ? ('Đã kết nối: ' + (d.wifiIp || '')) : 'Chưa kết nối';
    document.getElementById('ap').innerText = d.apEnabled ? ('Bật: ' + (d.apIp || '')) : 'Tắt';
    document.getElementById('time').innerText = d.timeSynced ? ('Đã đồng bộ: ' + d.epoch) : 'Chưa đồng bộ';
    document.getElementById('mqtt').innerText = d.serverConnected ? 'Đã kết nối' : 'Chưa kết nối';
    document.getElementById('mode').innerText = d.mode || '-';

    if (d.pending && d.pending.valid) {
      document.getElementById('applyBtn').disabled = false;
      let warning = d.pending.expiryWarning ? '<div class="warn">Cảnh báo: Máy chưa đồng bộ thời gian nên chưa xác thực được hạn dùng file config.</div>' : '';
      document.getElementById('preview').innerHTML =
        '<div class="ok">Trạng thái file: Hợp lệ ✅</div>' + warning +
        '<div class="line"><span>Mã máy</span><b>' + escHtml(d.pending.machineCode) + '</b></div>' +
        '<div class="line"><span>Device ID</span><b>' + escHtml(d.pending.deviceId) + '</b></div>' +
        '<div class="line"><span>Config ID</span><b>' + escHtml(d.pending.configId) + '</b></div>' +
        '<div class="line"><span>Config Version</span><b>' + escHtml(d.pending.configVersion) + '</b></div>' +
        '<div class="line"><span>Issued At</span><b>' + escHtml(d.pending.issuedAt) + '</b></div>' +
        '<div class="line"><span>Expires At</span><b>' + escHtml(d.pending.expiresAt) + '</b></div>' +
        '<div class="line"><span>Wi-Fi SSID</span><b>' + escHtml(d.pending.wifiSsid) + '</b></div>' +
        '<div class="line"><span>Lịch cho ăn</span><b>' + escHtml(d.pending.scheduleText) + '</b></div>' +
        '<div class="line"><span>MQTT TLS</span><b>' + (d.pending.mqttUseTls ? 'Có' : 'Không') + '</b></div>' +
        '<div class="line"><span>Keep setup AP</span><b>' + (d.pending.keepSetupApEnabled ? 'Có' : 'Không') + '</b></div>' +
        '<div class="line"><span>Cung cấp bởi</span><b>' + escHtml(d.pending.provider) + '</b></div>';
    } else if (d.pending && d.pending.error) {
      document.getElementById('applyBtn').disabled = true;
      document.getElementById('preview').innerHTML =
        '<div class="bad">Trạng thái file: Không hợp lệ ❌</div>' +
        '<div class="muted">' + escHtml(d.pending.error) + '</div>';
    } else {
      document.getElementById('applyBtn').disabled = true;
    }
  } catch (e) {}
}

async function applyConfig() {
  document.getElementById('applyResult').innerText = 'Đang apply...';
  const pin = document.getElementById('pin').value;
  const r = await fetch('/api/config/apply', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({pin})
  });
  const d = await r.json();
  document.getElementById('applyResult').innerText = JSON.stringify(d, null, 2);
  await refreshStatus();
}

async function changePin() {
  document.getElementById('pinResult').innerText = 'Đang đổi PIN...';
  const oldPin = document.getElementById('oldPin').value;
  const newPin = document.getElementById('newPin').value;
  const r = await fetch('/api/setup-pin/change', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({oldPin, newPin})
  });
  const d = await r.json();
  document.getElementById('pinResult').innerText = JSON.stringify(d, null, 2);
}

refreshStatus();
setInterval(refreshStatus, 3000);
</script>
</body>
</html>
)HTML";

  return html;
}

// ================= JSON RESPONSE HELPERS =================
void sendJson(JsonDocument &doc, int code = 200) {
  String out;
  serializeJson(doc, out);
  server.send(code, "application/json", out);
}

void sendError(int httpCode, const String &code, const String &message) {
  DynamicJsonDocument doc(512);
  doc["ok"] = false;
  JsonObject err = doc.createNestedObject("error");
  err["code"] = code;
  err["message"] = message;
  sendJson(doc, httpCode);
}

// ================= HTTP HANDLERS =================
void handleRoot() {
  server.send(200, "text/html; charset=utf-8", htmlPage());
}

void handlePing() {
  DynamicJsonDocument doc(128);
  doc["ok"] = true;
  sendJson(doc);
}

void handleStatus() {
  DynamicJsonDocument doc(2048);
  doc["ok"] = true;
  doc["machineCode"] = FACTORY_MACHINE_CODE;
  doc["deviceId"] = hasActiveConfig ? activeConfig.deviceId : "";
  doc["hasActiveConfig"] = hasActiveConfig;

  doc["wifiConnected"] = (WiFi.status() == WL_CONNECTED);
  doc["wifiIp"] = (WiFi.status() == WL_CONNECTED) ? WiFi.localIP().toString() : "";

  doc["apEnabled"] = apEnabled;
  doc["apIp"] = apEnabled ? WiFi.softAPIP().toString() : "";

  doc["serverConnected"] = mqttClient && mqttClient->connected();
  doc["timeSynced"] = timeSynced;
  doc["epoch"] = nowEpoch();

  doc["mode"] = feederMode;
  doc["isFeeding"] = isFeeding;
  doc["doorOpen"] = doorOpen;

  doc["activeConfigId"] = hasActiveConfig ? activeConfig.configId : "";
  doc["activeConfigVersion"] = hasActiveConfig ? activeConfig.configVersion : 0;

  doc["scheduleEnabled"] = hasActiveConfig ? activeConfig.scheduleEnabled : false;
  doc["scheduleCount"] = hasActiveConfig ? activeConfig.scheduleCount : 0;

  JsonObject pending = doc.createNestedObject("pending");
  pending["valid"] = hasPreviewConfig;
  if (hasPreviewConfig) {
    pending["machineCode"] = previewConfig.machineCode;
    pending["deviceId"] = previewConfig.deviceId;
    pending["configId"] = previewConfig.configId;
    pending["configVersion"] = previewConfig.configVersion;
    pending["issuedAt"] = previewConfig.issuedAt;
    pending["expiresAt"] = previewConfig.expiresAt;
    pending["wifiSsid"] = previewConfig.wifiSsid;
    pending["scheduleText"] = schedulePreviewText(previewConfig);
    pending["mqttUseTls"] = previewConfig.mqttUseTls;
    pending["keepSetupApEnabled"] = previewConfig.keepSetupApEnabled;
    pending["provider"] = providerText(previewConfig);
    pending["expiryWarning"] = previewExpiryWarning;
  } else if (previewErrorCode.length() > 0) {
    pending["error"] = previewErrorCode + ": " + previewErrorMessage;
  }

  sendJson(doc);
}

void handleUpload() {
  HTTPUpload &upload = server.upload();

  if (upload.status == UPLOAD_FILE_START) {
    uploadBuffer = "";
    uploadBuffer.reserve(MAX_CONFIG_UPLOAD_BYTES);
    uploadTooLarge = false;
    hasPreviewConfig = false;
    previewErrorCode = "";
    previewErrorMessage = "";
    previewExpiryWarning = false;

    Serial.printf("[UPLOAD] Start: %s\n", upload.filename.c_str());
  } else if (upload.status == UPLOAD_FILE_WRITE) {
    if (uploadTooLarge) return;

    if (uploadBuffer.length() + upload.currentSize > MAX_CONFIG_UPLOAD_BYTES) {
      uploadTooLarge = true;
      uploadBuffer = "";
      hasPreviewConfig = false;
      previewErrorCode = "config_file_too_large";
      previewErrorMessage = "File cấu hình vượt quá 8192 bytes.";
      return;
    }

    for (size_t i = 0; i < upload.currentSize; i++) {
      uploadBuffer += (char)upload.buf[i];
    }
  } else if (upload.status == UPLOAD_FILE_END) {
    Serial.printf("[UPLOAD] End size=%u\n", upload.totalSize);

    if (uploadTooLarge) {
      uploadBuffer = "";
      return;
    }

    AppConfig parsed;
    String errorCode, errorMessage;
    bool expiryWarning = false;

    if (parseConfigJson(uploadBuffer, parsed, true, true, errorCode, errorMessage, expiryWarning)) {
      previewConfig = parsed;
      hasPreviewConfig = true;
      previewErrorCode = "";
      previewErrorMessage = "";
      previewExpiryWarning = expiryWarning;
      publishEvent("config_previewed", "local_setup", "", 0);
    } else {
      hasPreviewConfig = false;
      previewErrorCode = errorCode;
      previewErrorMessage = errorMessage;
      previewExpiryWarning = expiryWarning;
    }

    uploadBuffer = "";
  }
}

void handleUploadDone() {
  if (uploadTooLarge) {
    sendError(413, "config_file_too_large", "File cấu hình vượt quá 8192 bytes.");
    return;
  }

  String html = "<!doctype html><html><head><meta name='viewport' content='width=device-width, initial-scale=1' />";
  html += "<meta http-equiv='refresh' content='1; url=/' />";
  html += "<title>Upload</title></head><body style='font-family:Arial;max-width:720px;margin:20px auto;padding:12px;'>";
  if (hasPreviewConfig) {
    html += "<h3 style='color:#10893e'>Upload thành công. File hợp lệ.</h3>";
    if (previewExpiryWarning) {
      html += "<p style='color:#b36b00'>Cảnh báo: Máy chưa đồng bộ thời gian nên chưa xác thực được hạn dùng file.</p>";
    }
    html += "<p>Đang quay lại trang preview...</p>";
  } else {
    html += "<h3 style='color:#d13438'>Upload không hợp lệ.</h3>";
    html += "<p>" + esc(previewErrorCode + ": " + previewErrorMessage) + "</p>";
    html += "<p>Đang quay lại trang upload...</p>";
  }
  html += "<p><a href='/'>Quay lại ngay</a></p></body></html>";

  server.send(200, "text/html; charset=utf-8", html);
}

void handleApplyConfig() {
  if (!hasPreviewConfig) {
    sendError(400, "no_pending_config", "Chưa có file config hợp lệ để apply.");
    return;
  }

  DynamicJsonDocument req(256);
  DeserializationError err = deserializeJson(req, server.arg("plain"));
  if (err) {
    sendError(400, "bad_json", "Body JSON không hợp lệ.");
    return;
  }

  String pin = (const char *)(req["pin"] | "");

  if (isPinLocked()) {
    sendError(429, "pin_locked", "Sai PIN quá nhiều lần. Vui lòng thử lại sau.");
    return;
  }

  if (!verifyPin(pin)) {
    sendError(403, "invalid_pin", "PIN không đúng.");
    return;
  }

  if (!saveConfigToFile(CONFIG_PENDING_PATH, previewConfig)) {
    sendError(500, "save_pending_failed", "Không lưu được pending config.");
    return;
  }

  publishEvent("config_apply_started", "local_setup", "", 0);

  String testErrorCode, testErrorMessage;
  bool testOk = testWifiTimeMqtt(previewConfig, testErrorCode, testErrorMessage);

  if (!testOk) {
    deleteFileIfExists(CONFIG_PENDING_PATH);

    // Try reconnect old active if exists.
    if (hasActiveConfig) {
      connectWiFiWithConfig(activeConfig, WIFI_CONNECT_TIMEOUT_MS);
      syncTimeWithConfig(activeConfig, true);
      connectMqttWithConfig(activeConfig, true);
    }

    enableSetupAp(false);

    DynamicJsonDocument res(768);
    res["ok"] = false;
    res["savePending"] = true;
    res["wifiConnected"] = (testErrorCode != "wifi_connect_failed");
    res["timeSynced"] = timeSynced;
    res["serverConnected"] = false;
    res["promoted"] = false;

    JsonObject e = res.createNestedObject("error");
    e["code"] = testErrorCode;
    e["message"] = testErrorMessage;

    sendJson(res, 400);
    return;
  }

  bool promoted = promotePendingToActive();

  if (!promoted) {
    sendError(500, "promote_config_failed", "Không promote được pending config thành active.");
    return;
  }

  hasPreviewConfig = false;
  previewErrorCode = "";
  previewErrorMessage = "";
  previewExpiryWarning = false;

  // Reconnect using active config and publish online/state.
  if (mqttClient->connected()) mqttClient->disconnect();
  WiFi.disconnect();

  bool wifiOk = connectWiFiWithConfig(activeConfig, WIFI_CONNECT_TIMEOUT_MS);
  syncTimeWithConfig(activeConfig, true);
  bool mqttOk = connectMqttWithConfig(activeConfig, true);

  if (mqttOk) {
    publishOnline(true);
    publishState();
    publishTelemetry();
    publishEvent("config_applied", "local_setup", "", 0);
  }

  if (wifiOk && !activeConfig.keepSetupApEnabled) {
    disableSetupApIfAllowed();
  } else {
    enableSetupAp(false);
  }

  DynamicJsonDocument res(768);
  res["ok"] = true;
  res["savePending"] = true;
  res["wifiConnected"] = wifiOk;
  res["timeSynced"] = timeSynced;
  res["serverConnected"] = mqttOk;
  res["promoted"] = true;
  res["activeConfigId"] = activeConfig.configId;
  res["activeConfigVersion"] = activeConfig.configVersion;

  sendJson(res);
}

void handleChangePin() {
  DynamicJsonDocument req(256);
  DeserializationError err = deserializeJson(req, server.arg("plain"));
  if (err) {
    sendError(400, "bad_json", "Body JSON không hợp lệ.");
    return;
  }

  String oldPin = (const char *)(req["oldPin"] | "");
  String newPin = (const char *)(req["newPin"] | "");

  String errorCode, errorMessage;
  if (!changePin(oldPin, newPin, errorCode, errorMessage)) {
    sendError(errorCode == "pin_locked" ? 429 : 400, errorCode, errorMessage);
    return;
  }

  DynamicJsonDocument res(256);
  res["ok"] = true;
  res["message"] = "PIN đã được cập nhật.";
  sendJson(res);
}

void handleReboot() {
  DynamicJsonDocument res(128);
  res["ok"] = true;
  res["message"] = "rebooting";
  sendJson(res);
  delay(300);
  ESP.restart();
}

void handleNotFound() {
  sendError(404, "not_found", "Not found.");
}

// ================= BUTTON HANDLING =================
void handleSetupButton() {
  static bool lastPressed = false;
  static unsigned long pressedAt = 0;
  static bool action5Done = false;
  static bool action10Done = false;
  static bool action20Done = false;

  bool pressed = digitalRead(SETUP_BUTTON_PIN) == LOW;

  if (pressed && !lastPressed) {
    pressedAt = millis();
    action5Done = false;
    action10Done = false;
    action20Done = false;
  }

  if (pressed) {
    unsigned long held = millis() - pressedAt;

    if (held >= 5000 && !action5Done) {
      action5Done = true;
      enableSetupAp(true);
      Serial.println("[BUTTON] Setup AP temporary enabled.");
    }

    if (held >= 10000 && !action10Done) {
      action10Done = true;
      resetPinToDefault();
      Serial.println("[BUTTON] PIN reset.");
    }

    if (held >= 20000 && !action20Done) {
      action20Done = true;
      Serial.println("[BUTTON] Factory reset config.");
      deleteFileIfExists(CONFIG_ACTIVE_PATH);
      deleteFileIfExists(CONFIG_PENDING_PATH);
      deleteFileIfExists(CONFIG_BACKUP_PATH);
      hasActiveConfig = false;
      enableSetupAp(false);
    }
  }

  lastPressed = pressed;
}

// ================= BOOT CONNECTION =================
void connectActiveServices() {
  if (!hasActiveConfig) {
    enableSetupAp(false);
    return;
  }

  bool wifiOk = connectWiFiWithConfig(activeConfig, WIFI_CONNECT_TIMEOUT_MS);
  if (!wifiOk) {
    enableSetupAp(false);
    return;
  }

  syncTimeWithConfig(activeConfig, true);

  if (isExpiredIfTimeKnown(activeConfig)) {
    Serial.println("[CONFIG] Active config expired. Keeping AP enabled.");
    enableSetupAp(false);
    return;
  }

  bool mqttOk = connectMqttWithConfig(activeConfig, true);
  if (mqttOk) {
    publishOnline(true);
    publishState();
    publishTelemetry();
    publishEvent("boot", "system", "", 0);
  }

  if (wifiOk && !activeConfig.keepSetupApEnabled) {
    disableSetupApIfAllowed();
  } else {
    enableSetupAp(false);
  }
}

// ================= SETUP / LOOP =================
void setup() {
  Serial.begin(115200);
  delay(200);

  pinMode(LED_PIN, OUTPUT);
  pinMode(SETUP_BUTTON_PIN, INPUT_PULLUP);

  feederServo.attach(FEEDER_PIN, 500, 2500);
  applyDoorState(false);

  if (!LittleFS.begin()) {
    Serial.println("[FS] LittleFS mount FAILED");
  }

  loadSetupPin();
  loadBootState();
  loadActiveOrBackup();

  WiFi.mode(WIFI_AP_STA);

  // Always enable Setup AP on boot to allow easy OTA/Config upload
  enableSetupAp(false);

  server.on("/", HTTP_GET, handleRoot);
  server.on("/api/ping", HTTP_GET, handlePing);
  server.on("/api/status", HTTP_GET, handleStatus);
  server.on("/upload", HTTP_POST, handleUploadDone, handleUpload);
  server.on("/api/config/apply", HTTP_POST, handleApplyConfig);
  server.on("/api/setup-pin/change", HTTP_POST, handleChangePin);
  server.on("/api/reboot", HTTP_POST, handleReboot);
  server.onNotFound(handleNotFound);
  server.begin();

  Serial.println();
  Serial.println("===== PET FEEDER ESP8266 V4 =====");
  Serial.printf("Machine Code: %s\n", FACTORY_MACHINE_CODE);
  Serial.printf("Has Active Config: %s\n", hasActiveConfig ? "YES" : "NO");
  if (hasActiveConfig) {
    Serial.printf("Device ID: %s\n", activeConfig.deviceId.c_str());
    Serial.printf("Config: %s / v%lu\n", activeConfig.configId.c_str(), (unsigned long)activeConfig.configVersion);
  }
  Serial.printf("Setup AP IP: %s\n", WiFi.softAPIP().toString().c_str());
  Serial.println("=================================");

  connectActiveServices();
}

void loop() {
  server.handleClient();
  handleSetupButton();
  updateTempAp();

  updateFeeding();

  if (hasActiveConfig && WiFi.status() == WL_CONNECTED) {
    syncTimeWithConfig(activeConfig, false);

    if (!mqttClient->connected()) {
      unsigned long now = millis();
      if (now - lastMqttReconnectAttempt > MQTT_RECONNECT_INTERVAL_MS) {
        lastMqttReconnectAttempt = now;
        connectMqttWithConfig(activeConfig, true);
      }
    } else {
      mqttClient->loop();

      unsigned long now = millis();
      if (now - lastTelemetryAt > TELEMETRY_INTERVAL_MS) {
        lastTelemetryAt = now;
        publishTelemetry();
      }
    }
  } else if (hasActiveConfig && WiFi.status() != WL_CONNECTED) {
    // Keep AP available if Wi-Fi is down.
    enableSetupAp(false);
  }

  unsigned long now = millis();
  if (now - lastScheduleCheckAt > SCHEDULE_CHECK_INTERVAL_MS) {
    lastScheduleCheckAt = now;
    checkSchedule();
  }

  delay(2);
}