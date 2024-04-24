@echo off

rem **Recibe el número de puerto como parámetro**
set "port_number=%1"

rem **Muestra el puerto recibido**
echo Número recibido: %port_number%


rem **Crear las variables necesarias**

set "container_name=client_%port_number%"

rem **Construir el comando para ejecutar el contenedor"

set "docker_run_command=docker run -d --name %container_name% -e PORT=%port_number% -p %port_number%:%port_number% berkeley_client"

rem **Mostrar el comando creado**

echo Docker run command: %docker_run_command%

rem **Ejecutar el comando creado**

%docker_run_command%
