FROM node:20-alpine

# Sécurité : user non-root
RUN addgroup -S app && adduser -S app -G app

WORKDIR /app

# Copier uniquement les fichiers nécessaires au build
COPY package.json package-lock.json ./

RUN npm ci --omit=dev

# Copier le reste du code
COPY . .

ENV NODE_ENV=production

# Droits utilisateur
USER app

EXPOSE 8080

CMD ["npm", "start"]
