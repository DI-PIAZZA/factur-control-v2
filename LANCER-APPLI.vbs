Set oShell = CreateObject("WScript.Shell")
oShell.CurrentDirectory = "C:\Dev\factur-control-v2"
oShell.Run "conhost.exe -- cmd.exe /k npm run dev", 1, False
