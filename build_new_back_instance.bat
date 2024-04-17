@echo off

rem **Recibe el número como parámetro**

rem Si el segundo parámetro está vacío, se muestra un error

set "port_number=%1"

if "%port_number%"=="" (
  echo Error: Debe ingresar un número como parámetro.
  exit 1
)

rem **Muestra el número recibido**
echo Número recibido: %port_number%


rem **Recibe la ip como parámetro**

set "ip_addr=%2"

if "%ip_addr%"=="" (
  echo Error: Debe ingresar un número como parámetro.
  exit 1
)

echo ip recibida: %ip_addr%
rem Si el tercer parámetro está vacío, se muestra un error



rem **Crear las variables necesarias**

set "container_name=backend_%port_number%"
set "db_url=postgres://postgres:1234@%ip_addr%:5432/postgres"
set "balancer_url=http://%ip_addr%:3000"
set "monitor_url=http://%ip_addr%:3001"


rem **Construir el comando para ejecutar el contenedor"

set "docker_run_command=docker run -d --name %container_name% -e PORT=%port_number% -e DATABASE_URL=%db_url% -e BALANCER_URL=%balancer_url% -e MONITOR_URL=%monitor_url% -e IP_ADDRESS=%ip_addr% -p %port_number%:%port_number% backend"

rem **Mostrar el comando creado**

echo Docker run command: %docker_run_command%

rem **Ejecutar el comando creado**

%docker_run_command%

rem **pausar el script**
pause

rem **Cierra la ventana del símbolo del sistema**
exit