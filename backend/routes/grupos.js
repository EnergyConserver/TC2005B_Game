const express = require("express");
const router = express.Router();

const pool = require("../db/pool");
const { verifyToken, verifyRole } = require("../middleware/auth");

router.post("/grupos", verifyToken, async (req, res) => {
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

router.post("/grupos/unirse", verifyToken, async (req, res) => {
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

router.get("/mis-grupos", verifyToken, async (req, res) => {
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

router.get("/grupos/:id/alumnos", verifyToken, verifyRole("profesor"), async (req, res) => {
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

router.get("/grupos/:id/estadisticas", verifyToken, verifyRole("profesor"), async (req, res) => {
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

router.get("/grupos-profesor", verifyToken, verifyRole("profesor"), async (req, res) => {
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

router.delete("/grupos/:id", verifyToken, verifyRole("profesor"), async (req, res) => {
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

module.exports = router;