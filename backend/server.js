require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../frontend"), {
    index: false
}));

// rutas
app.use("/api", require("./routes/auth"));
app.use("/api", require("./routes/juego"));
app.use("/api", require("./routes/tienda"));
app.use("/api", require("./routes/grupos"));
app.use("/", require("./routes/paginas"));

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Servidor en http://localhost:${PORT}`);
});