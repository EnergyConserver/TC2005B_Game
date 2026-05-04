const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const pool = require("../db/pool");
const { verifyToken, verifyRole } = require("../middleware/auth");

const SECRET = process.env.JWT_SECRET;

router.get("/verification", verifyToken, (req, res) => {
    res.json({
        status: "success",
        message: "Acceso concedido",
        usuario: req.user
    });
});

router.post("/login", async (req, res) => {
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

router.post("/register", async (req, res) => {
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

router.post("/admin/crear-profesor", verifyToken, verifyRole("admin"), async (req, res) => {
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

router.put("/usuario", verifyToken, async (req, res) => {
    const { nombre, correo, password } = req.body;

    let conn;
    try {
        conn = await pool.getConnection();

        const updates = [];
        const values = [];

        if (nombre) {
            updates.push("nombre = ?");
            values.push(nombre);
        }

        if (correo) {
            updates.push("correo = ?");
            values.push(correo);
        }

        if (password) {
            const hashed = await bcrypt.hash(password, 10);
            updates.push("contraseña = ?");
            values.push(hashed);
        }

        if (updates.length === 0) {
            return res.json({
                status: "error",
                message: "No hay cambios"
            });
        }

        values.push(req.user.id);

        await conn.query(
            `UPDATE usuarios SET ${updates.join(", ")} WHERE id_usuario = ?`,
            values
        );

        const newToken = jwt.sign(
            {
                id: req.user.id,
                email: correo || req.user.email,
                nombre: nombre || req.user.nombre,
                rol: req.user.rol
            },
            SECRET,
            { expiresIn: "24h" }
        );

        res.json({
            status: "success",
            message: "Perfil actualizado",
            token: newToken
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