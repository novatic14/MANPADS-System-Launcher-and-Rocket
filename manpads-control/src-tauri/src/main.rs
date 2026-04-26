#![allow(dead_code)]
#![allow(special_module_name)]

mod backend;
pub mod lib;

use std::path::PathBuf;
use tracing_subscriber::{fmt, prelude::*, EnvFilter};
use backend::commands;
use backend::commands::telemetry::StorageState;

fn setup_logging() {
    let filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new("info"));
    
    tracing_subscriber::registry()
        .with(fmt::layer())
        .with(filter)
        .init();
    
    tracing::info!("MANPADS Control Panel starting...");
}

fn get_data_dir() -> Option<PathBuf> {
    #[cfg(target_os = "macos")]
    {
        dirs::home_dir().map(|h| h.join("Library/Application Support/manpads-control"))
    }
    #[cfg(not(target_os = "macos"))]
    {
        std::env::var("APPDATA").ok().map(PathBuf::from).map(|p| p.join("manpads-control"))
    }
}

fn main() {
    setup_logging();

    let storage_state = get_data_dir()
        .and_then(|path| StorageState::new(path).ok());

    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::new()
            .target(tauri_plugin_log::Target::new(
                tauri_plugin_log::TargetKind::Stdout,
            ))
            .target(tauri_plugin_log::Target::new(
                tauri_plugin_log::TargetKind::LogDir { file_name: Some("manpads.log".to_string()) },
            ))
            .build())
        .plugin(tauri_plugin_shell::init());
    
    if let Some(storage) = storage_state {
        tracing::info!("Storage initialized successfully");
        builder = builder.manage(storage);
    }
    
    builder
        .invoke_handler(tauri::generate_handler![
            commands::connectivity::connect,
            commands::connectivity::disconnect,
            commands::connectivity::send_command,
            commands::connectivity::start_telemetry_stream,
            commands::connectivity::stop_telemetry_stream,
            commands::connectivity::get_connection_status,
            commands::control::update_pid,
            commands::telemetry::create_flight,
            commands::telemetry::export_flight_csv,
            commands::telemetry::get_flights,
            commands::telemetry::get_telemetry_data,
            commands::telemetry::buffer_telemetry,
            commands::telemetry::flush_telemetry,
        ])
        .run(tauri::generate_context!())
        .expect("Failed to run Tauri application");
}