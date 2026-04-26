use crate::lib::{TelemetryRecord, FlightLog, AppError};
use std::path::PathBuf;
use std::sync::Arc;
use parking_lot::Mutex;
use rusqlite::{Connection, params};
use tracing::info;

pub struct StorageManager {
    conn: Arc<Mutex<Connection>>,
}

impl StorageManager {
    pub fn new(data_dir: PathBuf) -> Result<Self, AppError> {
        std::fs::create_dir_all(&data_dir)?;
        
        let db_path = data_dir.join("manpads.db");
        info!("Opening database at {:?}", db_path);
        
        let conn = Connection::open(&db_path)?;
        
        conn.execute_batch(
            "
            CREATE TABLE IF NOT EXISTS flights (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                metadata TEXT
            );
            
            CREATE TABLE IF NOT EXISTS telemetry (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                flight_id INTEGER NOT NULL,
                timestamp_ms INTEGER NOT NULL,
                roll_deg REAL,
                rotation_rate REAL,
                servo_output INTEGER,
                latitude REAL,
                longitude REAL,
                altitude_m REAL,
                FOREIGN KEY (flight_id) REFERENCES flights(id)
            );
            
            CREATE INDEX IF NOT EXISTS idx_telemetry_flight ON telemetry(flight_id);
            "
        )?;

        Ok(Self {
            conn: Arc::new(Mutex::new(conn)),
        })
    }

    pub fn create_flight(&self, metadata: Option<String>) -> Result<i64, AppError> {
        let timestamp = chrono_lite_timestamp();
        let conn = self.conn.lock();
        
        conn.execute(
            "INSERT INTO flights (timestamp, metadata) VALUES (?1, ?2)",
            params![timestamp, metadata],
        )?;
        
        Ok(conn.last_insert_rowid())
    }

    pub fn get_flights(&self) -> Result<Vec<FlightLog>, AppError> {
        let conn = self.conn.lock();
        let mut stmt = conn.prepare(
            "SELECT id, timestamp, metadata FROM flights ORDER BY id DESC"
        )?;
        
        let flights = stmt.query_map([], |row| {
            Ok(FlightLog {
                id: row.get(0)?,
                timestamp: row.get(1)?,
                metadata: row.get(2)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
        
        Ok(flights)
    }

    pub fn get_telemetry(&self, flight_id: i64) -> Result<Vec<TelemetryRecord>, AppError> {
        let conn = self.conn.lock();
        let mut stmt = conn.prepare(
            "SELECT id, flight_id, timestamp_ms, roll_deg, rotation_rate, servo_output, latitude, longitude, altitude_m
             FROM telemetry WHERE flight_id = ?1 ORDER BY timestamp_ms"
        )?;
        
        let records = stmt.query_map([flight_id], |row| {
            Ok(TelemetryRecord {
                id: row.get(0)?,
                flight_id: row.get(1)?,
                timestamp_ms: row.get(2)?,
                roll_deg: row.get(3)?,
                rotation_rate: row.get(4)?,
                servo_output: row.get(5)?,
                latitude: row.get(6)?,
                longitude: row.get(7)?,
                altitude_m: row.get(8)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
        
        Ok(records)
    }

    pub fn export_csv(&self, flight_id: i64) -> Result<String, AppError> {
        let records = self.get_telemetry(flight_id)?;
        
        let mut csv = String::from("timestamp_ms,roll_deg,rotation_rate,servo_output,latitude,longitude,altitude_m\n");
        
        for record in records {
            csv.push_str(&format!(
                "{},{},{},{},{},{},{}\n",
                record.timestamp_ms,
                record.roll_deg,
                record.rotation_rate,
                record.servo_output,
                record.latitude,
                record.longitude,
                record.altitude_m
            ));
        }
        
        Ok(csv)
    }

    pub fn export_json(&self, flight_id: i64) -> Result<String, AppError> {
        let records = self.get_telemetry(flight_id)?;
        serde_json::to_string_pretty(&records)
            .map_err(|e| AppError::DbError(e.to_string()))
    }

    pub fn append_telemetry(&self, record: &TelemetryRecord) -> Result<(), AppError> {
        let conn = self.conn.lock();
        
        conn.execute(
            "INSERT INTO telemetry (flight_id, timestamp_ms, roll_deg, rotation_rate, servo_output, latitude, longitude, altitude_m)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                record.flight_id,
                record.timestamp_ms,
                record.roll_deg,
                record.rotation_rate,
                record.servo_output,
                record.latitude,
                record.longitude,
                record.altitude_m
            ],
        )?;
        
        Ok(())
    }
}

fn chrono_lite_timestamp() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default();
    
    let secs = now.as_secs();
    let days = secs / 86400;
    let remaining = secs % 86400;
    let hours = remaining / 3600;
    let minutes = (remaining % 3600) / 60;
    let seconds = remaining % 60;
    
    format!("{}:{}:{}", 
        1970 + (days / 365) as i32, 
        hours, 
        minutes * 60 + seconds
    )
}