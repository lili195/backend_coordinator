const axios = require('axios');
const { Server } = require('socket.io');
const express = require('express');
const http = require('http')
const cors = require('cors')


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

let serversList = ['http://localhost:16000', ];
let timeout = 10000; 
let diferenciaTime = [];
let ajusteHora = 0;

function printLog(message) {
  const date = new Date().toLocaleDateString();
  const time = new Date().toLocaleTimeString();
  console.log(`[Fecha: ${date}] [Hora: ${time}] [Mensaje: ${message}]`);
}

const port = 3000


// Ruta para obtener la lista de servidores
app.get('/servers', async (req, res) => {
  try {
    res.json(serversList);
  } catch (error) {
    console.error('Error al obtener la lista de servidores:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Ruta para lanzar una nueva instancia
app.post('/launchInstance', async (req, res) => {
  try {
    // Codigo Nueva Instancia
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

//ALGORITMO DE BERKELEY 

// Método para formatear la hora en formato HORA-MINUTOS-SEGUNDOS-MILISEGUNDOS
const formatearHora = (hora) => {
  const fecha = new Date(hora);
  const horaFormateada = `${fecha.getHours()}:${fecha.getMinutes()}:${fecha.getSeconds()}:${fecha.getMilliseconds()}`;
  return horaFormateada;
};

// Método para enviar la hora del cliente a cada servidor en la lista

const enviarHoraAClientes = async (initialTimeCoordinador, serversList) => {
  let horaFormateada = formatearHora(initialTimeCoordinador);
  for (const server of serversList) {
    try {
      const url = `${server}/horaCoordinador`;
      const res = await axios.post(url, { horaCliente: horaFormateada });
      printLog('Hora del coordinador --> ' + horaFormateada + ' enviada correctamente a --> ' + server);
    } catch (error) {
      console.error(`Error al enviar la hora del coordinador a ${server}: ${error.message}`);
    }
  }
};



// Método para recibir la diferencia de horas de cada cliente en la lista
const recibirDiferenciaHoraClientes = async (serversList) => {
  try {
    for (const server of serversList) {
      const url = `${server}/diferenciaHora`;
      const res = await axios.post(url);
      const diferencia = res.data.diferencia; 
      diferenciaTime.push(diferencia);
      printLog(`Diferencia de hora recibida del cliente del cliente --> ${server} --> DIFERENCIA ${diferencia} segundos`);
    }
  } catch (error) {
    console.error(`Error al recibir la diferencia de hora de los clientes: ${error.message}`);
  }
};


// Método para calcular el promedio de las diferencias de hora
const promedioDiferencias = async () => {
  try {
    let totalDiferences = 0;
    for (const diferenciaCliente of diferenciaTime){
      totalDiferences+= diferenciaCliente;
    }

    ajusteHora = totalDiferences / (diferenciaTime.length + 1);
    printLog(`Promedio de diferencias de hora: ${ajusteHora} segundos`);
  } catch (error) {
    console.error(`Error al calcular el promedio de diferencias de hora: ${error.message}`);
  }
}

//  Método para ajustar la hora del coordinador
const ajustarHoraCoordinador = async (initialTimeCoordinador) => {
  let adjustedTimeCoordinador = new Date(initialTimeCoordinador);
  adjustedTimeCoordinador.setSeconds(adjustedTimeCoordinador.getSeconds() + ajusteHora);
  const horaFormateada = formatearHora(adjustedTimeCoordinador);
  printLog(`Hora del coordinador actualizada: ${horaFormateada}`);
  // ENVIAR NUEVA HORA A LOS SERVIDORES
};


// Método principal del algoritmo de Berkeley
const berkeley = async () => {
  let initialTimeCoordinador = new Date();
  await enviarHoraAClientes(initialTimeCoordinador, serversList);
  await recibirDiferenciaHoraClientes(serversList);
  await promedioDiferencias();
  await ajustarHoraCoordinador(initialTimeCoordinador);
}



// const checkServerStatus = async () => {
//   const updatedServersList = [];
//   for (const server of serversList) {
//       printLog(`Iniciando chequeo para el servidor: ${server} ....`)
//       try {
//           const url = server + "/coordinador/healthcheck"
//           printLog("Enviando peticiones a:" + url)

//           const start = Date.now();
//           const res = await axios.get(url)
//           if (res) {
//               const end = Date.now();
//               resTime = end - start;
//               printLog(`=>    Tiempo de respuesta del servidor en milisegundos ${server} es ${resTime}ms`)
//               if (resTime >= timeout) {
//                   serversList.splice(serversList.indexOf(server), 1);
//                   printLog(`Servidor ${server} eliminado por exceder el tiempo de respuesta.`);
//                   printLog("+++++++++++ Servidores restantes +++++++++++ \n")
//                   console.log(serversList)
//                   io.emit('server_deleted', { server, responseTime: resTime });
//               } else {
//                   updatedServersList.push({ server, responseTime: resTime });
//                   printLog(`=========     Servidor ${server} vivo     =========`)
//               }
//           }
//       } catch (error) {
//           serversList.splice(serversList.indexOf(server), 1);
//           printLog(`La solicitud fue rechazada, servidor ${server} eliminado`);
//           printLog("+++++++++++ Servidores restantes +++++++++++ \n")
//           console.log(serversList)
//           io.emit('server_deleted', { server, responseTime: null });
//       }
//   }
//   io.emit('update_servers', { servers: updatedServersList })
// };


// // Verificar el estado de los servidores cada 5 segundos
// setInterval(checkServerStatus, 5000)

// io.on('connection', socket => {
//   printLog('Cliente conectado: ' + socket.id);


//   socket.emit('servers_list' + serversList);

//   socket.on('disconnect', () => {
//       printLog('Cliente desconectado: ' + socket.id);
//   });
// });


server.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})