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

let serversList = [];


function printLog(message) {
  const date = new Date().toLocaleDateString();
  const time = new Date().toLocaleTimeString();
  console.log(`[Fecha: ${date}] [Hora: ${time}] [Mensaje: ${message}]`);
}

const port = 3000



//ALGORITMO DE BERKELEY 

// Método para obtener la hora de cada servidor en la lista
const horasServidores = [];
const obtenerHoraServidores = async (serversList) => {
  for (const server of serversList) {
      try {
          const url = `${server}/obtenerHora`; 
          const res = await axios.get(url);
          if (res && res.data && res.data.horaServidor) {
              const horaServidor = res.data.horaServidor;
              horasServidores.push({ servidor: server, hora: horaServidor });
          }
      } catch (error) {
          console.error(`Error al solicitar la hora al servidor ${server}: ${error.message}`);
      }
  }

  return horasServidores;
};


// Método para calcular el promedio de las horas de los servidores
const calcularPromedio = (horasServidores) => {
  let sumaHoras = 0;
  horasServidores.forEach(item => {
      sumaHoras += item.hora;
  });
  return sumaHoras / horasServidores.length;
};


// Método para obtener la diferencia entre el tiempo actual del servidor y el promedio de los tiempos
const calcularDiferenciaTiempo = (horaActualServidor, promedioTiempo) => {
  return horaActualServidor - promedioTiempo;
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




const checkServerStatus = async () => {
  const updatedServersList = [];
  for (const server of serversList) {
      printLog(`Iniciando chequeo para el servidor: ${server} ....`)
      try {
          const url = server + "/monitor/healthchek"
          printLog("Enviando peticiones a:" + url)

          const start = Date.now();
          const res = await axios.get(url)
          if (res) {
              const end = Date.now(); // Momento de recepción de la respuesta
              resTime = end - start;
              printLog(`=>    Tiempo de respuesta del servidor en milisegundos ${server} es ${resTime}ms`)
              if (resTime >= timeout) {
                  serversList.splice(serversList.indexOf(server), 1);
                  printLog(`Servidor ${server} eliminado por exceder el tiempo de respuesta.`);
                  printLog("+++++++++++ Servidores restantes +++++++++++ \n")
                  console.log(serversList)
                  launchNewInstance();
                  io.emit('server_deleted', { server, responseTime: resTime });
              } else {
                  updatedServersList.push({ server, responseTime: resTime });
                  printLog(`=========     Servidor ${server} vivo     =========`)
              }
          }
      } catch (error) {
          serversList.splice(serversList.indexOf(server), 1);
          printLog(`La solicitud fue rechazada, servidor ${server} eliminado`);
          printLog("+++++++++++ Servidores restantes +++++++++++ \n")
          console.log(serversList)
          io.emit('server_deleted', { server, responseTime: null });
          launchNewInstance();
      }
  }
  io.emit('update_servers', { servers: updatedServersList })
};


// Verificar el estado de los servidores cada 5 segundos
setInterval(checkServerStatus, 5000)

io.on('connection', socket => {
  printLog('Cliente conectado: ' + socket.id);


  socket.emit('servers_list' + serversList);

  socket.on('disconnect', () => {
      printLog('Cliente desconectado: ' + socket.id);
  });
});


app.get('/', (req, res) => {
  res.send('Hello COORDINATOR!')
})

server.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})