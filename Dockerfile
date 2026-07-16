# 1. Usa la imagen oficial de Node.js versión 20 como base
FROM node:20

# 2. Establece el directorio de trabajo dentro del contenedor
WORKDIR /app

# 3. Copia los archivos de configuración de dependencias primero
COPY package*.json ./

# 4. Instala las dependencias del proyecto (express y mongodb)
RUN npm install

# 5. Copia el resto de los archivos del proyecto (index.html, app.js, scrip.js, style.css)
COPY . .

# 6. Informa que el contenedor va a escuchar en el puerto 3000
EXPOSE 3000

# 7. Comando definitivo para arrancar el servidor de Node.js
CMD ["node", "app.js"]