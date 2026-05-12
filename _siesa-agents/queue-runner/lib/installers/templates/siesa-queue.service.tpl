[Unit]
Description=Siesa Sentinel Queue daemon
After=network-online.target

[Service]
Type=simple
WorkingDirectory={{HOME}}
Environment=NODE_ENV=production
Environment=SIESA_QUEUE_HOME={{SIESA_QUEUE_HOME}}
ExecStart={{NODE_PATH}} {{DISPATCHER_PATH}}
Restart=on-failure
RestartSec=10
StandardOutput=append:{{SIESA_QUEUE_HOME}}/logs/stdout.log
StandardError=append:{{SIESA_QUEUE_HOME}}/logs/stderr.log

[Install]
WantedBy=default.target
