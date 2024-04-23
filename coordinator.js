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

// Ruta para obtener la hora del coordinador
app.get('/coordinatorTime', async (req, res) => {
  try {

    // Llamar a la función para enviar la hora del coordinador a los servidores
    await enviarHoraAClientes(serversList);
    await recibirDiferenciaHoraClientes(serversList);
    await promedioDiferencias();
    await ajustarHoraCoordinador();
  } catch (error) {
    console.error('Error al obtener la lista de servidores:', error);
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
app.post('/runBerkeleyAlgorithm', async (req, res) => {
  try {
    berkeley();
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
const timeCoordinador =Date();
const enviarHoraAClientes = async (serversList) => {
  const horaFormateada = formatearHora(timeCoordinador);
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



const promedioDiferencias = async () => {
    let totalDiferences = 0;
    for (const diferenciaCliente of diferenciaTime){
      totalDiferences+= diferenciaCliente;
    }

    ajusteHora = totalDiferences / (diferenciaTime.length + 1);
    printLog(`Promedio de diferencias de hora: ${ajusteHora} segundos`);
}


const ajustarHoraCoordinador = async () => {
  let fechaActual = new Date(timeCoordinador);
  fechaActual.setSeconds(fechaActual.getSeconds() + ajusteHora);
  const horaFormateada = formatearHora(fechaActual);
  printLog(`Hora del coordinador actualizada: ${horaFormateada}`);
  // Aquí podrías enviar la nueva hora a los servidores si es necesario
};


// Método principal del algoritmo de Berkeley
const berkeley = async (serversList) => {
  const horasServidores = await obtenerHoraServidores(serversList);
  const promedioTiempo = calcularPromedio(horasServidores);
  horasServidores.forEach(async item => {
      const diferencia = calcularDiferenciaTiempo(item.hora, promedioTiempo);
      console.log(`Diferencia de tiempo para el servidor ${item.servidor}: ${diferencia}`);
      try {
          const url = `${item.servidor}/ajustarHora`; 
          await axios.post(url, { diferenciaTiempo: diferencia });
          console.log(`Diferencia de tiempo enviada al servidor ${item.servidor}`);
      } catch (error) {
          console.error(`Error al enviar la diferencia de tiempo al servidor ${item.servidor}: ${error.message}`);
      }
  });
};


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


app.get('/', (req, res) => {
  res.send('Hello COORDINATOR!')
})

server.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})