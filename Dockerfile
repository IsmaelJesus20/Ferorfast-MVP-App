# Usar una imagen ligera de Nginx como base
FROM nginx:alpine

# Copiar los archivos estáticos del repositorio a la carpeta pública de Nginx
COPY . /usr/share/nginx/html
