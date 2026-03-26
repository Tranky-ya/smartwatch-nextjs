FROM node:18-alpine

# Crear directorio de trabajo
WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependencias
RUN npm install --production

# Copiar código fuente
COPY . .

# Crear directorio de logs
RUN mkdir -p logs

# Exponer puertos
EXPOSE 7070 3001

# Comando de inicio
CMD ["npm", "start"]
