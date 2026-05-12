<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>            <string>com.siesa.queue</string>
  <key>ProgramArguments</key>
  <array>
    <string>{{NODE_PATH}}</string>
    <string>{{DISPATCHER_PATH}}</string>
  </array>
  <key>RunAtLoad</key>        <true/>
  <key>KeepAlive</key>        <dict><key>SuccessfulExit</key><false/></dict>
  <key>StandardOutPath</key>  <string>{{SIESA_QUEUE_HOME}}/logs/stdout.log</string>
  <key>StandardErrorPath</key><string>{{SIESA_QUEUE_HOME}}/logs/stderr.log</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>SIESA_QUEUE_HOME</key><string>{{SIESA_QUEUE_HOME}}</string>
  </dict>
</dict>
</plist>
