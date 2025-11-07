# Etap 1: Budowanie aplikacji React
FROM node:20-alpine as build-stage

WORKDIR /app

# Kopiowanie package.json i package-lock.json
COPY package.json package-lock.json ./

# Instalacja zależności
RUN npm install

# Kopiowanie reszty plików aplikacji
COPY . .

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
