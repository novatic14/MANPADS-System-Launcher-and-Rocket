/*
 * ROCKET ESP32 CODE (Flight Computer + Stabilization)
 * V4 - Final stable build with Physical Skew Telemetry
 */

#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <ESP32Servo.h>
#include <esp_task_wdt.h>

const int RX2_PIN = 16;
const int TX2_PIN = 17;
const int IGNITE_SERVO_PIN = 5;

const int LEFT_SERVO_PIN = 26;
const int RIGHT_SERVO_PIN = 25;
const int UP_SERVO_PIN = 27;
const int DOWN_SERVO_PIN = 14;

const int IGNITE_SERVO_ON = 150;
const int IGNITE_SERVO_OFF = 35;

const int LEFT_CENTER = 115;
const int RIGHT_CENTER = 80;
const int UP_CENTER = 80;
const int DOWN_CENTER = 115;
const int MAX_DEFLECTION = 12;

Servo igniteServo;
Servo leftServo, rightServo, upServo, downServo;
Adafruit_MPU6050 mpu;

String sysState = "IDLE"; 
float Kp = 0.5;
float Kd = 0.2;
String cmdBuffer = ""; 

float roll = 0;
float gyroX_offset = 0;
float physical_skew_angle = 0.0;

unsigned long last_time;
unsigned long lastTelemetrySent = 0;
unsigned long lastReadySent = 0;
unsigned long igniteStartTime = 0;

void calibrateGyro() {
    float sumGyroX = 0, sumAccY = 0, sumAccZ = 0;
    int samples = 200;
    for (int i = 0; i < samples; i++) {
        sensors_event_t a, g, temp;
        mpu.getEvent(&a, &g, &temp);
        sumGyroX += g.gyro.x;
        sumAccY += a.acceleration.y;
        sumAccZ += a.acceleration.z;
        delay(5);
    }
    gyroX_offset = sumGyroX / samples;
    float avgY = sumAccY / samples;
    float avgZ = sumAccZ / samples;
    physical_skew_angle = atan2(avgY, avgZ) * 180.0 / PI; 
    roll = 0.0; 
    last_time = millis(); 
}

void setup() {
    Serial.begin(115200); 
    Serial2.begin(115200, SERIAL_8N1, RX2_PIN, TX2_PIN); 
    Serial2.setTimeout(20); 
    delay(1500); 
    Wire.begin(21, 22);
    if (mpu.begin()) {
        mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
        mpu.setGyroRange(MPU6050_RANGE_500_DEG);
        mpu.setFilterBandwidth(MPU6050_BAND_10_HZ);
    }
    ESP32PWM::allocateTimer(0);
    ESP32PWM::allocateTimer(1);
    igniteServo.setPeriodHertz(50);
    igniteServo.attach(IGNITE_SERVO_PIN);
    igniteServo.write(IGNITE_SERVO_OFF); 
    leftServo.setPeriodHertz(50);   leftServo.attach(LEFT_SERVO_PIN, 500, 2400);
    rightServo.setPeriodHertz(50);  rightServo.attach(RIGHT_SERVO_PIN, 500, 2400);
    upServo.setPeriodHertz(50);     upServo.attach(UP_SERVO_PIN, 500, 2400);
    downServo.setPeriodHertz(50);   downServo.attach(DOWN_SERVO_PIN, 500, 2400);
    leftServo.write(LEFT_CENTER);
    rightServo.write(RIGHT_CENTER);
    upServo.write(UP_CENTER);
    downServo.write(DOWN_CENTER);
    calibrateGyro();
    esp_task_wdt_init(5, true);  // 5 second timeout, panic on trigger
    esp_task_wdt_add(NULL);
}

void loop() {
    unsigned long current_time = millis();
    float dt = (current_time - last_time) / 1000.0;
    if (dt <= 0) dt = 0.001; 
    last_time = current_time;

    sensors_event_t a, g, temp;
    mpu.getEvent(&a, &g, &temp);

    float raw_rate_rad = g.gyro.x - gyroX_offset;
    float rate_deg_s = raw_rate_rad * 180.0 / PI;
    roll += rate_deg_s * dt;

    float output = (Kp * roll) + (Kd * rate_deg_s);
    int servo_offset = constrain((int)output, -MAX_DEFLECTION, MAX_DEFLECTION);

    if (sysState == "FLIGHT") {
        leftServo.write(LEFT_CENTER + servo_offset);
        rightServo.write(RIGHT_CENTER + servo_offset);
        upServo.write(UP_CENTER + servo_offset);
        downServo.write(DOWN_CENTER + servo_offset);
    } else {
        leftServo.write(LEFT_CENTER);
        rightServo.write(RIGHT_CENTER);
        upServo.write(UP_CENTER);
        downServo.write(DOWN_CENTER);
        servo_offset = 0; 
    }

    if (sysState == "IGNITING" && (current_time - igniteStartTime > 2500)) {
        igniteServo.write(IGNITE_SERVO_OFF);
        sysState = "FLIGHT";          
        Serial2.println("IGNITED");   
    }

    if (current_time - lastTelemetrySent >= 50) {
        // Telemetry payload including Skew Angle
        String payload = "DATA," + String(a.acceleration.x, 2) + "," + 
                         String(a.acceleration.y, 2) + "," + String(a.acceleration.z, 2) + "," +
                         String(roll, 2) + "," + String(rate_deg_s, 2) + "," + 
                         String(servo_offset) + "," + sysState + "," + 
                         String(Kp, 2) + "," + String(Kd, 2) + "," + 
                         String(physical_skew_angle, 2);
        Serial2.println(payload);
        lastTelemetrySent = current_time;
    }

    if (sysState == "IDLE" && (current_time - lastReadySent >= 1000)) {
        Serial2.println("READY");
        lastReadySent = current_time;
    }

    while (Serial2.available()) {
        char c = Serial2.read();
        if (c == '\n') {
            cmdBuffer.trim(); 
            if (cmdBuffer == "ARM" && sysState == "IDLE") { sysState = "ARMED"; calibrateGyro(); }
            else if (cmdBuffer == "IGNITE") { sysState = "IGNITING"; igniteStartTime = millis(); igniteServo.write(IGNITE_SERVO_ON); }
            else if (cmdBuffer == "CALIBRATE") { calibrateGyro(); }
            else if (cmdBuffer.startsWith("PID,")) {
                int c1 = cmdBuffer.indexOf(','), c2 = cmdBuffer.indexOf(',', c1 + 1);
                if (c1 > 0 && c2 > 0) { Kp = cmdBuffer.substring(c1 + 1, c2).toFloat(); Kd = cmdBuffer.substring(c2 + 1).toFloat(); }
            }
            cmdBuffer = ""; 
        } else if (c != '\r') { cmdBuffer += c; }
    }
    esp_task_wdt_reset();  // Feed watchdog
}