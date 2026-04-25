require("dotenv").config();
const express = require("express");
const mariadb = require("mariadb");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const cors = require("cors");
const path = require("path");
const jwt = require("jsonwebtoken");
const { decode } = require("punycode");

const SECRET = process.env.JWT_SECRET;

const app = express();
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "../frontend"), {
    index: false
}));

// conexión a MariaDB
const pool = mariadb.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: 5
});

const verifyToken = (req, res, next) => {
    const authheaders = req.headers["authorization"];
    const token = authheaders && authheaders.split(" ")[1];
    if (!token) {
        return res.status(401).json({
            status: "error",
            message: "No autorizado"
        });
    }
    jwt.verify(token, SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({
                status: "error",
                message: "Sesión expirada"
            });
        }
        req.user = decoded;
        next();
    });
};

const verifyRole = (rolPermitido) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.redirect("/");
        }

        if (req.user.rol !== rolPermitido) {
            return res.redirect("/home");
        }

        next();
    };
};

app.get("/verification", verifyToken, (req, res) => {
    res.json({
        status: "success",
        message: "Acceso concedido",
        usuario: req.user
    });
});

app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    let conn;
    try {
        conn = await pool.getConnection();

        const rows = await conn.query(
            "SELECT * FROM usuarios WHERE correo = ?",
            [email]
        );

        const user = rows[0];

        if (!user) {
            return res.json({
                status: "error",
                message: "Usuario o contraseña incorrecta"
            });
        }
        
        const match = await bcrypt.compare(password, user.contraseña);

        if (match) {
            const token = jwt.sign(
                {id: user.id, email: user.correo, rol: user.tipo_usuario},
                SECRET,
                { expiresIn: '1hr' }
            );

            return res.json({
                status: "success",
                message: "Login correcto",
                token: token
            });
        } else {
            res.json({
                status: "error",
                message: "Usuario o contraseña incorrecta"
            });
        }
    } catch (err) {
        console.error(err);
        res.json({
            status: "error",
            message: "Error en servidor"
        });
    } finally {
        if (conn) conn.release();
    }
});

app.post("/register", async (req, res) => {
    const { email, password } = req.body;

    let conn;
    try {
        conn = await pool.getConnection();

        const existing = await conn.query(
            "SELECT * FROM usuarios WHERE correo = ?",
            [email]
        );

        if (existing.length > 0) {
            return res.json({
                status: "error",
                message: "El usuario ya existe"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await conn.query(
            "INSERT INTO usuarios (correo, contraseña, tipo_usuario) VALUES (?, ?, 'alumno')",
            [email, hashedPassword]
        );

        const token = jwt.sign(
            {id: Number(result.insertId), email: email, rol: "alumno"},
            SECRET,
            {expiresIn: '1hr'}
        )

        res.json({
            status: "success",
            message: "Usuario creado correctamente",
            token: token
        });

    } catch (err) {
        console.error(err);
        res.json({
            status: "error",
            message: "Error al registrar"
        });
    } finally {
        if (conn) conn.release();
    }
});

app.post("/admin/crear-profesor", verifyToken, verifyRole("admin"), async (req, res) => {
    const { email, password } = req.body;

    let conn;
    try {
        conn = await pool.getConnection();

        const existing = await conn.query(
            "SELECT * FROM usuarios WHERE correo = ?",
            [email]
        );

        if (existing.length > 0) {
            return res.json({
                status: "error",
                message: "El usuario ya existe"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await conn.query(
            "INSERT INTO usuarios (correo, contraseña, tipo_usuario) VALUES (?, ?, 'profesor')",
            [email, hashedPassword]
        );

        res.json({
            status: "success",
            message: "Profesor creado"
        });

    } catch (err) {
        console.error(err);
        res.json({
            status: "error",
            message: "Error del servidor"
        });
    } finally {
        if (conn) conn.release();
    }
});

app.post("/api/jugar", verifyToken, async (req, res) => {
    const { x, y, nivel } = req.body;

    if (!Number.isInteger(x) || !Number.isInteger(y)) {
        return res.status(400).json({
            status: "error",
            message: "Coordenadas inválidas"
        });
    }

    let conn;
    try {
        conn = await pool.getConnection();

        const rows = await conn.query(
            "SELECT meta_x, meta_y FROM niveles WHERE id = ?",
            [nivel]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "Nivel no existe"
            });
        }

        const meta = rows[0];

        const acierto = (x === meta.meta_x && y === meta.meta_y);

        res.json({
            status: "success",
            resultado: acierto ? "acierto" : "fallo"
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({
            status: "error",
            message: "Error del servidor"
        });
    } finally {
        if (conn) conn.release();
    }
});

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

app.get("/home", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/home.html"));
});

app.get("/login", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/login.html"));
});

app.get("/register", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/register.html"));
});

app.get("/perfil", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/perfil.html"));
});

app.get("/mundos", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/mundos.html"));
});

app.get("/niveles", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/niveles.html"));
});

app.get("/juego", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/juego.html"));
});

app.get("/dashboard",(req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/dashboard.html"));
});

app.get("/admin",(req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/admin.html"));
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Servidor en http://localhost:${PORT}`);
});