use std::path::PathBuf;
use std::sync::Mutex;
use tracing::{info, error};
use tracing_subscriber::{fmt, layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

lazy_static::lazy_static! {
    static ref LOG_FILE_PATH: Mutex<Option<PathBuf>> = Mutex::new(None);
}

pub fn init_logging(log_dir: Option<PathBuf>) -> Result<(), String> {
    if let Some(dir) = &log_dir {
        std::fs::create_dir_all(dir).map_err(|e| e.to_string())?;
        let log_path = dir.join("manpads.log");
        *LOG_FILE_PATH.lock().unwrap() = Some(log_path);
    }

    let filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new("info"));

    let subscriber = tracing_subscriber::registry()
        .with(filter)
        .with(fmt::layer().with_target(true));

    if let Some(path) = LOG_FILE_PATH.lock().unwrap().as_ref() {
        let file = std::fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(path)
            .map_err(|e| e.to_string())?;
        let file_layer = fmt::layer()
            .with_writer(Mutex::new(file))
            .with_ansi(false)
            .with_target(true);
        subscriber.with(file_layer).init();
    } else {
        subscriber.init();
    }

    info!("Logging initialized");
    Ok(())
}

pub fn log_state_transition(from: &str, to: &str) {
    info!("STATE_TRANSITION: {} -> {}", from, to);
}

pub fn log_command(cmd: &str, params: Option<&str>) {
    if let Some(p) = params {
        info!("COMMAND: {} with params {}", cmd, p);
    } else {
        info!("COMMAND: {}", cmd);
    }
}

pub fn log_error(context: &str, err: &str) {
    error!("ERROR [{}]: {}", context, err);
}

pub fn log_telemetry(packet_count: usize, valid_count: usize) {
    info!("TELEMETRY: {} packets, {} valid", packet_count, valid_count);
}