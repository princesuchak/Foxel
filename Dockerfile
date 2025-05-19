FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS base
WORKDIR /app
EXPOSE 8080  
EXPOSE 8081
EXPOSE 80    

FROM oven/bun:alpine AS build-frontend
WORKDIR /src/View
COPY View/package*.json ./
RUN bun install
COPY View/ ./
RUN bun run build

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src
COPY ["Foxel.csproj", "./"]
RUN dotnet restore "Foxel.csproj"
COPY . .
WORKDIR "/src/"
RUN dotnet build "./Foxel.csproj" -c $BUILD_CONFIGURATION -o /app/build

FROM build AS publish
ARG BUILD_CONFIGURATION=Release
RUN dotnet publish "./Foxel.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
ENV DEFAULT_CONNECTION="YourDefaultConnectionStringHere"
COPY --from=publish /app/publish .
RUN apt-get update && apt-get install -y nginx && rm -rf /var/lib/apt/lists/*
COPY --from=build-frontend /src/View/dist /var/www/html
COPY /View/nginx.conf /etc/nginx/nginx.conf

RUN mkdir -p /var/lib/nginx/body /var/cache/nginx /var/run/nginx /app/Uploads \
    && chown -R $APP_UID:$APP_UID /var/lib/nginx /var/cache/nginx /var/run/nginx /var/log/nginx /etc/nginx /var/www/html /app/Uploads \
    && mkdir -p /run \
    && chmod 777 /run

RUN echo '#!/bin/bash\n\
    # 启动nginx\n\
    nginx -g "daemon off;" &\n\
    \n\
    # 启动.NET应用程序\n\
    dotnet Foxel.dll\n\
    ' > /start.sh && chmod +x /start.sh

RUN mkdir -p /home/app/.aspnet/DataProtection-Keys \
    && chown -R $APP_UID:$APP_UID /home/app/.aspnet

USER $APP_UID
ENTRYPOINT ["/start.sh"]