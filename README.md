# Proyecto TecDuck

## Requisitos

* Node.js (v20 recomendado)
* MariaDB/MySQL

## Instalación

1. Crear base de datos:

```sql
CREATE DATABASE example;
```

2. Importar base:

```
mysql -u root -p example < schema.sql
```

3. Configurar variables de entorno:
   Renombrar `.env.example` a `.env` y llenar datos.

4. Instalar dependencias:

```
npm install
```

5. Ejecutar:

```
node server.js
```
