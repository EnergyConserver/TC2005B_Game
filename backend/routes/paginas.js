const express = require("express");
const router = express.Router();
const path = require("path");

const paginas = [
    "home", "login", "register", "perfil",
    "mundos", "niveles", "juego",
    "tienda", "dashboard", "admin"
];

router.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../../frontend/index.html"));
});

paginas.forEach(p => {
    router.get(`/${p}`, (req, res) => {
        res.sendFile(path.join(__dirname, `../../frontend/${p}.html`));
    });
});

module.exports = router;