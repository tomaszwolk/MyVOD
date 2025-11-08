# Etap 1: Budowanie aplikacji React
FROM node:20-alpine AS build-stage

WORKDIR /app

# Deklaracja argumentu, który zostanie przekazany jako zmienna środowiskowa
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

# Kopiowanie package.json i package-lock.json z podfolderu myVOD
COPY myVOD/package.json myVOD/package-lock.json ./

# Instalacja zależności
RUN npm install

# Kopiowanie reszty plików aplikacji z podfolderu myVOD
COPY myVOD/. .

# Budowanie aplikacji produkcyjnej
RUN npm run build

# Etap 2: Serwowanie aplikacji przez Nginx
FROM nginx:1.27-alpine

# Deklarujemy argument, który będzie przekazany ze zmiennej środowiskowej
ARG VITE_API_URL

# Kopiujemy zbudowane pliki
COPY --from=build-stage /app/dist /usr/share/nginx/html

# Kopiujemy szablon Nginx
COPY nginx/nginx.conf.template /etc/nginx/templates/default.conf.template

# Ustawienie portu
EXPOSE 80

# Uruchomienie Nginx
CMD ["nginx", "-g", "daemon off;"]
