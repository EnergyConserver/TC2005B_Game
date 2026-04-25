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
                {id: user.id_usuario, email: user.correo, rol: user.tipo_usuario},
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
    const { x, y, mundo, nivel } = req.body;

    if (!Number.isInteger(x) || !Number.isInteger(y)) {
        return res.status(400).json({
            status: "error",
            message: "Coordenadas inválidas"
        });
    }

    let conn;
    try {
        conn = await pool.getConnection();

        const rows = await conn.query(`
            SELECT 
                ST_X(coordenada_meta) AS meta_x,
                ST_Y(coordenada_meta) AS meta_y
            FROM niveles n
            JOIN mundos m ON n.id_mundo = m.id_mundo
            WHERE m.orden = ? AND n.orden_nivel = ?
        `, [mundo, nivel]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "Nivel no existe"
            });
        }

        const meta = rows[0];

        const acierto = (x === meta.meta_x && y === meta.meta_y);

        if (acierto) {
            const nivelRow = await conn.query(`
            SELECT n.id_nivel
            FROM niveles n
            JOIN mundos m ON n.id_mundo = m.id_mundo
            WHERE m.orden = ? AND n.orden_nivel = ?
            `, [mundo, nivel]);

            const idNivel = nivelRow[0].id_nivel;

            await conn.query(`
                INSERT INTO progreso_usuario (id_usuario, id_nivel, completado, intentos)
                VALUES (?, ?, 1, 1)
                ON DUPLICATE KEY UPDATE completado = 1
            `, [req.user.id, idNivel]);
        }

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

app.get("/api/nivel", verifyToken, async (req, res) => {
    const mundoNum = Number(req.query.mundo);
    const nivelNum = Number(req.query.nivel);

    let conn;
    try {
        conn = await pool.getConnection();

        if (nivelNum > 1) {
            const nivelPrevio = await conn.query(`
                SELECT n.id_nivel
                FROM niveles n
                JOIN mundos m ON n.id_mundo = m.id_mundo
                WHERE m.orden = ? AND n.orden_nivel = ?
            `, [mundoNum, nivelNum - 1]);

            if (nivelPrevio.length > 0) {
                const progreso = await conn.query(`
                    SELECT completado
                    FROM progreso_usuario
                    WHERE id_usuario = ? AND id_nivel = ?
                `, [req.user.id, nivelPrevio[0].id_nivel]);

                if (!progreso.length || progreso[0].completado !== 1) {
                    return res.status(403).json({
                        status: "error",
                        message: "Debes completar el nivel anterior"
                    });
                }
            }
        }

        if (nivelNum === 1 && mundoNum > 1) {
            const mundoAnterior = mundoNum - 1;

            const totalAnterior = await conn.query(`
                SELECT COUNT(*) AS total
                FROM niveles n
                JOIN mundos m ON n.id_mundo = m.id_mundo
                WHERE m.orden = ?
            `, [mundoAnterior]);

            const completadosAnterior = await conn.query(`
                SELECT COUNT(*) AS total
                FROM progreso_usuario pu
                JOIN niveles n ON pu.id_nivel = n.id_nivel
                JOIN mundos m ON n.id_mundo = m.id_mundo
                WHERE pu.id_usuario = ?
                AND pu.completado = 1
                AND m.orden = ?
            `, [req.user.id, mundoAnterior]);

            if (completadosAnterior[0].total < totalAnterior[0].total) {
                return res.status(403).json({
                    status: "error",
                    message: "Debes completar el mundo anterior"
                });
            }
        }

        const rows = await conn.query(`
            SELECT 
                ST_X(n.coordenada_inicio) AS inicio_x,
                ST_Y(n.coordenada_inicio) AS inicio_y,
                ST_X(n.coordenada_meta) AS meta_x,
                ST_Y(n.coordenada_meta) AS meta_y,
                n.movimientos_max,
                n.pregunta,
                n.hint
            FROM niveles n
            JOIN mundos m ON n.id_mundo = m.id_mundo
            WHERE m.orden = ? AND n.orden_nivel = ?
        `, [mundoNum, nivelNum]);

        if (rows.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "Nivel no encontrado"
            });
        }

        res.json({
            status: "success",
            nivel: rows[0]
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

app.get("/api/siguiente-nivel", verifyToken, async (req, res) => {
    const { mundo, nivel } = req.query;

    let conn;
    try {
        conn = await pool.getConnection();

        const rows = await conn.query(`
            SELECT 1
            FROM niveles n
            JOIN mundos m ON n.id_mundo = m.id_mundo
            WHERE m.orden = ? AND n.orden_nivel = ?
        `, [mundo, Number(nivel) + 1]);

        res.json({
            existe: rows.length > 0
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