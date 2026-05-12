<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>            <string>com.siesa.queue.watchdog</string>
  <key>ProgramArguments</key>
  <array>
    <string>{{NODE_PATH}}</string>
    <string>{{WATCHDOG_PATH}}</string>
  </array>
  <key>StartInterval</key>    <integer>300</integer>
  <key>RunAtLoad</key>        <true/>
  <key>StandardOutPath</key>  <string>{{SIESA_QUEUE_HOME}}/logs/watchdog.log</string>
  <key>StandardErrorPath</key><string>{{SIESA_QUEUE_HOME}}/logs/watchdog.log</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>SIESA_QUEUE_HOME</key><string>{{SIESA_QUEUE_HOME}}</string>
  </dict>
</dict>
</plist>
