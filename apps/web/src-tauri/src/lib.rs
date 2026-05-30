use std::sync::Mutex;
use tauri::{Manager, WindowEvent};
use tauri_plugin_shell::ShellExt;

struct SimProcess(Mutex<Option<tauri_plugin_shell::process::CommandChild>>);

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_shell::init())
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      // Initialize port settings
      let port = 8000;

      // Inject SIM_PORT as a global before the webview loads
      if let Some(window) = app.get_webview_window("main") {
        let _ = window.eval(&format!("window.__SIM_PORT__ = {};", port));
      }

      let mut child_process = None;

      // Spawn the simulation sidecar only in release mode
      #[cfg(not(debug_assertions))]
      {
        if let Ok(sidecar_cmd) = app.shell().sidecar("planet-sim") {
          let sidecar_cmd = sidecar_cmd
            .env("SIM_PORT", &port.to_string())
            .env("SIM_HOST", "127.0.0.1");

          if let Ok((mut rx, child)) = sidecar_cmd.spawn() {
            child_process = Some(child);

            // Spawn background task to pipe sidecar stdout/stderr to rust console
            tauri::async_runtime::spawn(async move {
              while let Some(event) = rx.recv().await {
                match event {
                  tauri_plugin_shell::process::CommandEvent::Stdout(line) => {
                    let s = String::from_utf8_lossy(&line);
                    print!("{}", s);
                  }
                  tauri_plugin_shell::process::CommandEvent::Stderr(line) => {
                    let s = String::from_utf8_lossy(&line);
                    eprint!("{}", s);
                  }
                  _ => {}
                }
              }
            });
          }
        }
      }

      app.manage(SimProcess(Mutex::new(child_process)));
      Ok(())
    })
    .on_window_event(|window, event| {
      if let WindowEvent::CloseRequested { .. } = event {
        if let Some(child) = window.app_handle().state::<SimProcess>().0.lock().unwrap().take() {
          let _ = child.kill();
        }
      }
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
