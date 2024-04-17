const express = require('express');
const cors = require('cors')
const app = express();

app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true
}))

const port = 3000

app.get('/', (req, res) => {
  res.send('Hello COORDINATOR!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})