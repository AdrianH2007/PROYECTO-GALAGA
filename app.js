const express = require('express');
const app = express();
const port = 3000;
const { MongoClient } = require('mongodb');
const path = require('path');

app.use(express.json());

app.use(express.static(__dirname));

// Forzar explícitamente que la ruta principal devuelva el archivo index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Configuración de la conexión a MongoDB desde Docker
const url = process.env.MONGO_URL || 'mongodb://localhost:27017';
const client = new MongoClient(url);

async function main() {
    // Conectar al contenedor de MongoDB
    await client.connect();
    console.log('Connected successfully to MongoDB');
    
    const db = client.db('mydatabase');
    const collection = db.collection('documents');

    // 2. RUTAS DE LA API PARA LOS DATOS 
    app.get('/api/scores', async (req, res) => {
        try {
            const docs = await collection.find({}).toArray();
            res.send(docs);
        } catch (error) {
            res.status(500).send({ error: "Error al obtener datos" });
        }
    });

    // Iniciar el servidor Express en el puerto 3000
    app.listen(port, () => {
        console.log(`App listening at http://localhost:${port}`);
    });
}

main().catch(console.error);