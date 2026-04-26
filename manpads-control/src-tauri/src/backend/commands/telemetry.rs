use crate::lib::{TelemetryRecord, FlightLog, AppError};
use crate::backend::storage::repository::StorageManager;
use std::sync::Arc;
use std::path::PathBuf;
use tauri::State;
use parking_lot::Mutex;
use std::collections::VecDeque;

const MAX_BUFFER_SIZE: usize = 1000;

pub struct StorageState {
    pub storage: Arc<StorageManager>,
    pub telemetry_buffer: Arc<Mutex<VecDeque<TelemetryRecord>>>,
}

impl StorageState {
    pub fn new(data_dir: PathBuf) -> Result<Self, AppError> {
        let storage = StorageManager::new(data_dir)?;
        Ok(Self { 
            storage: Arc::new(storage), 
            telemetry_buffer: Arc::new(Mutex::new(VecDeque::with_capacity(MAX_BUFFER_SIZE))),
        })
    }
}

pub fn flush_telemetry_buffer(state: &StorageState) {
    let mut buffer = state.telemetry_buffer.lock();
    while let Some(record) = buffer.pop_front() {
        if let Err(e) = state.storage.append_telemetry(&record) {
            eprintln!("Failed to write telemetry: {}", e);
        }
    }
}

#[tauri::command]
pub fn create_flight(
    storage: State<StorageState>,
    metadata: Option<String>,
) -> Result<i64, AppError> {
    storage.storage.create_flight(metadata)
}

#[tauri::command]
pub fn export_flight_csv(
    storage: State<StorageState>,
    flight_id: i64,
) -> Result<String, AppError> {
    storage.storage.export_csv(flight_id)
}

#[tauri::command]
pub fn export_flight_json(
    storage: State<StorageState>,
    flight_id: i64,
) -> Result<String, AppError> {
    storage.storage.export_json(flight_id)
}

#[tauri::command]
pub fn get_flights(
    storage: State<StorageState>,
) -> Result<Vec<FlightLog>, AppError> {
    storage.storage.get_flights()
}

#[tauri::command]
pub fn get_telemetry_data(
    storage: State<StorageState>,
    flight_id: i64,
) -> Result<Vec<TelemetryRecord>, AppError> {
    storage.storage.get_telemetry(flight_id)
}

#[tauri::command]
pub fn buffer_telemetry(
    storage: State<StorageState>,
    record: TelemetryRecord,
) -> Result<(), AppError> {
    let mut buffer = storage.telemetry_buffer.lock();
    if buffer.len() >= MAX_BUFFER_SIZE {
        buffer.pop_front();
    }
    buffer.push_back(record);
    
    if buffer.len() >= 50 {
        drop(buffer);
        flush_telemetry_buffer(&storage);
    }
    
    Ok(())
}

#[tauri::command]
pub fn flush_telemetry(
    storage: State<StorageState>,
) -> Result<(), AppError> {
    flush_telemetry_buffer(&storage);
    Ok(())
}

#[tauri::command]
pub fn get_buffered_telemetry(
    storage: State<StorageState>,
) -> Result<Vec<TelemetryRecord>, AppError> {
    Ok(storage.telemetry_buffer.lock().iter().cloned().collect())
}