@call "%~dp0\..\node_modules\.bin\tsc" %*

@IF EXIST "%~dp0\node.exe" (  
  "%~dp0\node.exe"  "%~dp0\..\esc"
) ELSE (
  node  "%~dp0\..\esc"
)