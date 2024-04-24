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

//let serversList = ['http://localhost:16000',];
let serversList = [];
let timeout = 10000;


function printLog(message) {
  const date = new Date().toLocaleDateString();
  const time = new Date().toLocaleTimeString();
  console.log(`[Fecha: ${date}] [Hora: ${time}] [Mensaje: ${message}]`);
}

const port = 3000

// Ruta para obtener la hora del coordinador
app.get('/coordinatorTime', async (req, res) => {
  try {
    const timeCoordinador = Date.now();
    res.json(timeCoordinador);
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

let port_new_instance = 16000

function launchNewInstance() {
  console.log("               **********************************************************")
  printLog('Lanzando nueva instancia...');
  const scriptPath = 'build_new_back_instance.bat';
  const batProcess = spawn('cmd', ['/c', scriptPath, port_new_instance]);
  port_new_instance = ++port_new_instance;

  /**AGREGAR EL NUEVO CLIENTE A LA LISTA DE SERVIDORES */
  serversList.push(`http://localhost:${port_new_instance}`)
  /** */

  console.log("NUEVO PUERTO:" + port_new_instance)

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
    printLog('Esperando 20 segundos antes de iniciar nuevos chequeos de estado...');
    setTimeout(() => {
      printLog('Iniciando nuevos chequeos de estado...');
      checkServerStatus();
    }, 120000); // Esperar 2 minutos (120000 ms) antes de iniciar nuevos chequeos de estado
  });
}


// Ruta para lanzar una nueva instancia
app.post('/launchInstance', async (req, res) => {
  try {
    // Codigo Nueva Instancia
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
          printLog(`Servidor ${server} eliminado por exceder el tiempo de respuesta.`);
          printLog("+++++++++++ Servidores restantes +++++++++++ \n")
          console.log(serversList)
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