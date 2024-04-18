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