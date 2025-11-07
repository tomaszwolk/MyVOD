# Etap 1: Budowanie aplikacji React
FROM node:20-alpine AS build-stage

WORKDIR /app

# Deklaracja argumentu budowania
ARG VITE_API_URL

# Kopiowanie package.json i package-lock.json z podfolderu myVOD
COPY myVOD/package.json myVOD/package-lock.json ./

# Instalacja zależności
RUN npm install

# Kopiowanie reszty plików aplikacji z podfolderu myVOD
COPY myVOD/. .

# Stworzenie pliku .env na podstawie argumentu - teraz we właściwym miejscu
RUN echo "VITE_API_URL=${VITE_API_URL}" > .env

# Budowanie aplikacji produkcyjnej
RUN npm run build

# Etap 2: Serwowanie aplikacji przez Nginx
FROM nginx:1.27-alpine

# Kopiowanie zbudowanych plików z etapu budowania
COPY --from=build-stage /app/dist /usr/share/nginx/html

# Kopiowanie konfiguracji Nginx (zostanie utworzona w kolejnym kroku)
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf

# Ustawienie portu
EXPOSE 80

# Uruchomienie Nginx
CMD ["nginx", "-g", "daemon off;"]
