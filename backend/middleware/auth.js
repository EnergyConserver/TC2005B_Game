const jwt = require("jsonwebtoken");
const SECRET = process.env.JWT_SECRET;

const verifyToken = (req, res, next) => {
    const authheaders = req.headers["authorization"];
    const token = authheaders && authheaders.split(" ")[1];

    if (!token) {
        return res.status(401).json({ status: "error", message: "No autorizado" });
    }

    jwt.verify(token, SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({ status: "error", message: "Sesión expirada" });
        }

        req.user = decoded;
        next();
    });
};

const verifyRole = (rolPermitido) => {
    return (req, res, next) => {
        if (!req.user || req.user.rol !== rolPermitido) {
            return res.status(403).json({ status: "error" });
        }
        next();
    };
};

module.exports = { verifyToken, verifyRole };