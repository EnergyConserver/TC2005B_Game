module.exports = {
  apps: [
    {
      name: "mi-backend",
      script: "./server.js",
      cwd: "/var/www/tecduck.com/backend",
      env: {
        NODE_ENV: "production",
      }
    }
  ]
};
