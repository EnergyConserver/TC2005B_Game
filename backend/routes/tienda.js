const express = require("express");
const router = express.Router();

const pool = require("../db/pool");
const { verifyToken } = require("../middleware/auth");

router.get("/tienda", verifyToken, async (req, res) => {
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

router.post("/comprar", verifyToken, async (req, res) => {
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

router.post("/equipar", verifyToken, async (req, res) => {
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

router.post("/quitar", verifyToken, async (req, res) => {
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

router.get("/avatar", verifyToken, async (req, res) => {
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

router.get("/monedas", verifyToken, async (req, res) => {
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

module.exports = router;