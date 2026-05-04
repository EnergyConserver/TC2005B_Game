const express = require("express");
const router = express.Router();

const pool = require("../db/pool");
const { verifyToken } = require("../middleware/auth");

router.post("/jugar", verifyToken, async (req, res) => {
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

            if (usoHint) {
                puntos -= 20;
            }

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

router.get("/nivel", verifyToken, async (req, res) => {
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
                n.hint,
                n.tipo,
                n.id_nivel
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

        let vectores = [];

        if (rows[0].tipo === "vectores") {
            vectores = await conn.query(`
                SELECT dx, dy, orden
                FROM vectores_nivel
                WHERE id_nivel = ?
                ORDER BY orden
            `, [rows[0].id_nivel]);
        }
        
        let pregunta = rows[0].pregunta;

        // Si es nivel de vectores, construir pregunta dinámica
        if (rows[0].tipo === "vectores") {
            const textoVectores = vectores
            .map(v => `(${v.dx}, ${v.dy})`)
            .join("\n↓\n");

            pregunta = `Sigue los vectores en orden: \n\n${textoVectores}`;
        }

        res.json({
            status: "success",
            nivel: {
                ...rows[0],
                pregunta
            },
            vectores: vectores
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

router.get("/siguiente-nivel", verifyToken, async (req, res) => {
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

router.get("/progreso-mundo", verifyToken, async (req, res) => {
    const { mundo } = req.query;

    let conn;
    try {
        conn = await pool.getConnection();

        const niveles = await conn.query(`
            SELECT 
                n.orden_nivel,
                CASE 
                    WHEN pu.completado = 1 THEN 'completado'
                    ELSE 'disponible'
                END AS estado
            FROM niveles n
            JOIN mundos m ON n.id_mundo = m.id_mundo
            LEFT JOIN progreso_usuario pu 
                ON pu.id_nivel = n.id_nivel 
                AND pu.id_usuario = ?
            WHERE m.orden = ?
            ORDER BY n.orden_nivel
        `, [req.user.id, mundo]);

        res.json({ niveles });

    } catch (err) {
        res.status(500).json({ status: "error" });
    } finally {
        if (conn) conn.release();
    }
});

module.exports = router;