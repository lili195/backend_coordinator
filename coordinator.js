const axios = require('axios');
const { Server } = require('socket.io');
const express = require('express');
const http = require('http')
const cors = require('cors')
const { spawn } = require('child_process');


const app = express();

app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true
}))

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    }
});


const port = 3000
let serversList = [];
let timeout = 10000; 
let diferenciaTime = [];
let ajusteHora = 0;

function printLog(message) {
  const date = new Date().toLocaleDateString();
  const time = new Date().toLocaleTimeString();
  const logMessage = `[Fecha: ${date}] [Hora: ${time}] [Mensaje: ${message}]`;
  console.log(logMessage);
  sendLogsToClient(logMessage)
}

function sendLogsToClient(logs) {
  io.emit('logs', { logs: logs });
}


// Ruta para obtener la hora del coordinador
app.get('/coordinatorTime', async (req, res) => {
  try {
    let horaFront = new Date;
    res.json(horaFront);
  } catch (error) {
    console.error('Error al obtener la hora del coordinador', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Ruta para obtener la lista de servidores
app.get('/servers', async (req, res) => {
  try {
    res.json(serversList);
  } catch (error) {
    console.error('Error al obtener la lista de servidores:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});


let port_new_instance = 16000
let ip_container = 'http://localhost'

function launchNewInstance() {
  printLog("               **********************************************************")
  printLog('Lanzando nueva instancia...');
  const scriptPath = 'build_new_back_instance.bat';
  
  const currentPort = port_new_instance;
  port_new_instance++;

  const batProcess = spawn('cmd', ['/c', scriptPath, currentPort]);

  /**AGREGAR EL NUEVO CLIENTE A LA LISTA DE SERVIDORES */
  serversList.push(`${ip_container}:${currentPort}`)
  printLog("SERVIDORES EN EL ARREGLO: " + serversList)
  /** */

  printLog("NUEVO PUERTO:" + currentPort)

  // Captura y muestra la salida estándar del proceso
  batProcess.stdout.on('data', (data) => {
    printLog("[[ Sistema anfitrión dice ]]: " + data.toString());
  });

  // Captura y muestra la salida de error del proceso
  batProcess.stderr.on('data', (data) => {
    console.error('Ocurrió un error:', data.toString());
    printLog("Intentando de nuevo....")
    launchNewInstance();
  });

  // Maneja los eventos de cierre del proceso
  batProcess.on('close', (code) => {
    printLog('Proceso de nueva instancia finalizado con código de salida', code);
    });
}


// Ruta para lanzar una nueva instancia
app.post('/launchInstance', async (req, res) => {
  try {
    printLog('Solicitud POST para lanzar una nueva instancia')
    printLog('Iniciaindo proceso para lanzar una nueva instancia.....')
    launchNewInstance();
    res.json({ message: 'Nueva instancia lanzada correctamente' });
  } catch (error) {
    console.error('Error al lanzar una nueva instancia:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Ruta para ejecutar el algoritmo de Berkeley
app.get('/runBerkeleyAlgorithm', async (req, res) => {
  try {
    await berkeley();
    res.json({ message: 'Algoritmo de Berkeley ejecutado correctamente' });
  } catch (error) {
    console.error('Error al ejecutar el algoritmo de Berkeley:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Ruta para monitorear servidores
app.get('/checkServerStatus', async (req, res) => {
  try {
    await checkServerStatus();
    res.json({ message: 'SERVICIO MONITOREO COMPLETO' });
  } catch (error) {
    console.error('Error al ejecutar el servicio de Monitoreo:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

//ALGORITMO DE BERKELEY 

// Método principal del algoritmo de Berkeley
const berkeley = async () => {
  let initialTimeCoordinador = new Date();
  await enviarHoraAClientes(initialTimeCoordinador, serversList);
  await recibirDiferenciaHoraClientes(serversList);
  await promedioDiferencias();
  await ajustarHoraCoordinador(initialTimeCoordinador);
  //await ajustarHoraCoordinadorEnviarServidores(initialTimeCoordinador, serversList,adjustedTimeCoordinador);
}

// Método para formatear la hora en formato HORA-MINUTOS-SEGUNDOS-MILISEGUNDOS
const formatearHora = (hora) => {
  const fecha = new Date(hora);
  const horaFormateada = `${fecha.getHours()}:${fecha.getMinutes()}:${fecha.getSeconds()}:${fecha.getMilliseconds()}`;
  return horaFormateada;
};

// Método para enviar la hora del cliente a cada servidor en la lista

const enviarHoraAClientes = async (initialTimeCoordinador, serversList) => {
  let horaCoordinador = initialTimeCoordinador;
  let horaFormateada = formatearHora(initialTimeCoordinador);
  for (const server of serversList) {
    try {
      const url = `${server}/horaCoordinador`;
      const res = await axios.post(url, { horaCliente: horaCoordinador });
      printLog('Hora del coordinador --> ' + horaFormateada + ' enviada correctamente a --> ' + server);
    } catch (error) {
      console.error(`Error al enviar la hora del coordinador a ${server}: ${error.message}`);
    }
  }
};


// Método para recibir la diferencia de horas de cada cliente en la lista
const recibirDiferenciaHoraClientes = async (serversList) => {
  try {

      diferenciaTime = [];
      for (const server of serversList) {
          const response = await axios.post(`${server}/diferenciaHora`);
          const diferenciaHora = response.data;
          printLog(`Diferencia de hora recibida del servidor ${server}: ${diferenciaHora}`);
          diferenciaTime.push({server: server, diferencia: diferenciaHora});
      }
  } catch (error) {
      console.error('Error al recibir la diferencia de hora de los clientes:', error);
      throw error;
  }
};

// Método para calcular el promedio de las diferencias de hora
const promedioDiferencias = async () => {
  try {
    let totalDiferences = 0;
    for (const diferenciaCliente of diferenciaTime){
      totalDiferences+= diferenciaCliente.diferencia;
    }
    printLog('Total DIFERENCIAS -->' + totalDiferences)


    ajusteHora = Math.abs(totalDiferences / (diferenciaTime.length + 1));
    printLog(`PROMEDIO DIFERENCIAS --> ${totalDiferences} / ${diferenciaTime.length} + 1`);
    printLog(`Promedio de diferencias de hora: ${ajusteHora} minutos`);
  } catch (error) {
    console.error(`Error al calcular el promedio de diferencias de hora: ${error.message}`);
  }
}

let horaActualizada =0;
// Método para ajustar la hora del coordinador
const ajustarHoraCoordinador = async (initialTimeCoordinador) => {
  let adjustedTimeCoordinador = new Date(initialTimeCoordinador); // Crear una nueva instancia de Date para evitar modificar la hora original

  // Obtener los componentes de tiempo actuales
  const horas = adjustedTimeCoordinador.getHours();
  const minutos = adjustedTimeCoordinador.getMinutes();
  const segundos = adjustedTimeCoordinador.getSeconds();
  const milisegundos = adjustedTimeCoordinador.getMilliseconds();

  // Calcular la cantidad total de minutos a agregar
  const minutosAgregar = Math.floor(ajusteHora);
  const segundosAgregar = Math.floor((ajusteHora - minutosAgregar) * 60); // Convertir el exceso de minutos en segundos
  const milisegundosAgregar = Math.floor((ajusteHora - minutosAgregar - segundosAgregar / 60) * 60000); // Convertir el exceso de segundos en milisegundos

  // Sumar los minutos, segundos y milisegundos
  let minutosActualizados = minutos + minutosAgregar;
  let segundosActualizados = segundos + segundosAgregar;
  let milisegundosActualizados = milisegundos + milisegundosAgregar;

  // Ajustar los segundos si hay exceso de milisegundos
  if (milisegundosActualizados >= 1000) {
    segundosActualizados += Math.floor(milisegundosActualizados / 1000);
    milisegundosActualizados %= 1000;
  }

  // Ajustar los minutos si hay exceso de segundos
  if (segundosActualizados >= 60) {
    minutosActualizados += Math.floor(segundosActualizados / 60);
    segundosActualizados %= 60;
  }

  // Ajustar las horas si hay exceso de minutos
  if (minutosActualizados >= 60) {
    horas += Math.floor(minutosActualizados / 60);
    minutosActualizados %= 60;
  }

  // Establecer los nuevos valores de hora
  adjustedTimeCoordinador.setHours(horas);
  adjustedTimeCoordinador.setMinutes(minutosActualizados);
  adjustedTimeCoordinador.setSeconds(segundosActualizados);
  adjustedTimeCoordinador.setMilliseconds(milisegundosActualizados);

  horaActualizada = adjustedTimeCoordinador;
  printLog(`Hora del coordinador actualizada: ${formatearHora(horaActualizada)}`);
  printLog(`AJUSTANDO HORA CLIENTES .... `);
  // ENVIAR NUEVA HORA A LOS SERVIDORES
  ajusteServidores();

};

const ajusteServidores = async () => {
  try {
    for (let i = 0; i < diferenciaTime.length; i++) {
      diferenciaTime[i].diferencia = (-diferenciaTime[i].diferencia)
      diferenciaTime[i].diferencia = diferenciaTime[i].diferencia + ajusteHora
      
      printLog(`Enviando ajuste a ${diferenciaTime[i].server}. Diferencia: ${diferenciaTime[i].diferencia}`);
      try {
        const url = `${diferenciaTime[i].server}/ajustarHora`;
        const res = await axios.post(url, { ajuste: diferenciaTime[i].diferencia });
      
      printLog(`Respuesta del servidor ${diferenciaTime[i].server}: ${res.data}`);
      } catch (error) {
        console.error(`Error al enviar el ajuste a los servidores: ${error.message}`);
      }
    }
  } catch (error) {
    console.error(`Error al calcular el ajuste de los servidores: ${error.message}`);
  }
}



const checkServerStatus = async () => {
  const updatedServersList = [];
  for (const server of serversList) {
      printLog(`Iniciando chequeo para el servidor: ${server} ....`)
      try {
          const url = server + "/coordinador/healthcheck"
          printLog("Enviando peticiones a:" + url)

          const start = Date.now();
          const res = await axios.get(url)
          if (res) {
              const end = Date.now();
              resTime = end - start;
              printLog(`=>    Tiempo de respuesta del servidor en milisegundos ${server} es ${resTime}ms`)
              if (resTime >= timeout) {
                  serversList.splice(serversList.indexOf(server), 1);
                  io.emit('server_deleted', { server, responseTime: resTime });
                  printLog(`Servidor ${server} eliminado por exceder el tiempo de respuesta.`);
                  printLog("+++++++++++ Servidores restantes +++++++++++ \n")
                  printLog(serversList)
              } else {
                  updatedServersList.push({ server, responseTime: resTime });
                  printLog(`=========     Servidor ${server} vivo     =========`)
              }
          }
      } catch (error) {
          serversList.splice(serversList.indexOf(server), 1);
          io.emit('server_deleted', { server, responseTime: null });
          printLog(`La solicitud fue rechazada, servidor ${server} eliminado`);
          printLog("+++++++++++ Servidores restantes +++++++++++ \n")
          printLog(serversList)
      }
  }
  io.emit('update_servers', { servers: updatedServersList })
};




io.on('connection', socket => {
  printLog('Cliente conectado: ' + socket.id);


  socket.emit('servers_list' + serversList);

  socket.on('disconnect', () => {
      printLog('Cliente desconectado: ' + socket.id);
  });
});


server.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})