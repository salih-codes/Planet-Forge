use std::sync::Mutex;
use tauri::{Manager, WindowEvent};
use tauri_plugin_shell::ShellExt;

struct SimProcess(Mutex<Option<tauri_plugin_shell::process::CommandChild>>);

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_shell::init())
    .setup(|app| {
      // Logging is enabled in every build (not just debug) so packaged apps
      // still write logs to the OS log directory — essential for diagnosing
      // whether the simulation sidecar started and stayed up.
      app.handle().plugin(
        tauri_plugin_log::Builder::default()
          .level(log::LevelFilter::Info)
          .build(),
      )?;

      // Port the simulation sidecar listens on (and the frontend connects to).
      let port = 8000;

      // Inject the port as a global so the webview knows where to reach the sim.
      if let Some(window) = app.get_webview_window("main") {
        let _ = window.eval(&format!("window.__SIM_PORT__ = {};", port));
      }

      let mut child_process = None;

      // Spawn the Python simulation sidecar (release builds only; in dev it is
      // run separately via `nx run sim:serve`). Failures are logged rather than
      // silently ignored — a missing/crashed sidecar is why the app would show
      // no systems at all.
      #[cfg(not(debug_assertions))]
      {
        match app.shell().sidecar("planet-sim") {
          Ok(sidecar_cmd) => {
            let sidecar_cmd = sidecar_cmd
              .env("SIM_PORT", port.to_string())
              .env("SIM_HOST", "127.0.0.1");

            match sidecar_cmd.spawn() {
              Ok((mut rx, child)) => {
                log::info!("planet-sim sidecar started on 127.0.0.1:{}", port);
                child_process = Some(child);

                // Pipe the sidecar's output into the log and report if it dies.
                tauri::async_runtime::spawn(async move {
                  while let Some(event) = rx.recv().await {
                    match event {
                      tauri_plugin_shell::process::CommandEvent::Stdout(line) => {
                        print!("{}", String::from_utf8_lossy(&line));
                      }
                      tauri_plugin_shell::process::CommandEvent::Stderr(line) => {
                        eprint!("{}", String::from_utf8_lossy(&line));
                      }
                      tauri_plugin_shell::process::CommandEvent::Error(err) => {
                        log::error!("planet-sim sidecar error: {}", err);
                      }
                      tauri_plugin_shell::process::CommandEvent::Terminated(payload) => {
                        log::error!("planet-sim sidecar exited: {:?}", payload);
                      }
                      _ => {}
                    }
                  }
                });
              }
              Err(err) => {
                log::error!("Failed to spawn planet-sim sidecar: {}", err);
              }
            }
          }
          Err(err) => {
            log::error!("planet-sim sidecar could not be resolved: {}", err);
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
