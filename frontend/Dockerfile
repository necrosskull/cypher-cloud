FROM node:22-alpine

WORKDIR /app

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install

COPY frontend/ .

RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]
