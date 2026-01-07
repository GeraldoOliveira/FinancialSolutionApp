### Multi Stage Build ###

# 1 - Source e gerar build
FROM node:latest AS ng-builder
RUN mkdir -p /app
WORKDIR /app
COPY package.json /app
RUN npm install
COPY . /app
RUN npm run build

# 2 - Servidor
FROM nginx
COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=ng-builder /app/dist/financial-front-end/browser /usr/share/nginx/html

EXPOSE 80