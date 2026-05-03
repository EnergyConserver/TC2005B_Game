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
                {id: user.id_usuario, email: user.correo, nombre: user.nombre, rol: user.tipo_usuario},
                SECRET,
                { expiresIn: '24hr' }
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
    const { nombre, email, password } = req.body;

    if (!nombre || nombre.trim().length < 2) {
        return res.json({
            status: "error",
            message: "Se debe insertar un nombre de más de 2 carácteres"
        });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.json({
            status: "error",
            message: "Se debe insertar un correo válido"
        });
    }

    if (!password || password.length < 6) {
        return res.json({
            status: "error",
            message: "La contraseña debe tener al menos 6 caracteres"
        });
    }

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
            "INSERT INTO usuarios (nombre, correo, contraseña, tipo_usuario) VALUES (?, ?, ?, 'alumno')",
            [nombre, email, hashedPassword]
        );

        const token = jwt.sign(
            {id: Number(result.insertId), email: email, nombre: nombre, rol: "alumno"},
            SECRET,
            {expiresIn: '24hr'}
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
    const { x, y, mundo, nivel, intentos, usoHint } = req.body;

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
            let puntos = 100;

            if (intentos === 1) {
                puntos += 50;
            }

            puntos -= (intentos - 1) * 10;
            if (puntos < 10) puntos = 10;
            
            const nivelRow = await conn.query(`
            SELECT n.id_nivel
            FROM niveles n
            JOIN mundos m ON n.id_mundo = m.id_mundo
            WHERE m.orden = ? AND n.orden_nivel = ?
            `, [mundo, nivel]);

            const idNivel = nivelRow[0].id_nivel;

            let yaCompletado = await conn.query(`
                SELECT completado
                FROM progreso_usuario
                WHERE id_usuario = ? AND id_nivel = ?
            `, [req.user.id, idNivel]);

            let primeraVez = false;

            if (!yaCompletado.length || yaCompletado[0].completado !== 1) {
                primeraVez = true;
            }

            if (primeraVez) {
                await conn.query(`
                    UPDATE usuarios
                    SET monedas = monedas + 100
                    WHERE id_usuario = ?
                `, [req.user.id]);
            } else {
                await conn.query(`
                    UPDATE usuarios
                    SET monedas = monedas + 10
                    WHERE id_usuario = ?
                `, [req.user.id]);
            }

            await conn.query(`
                INSERT INTO progreso_usuario
                (id_usuario, id_nivel, completado, intentos, uso_explicacion, puntaje)
                VALUES (?, ?, 1, ?, ?, ?)
                ON DUPLICATE KEY UPDATE 
                completado = 1,
                intentos = LEAST(intentos, VALUES(intentos)),
                uso_explicacion = uso_explicacion OR VALUES(uso_explicacion),
                puntaje = GREATEST(puntaje, VALUES(puntaje))
            `, [req.user.id, idNivel, intentos, usoHint ? 1 : 0, puntos]);
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

app.get("/api/tienda", verifyToken, async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();

        const cosmeticos = await conn.query(`
            SELECT 
                c.id_cosmetico,
                c.tipo_cosmetico,
                c.precio,
                c.nombre,
                c.imagen,
                cu.id_usuario IS NOT NULL AS comprado,
                cu.activo
            FROM cosmeticos c
            LEFT JOIN cosmeticos_usuario cu 
                ON c.id_cosmetico = cu.id_cosmetico 
                AND cu.id_usuario = ?
        `, [req.user.id]);

        res.json({
            status: "success",
            cosmeticos
        });

    } catch (err) {
        res.status(500).json({ status: "error" });
    } finally {
        if (conn) conn.release();
    }
});

app.post("/api/comprar", verifyToken, async (req, res) => {
    const { id_cosmetico } = req.body;

    let conn;
    try {
        conn = await pool.getConnection();

        const [cosmetico] = await conn.query(
            "SELECT precio FROM cosmeticos WHERE id_cosmetico = ?",
            [id_cosmetico]
        );

        if (!cosmetico) {
            return res.status(404).json({ message: "No existe" });
        }

        const [user] = await conn.query(
            "SELECT monedas FROM usuarios WHERE id_usuario = ?",
            [req.user.id]
        );

        if (user.monedas < cosmetico.precio) {
            return res.json({
                status: "error",
                message: "No tienes monedas suficientes"
            });
        }

        // restar monedas
        await conn.query(
            "UPDATE usuarios SET monedas = monedas - ? WHERE id_usuario = ?",
            [cosmetico.precio, req.user.id]
        );

        // guardar compra
        await conn.query(`
            INSERT INTO cosmeticos_usuario (id_usuario, id_cosmetico, activo)
            VALUES (?, ?, 0)
        `, [req.user.id, id_cosmetico]);

        res.json({ status: "success" });

    } catch (err) {
        res.status(500).json({ status: "error" });
    } finally {
        if (conn) conn.release();
    }
});

app.post("/api/equipar", verifyToken, async (req, res) => {
    const { id_cosmetico } = req.body;

    let conn;
    try {
        conn = await pool.getConnection();

        const [cosmetico] = await conn.query(
            "SELECT tipo_cosmetico FROM cosmeticos WHERE id_cosmetico = ?",
            [id_cosmetico]
        );

        if (!cosmetico) {
            return res.status(404).json({ status: "error" });
        }

        // desactivar mismo tipo
        await conn.query(`
            UPDATE cosmeticos_usuario cu
            JOIN cosmeticos c ON cu.id_cosmetico = c.id_cosmetico
            SET cu.activo = 0
            WHERE cu.id_usuario = ? AND c.tipo_cosmetico = ?
        `, [req.user.id, cosmetico.tipo_cosmetico]);

        // activar el seleccionado
        await conn.query(`
            UPDATE cosmeticos_usuario
            SET activo = 1
            WHERE id_usuario = ? AND id_cosmetico = ?
        `, [req.user.id, id_cosmetico]);

        res.json({ status: "success" });

    } catch (err) {
        res.status(500).json({ status: "error" });
    } finally {
        if (conn) conn.release();
    }
});

app.post("/api/quitar", verifyToken, async (req, res) => {
    const { id_cosmetico } = req.body;

    let conn;
    try {
        conn = await pool.getConnection();

        await conn.query(`
            UPDATE cosmeticos_usuario
            SET activo = 0
            WHERE id_usuario = ? AND id_cosmetico = ?
        `, [req.user.id, id_cosmetico]);

        res.json({ status: "success" });

    } catch (err) {
        res.status(500).json({ status: "error" });
    } finally {
        if (conn) conn.release();
    }
});

app.get("/api/avatar", verifyToken, async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();

        const rows = await conn.query(`
            SELECT c.tipo_cosmetico, c.imagen
            FROM cosmeticos_usuario cu
            JOIN cosmeticos c ON cu.id_cosmetico = c.id_cosmetico
            WHERE cu.id_usuario = ? AND cu.activo = 1
        `, [req.user.id]);

        res.json({
            status: "success",
            avatar: rows
        });

    } catch (err) {
        res.status(500).json({ status: "error" });
    } finally {
        if (conn) conn.release();
    }
});

app.get("/api/monedas", verifyToken, async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();

        const rows = await conn.query(
            "SELECT monedas FROM usuarios WHERE id_usuario = ?",
            [req.user.id]
        );

        res.json({
            monedas: rows[0].monedas
        });

    } finally {
        if (conn) conn.release();
    }
});

app.post("/api/grupos", verifyToken, async (req, res) => {
    const { nombre } = req.body;

    const codigo = Math.random().toString(36).substring(2, 8).toUpperCase();

    let conn;
    try {
        conn = await pool.getConnection();

        await conn.query(
            "INSERT INTO grupos (nombre, codigo_acceso, id_profesor) VALUES (?, ?, ?)",
            [nombre, codigo, req.user.id]
        );

        res.json({ status: "success", codigo });

    } catch (err) {
        console.error(err);
        res.status(500).json({ 
            status: "error",
            message: "Error al crear el grupo" 
        });
    } finally {
        if (conn) conn.release();
    }
});

app.post("/api/grupos/unirse", verifyToken, async (req, res) => {
    const { codigo } = req.body;

    let conn;
    try {
        conn = await pool.getConnection();

        const [grupo] = await conn.query(
            "SELECT id_grupo FROM grupos WHERE codigo_acceso = ?",
            [codigo]
        );

        if (!grupo) {
            return res.json({ status: "error", message: "Código inválido" });
        }

        await conn.query(
            "INSERT INTO grupos_usuario (id_usuario, id_grupo) VALUES (?, ?) ON DUPLICATE KEY UPDATE id_usuario = id_usuario;",
            [req.user.id, grupo.id_grupo]
        );

        res.json({ status: "success" });

    } catch (err) {
        res.status(500).json({ status: "error" });
    } finally {
        if (conn) conn.release();
    }
});

app.get("/api/mis-grupos", verifyToken, async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();

        const grupos = await conn.query(`
            SELECT g.*
            FROM grupos g
            JOIN grupos_usuario gu ON g.id_grupo = gu.id_grupo
            WHERE gu.id_usuario = ?
        `, [req.user.id]);

        res.json({ grupos });

    } finally {
        if (conn) conn.release();
    }
});

app.get("/api/grupos/:id/alumnos", verifyToken, verifyRole("profesor"), async (req, res) => {
    const { id } = req.params;

    let conn;
    try {
        conn = await pool.getConnection();

        const alumnos = await conn.query(`
            SELECT u.id_usuario, u.correo
            FROM usuarios u
            JOIN grupos_usuario gu ON u.id_usuario = gu.id_usuario
            WHERE gu.id_grupo = ?
        `, [id]);

        res.json({ alumnos });

    } finally {
        if (conn) conn.release();
    }
});

app.get("/api/grupos/:id/estadisticas", verifyToken, verifyRole("profesor"), async (req, res) => {
    const { id } = req.params;

    let conn;
    try {
        conn = await pool.getConnection();

        const alumnos = await conn.query(`
            SELECT 
                u.correo AS correo,
                u.nombre AS nombre,
                COUNT(DISTINCT pu.id_nivel) AS niveles,
                COUNT(DISTINCT m.id_mundo) AS mundos,
                SUM(pu.puntaje) AS puntaje

            FROM usuarios u

            JOIN grupos_usuario gu 
                ON u.id_usuario = gu.id_usuario

            LEFT JOIN progreso_usuario pu 
                ON u.id_usuario = pu.id_usuario 
                AND pu.completado = 1

            LEFT JOIN niveles n 
                ON pu.id_nivel = n.id_nivel

            LEFT JOIN mundos m 
                ON n.id_mundo = m.id_mundo

            WHERE gu.id_grupo = ?

            AND (
                m.id_mundo IS NULL OR NOT EXISTS (
                    SELECT 1
                    FROM niveles n2
                    WHERE n2.id_mundo = m.id_mundo
                    AND NOT EXISTS (
                        SELECT 1
                        FROM progreso_usuario pu2
                        WHERE pu2.id_nivel = n2.id_nivel
                        AND pu2.id_usuario = u.id_usuario
                        AND pu2.completado = 1
                    )
                )
            )

            GROUP BY u.id_usuario
        `, [id]);

        res.json({
            alumnos: alumnos.map(a => ({
                correo: a.correo,
                nombre: a.nombre,
                niveles: Number(a.niveles),
                mundos: Number(a.mundos),
                puntaje: Number(a.puntaje)
            }))
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ status: "error" });
    } finally {
        if (conn) conn.release();
    }
});

app.get("/api/grupos-profesor", verifyToken, verifyRole("profesor"), async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();

        const grupos = await conn.query(
            "SELECT * FROM grupos WHERE id_profesor = ?",
            [req.user.id]
        );

        res.json({ grupos });

    } finally {
        if (conn) conn.release();
    }
});

app.delete("/api/grupos/:id", verifyToken, verifyRole("profesor"), async (req, res) => {
    const { id } = req.params;

    let conn;
    try {
        conn = await pool.getConnection();

        const [grupo] = await conn.query(
            "SELECT * FROM grupos WHERE id_grupo = ? AND id_profesor = ?",
            [id, req.user.id]
        );

        if (!grupo) {
            return res.status(403).json({
                status: "error",
                message: "No autorizado para eliminar este grupo"
            });
        }

        await conn.query(
            "DELETE FROM grupos WHERE id_grupo = ?",
            [id]
        );

        res.json({
            status: "success",
            message: "Grupo eliminado correctamente"
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

app.get("/tienda", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/tienda.html"));
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