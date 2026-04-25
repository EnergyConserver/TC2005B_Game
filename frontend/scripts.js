document.addEventListener("DOMContentLoaded", async () => {
    const token = localStorage.getItem("token");
    const path = window.location.pathname;

    const rutasProtegidas = ["/home", "/perfil", "/mundos", "/niveles", "/juego", "/dashboard", "/admin"]
    const esRutaProtegida = rutasProtegidas.some(ruta => path.startsWith(ruta))

    if (esRutaProtegida) {
        if (!token) {
            window.location.href = "/";
            return;
        }
        
        const accesoValido = await verificarAcceso(token);

        if (!accesoValido) {
            localStorage.removeItem("token");
            window.location.href = "/";
            return;
        }

        if (path.startsWith("/dashboard")) {
            const payload = JSON.parse(atob(token.split(".")[1]));
            if (payload.rol !== "profesor") {
                window.location.href = "/home";
                return;
            }
        }

        if (path.startsWith("/admin")) {
            const payload = JSON.parse(atob(token.split(".")[1]));
            if (payload.rol !== "admin") {
                window.location.href = "/home";
                return;
            }
        }
    }
    document.body.style.display = "block";
});

const loginForm = document.getElementById("loginForm");
if (loginForm) {
    loginForm.addEventListener("submit", async function(e) {
        e.preventDefault();
    
        const email = e.target.email.value;
        const password = e.target.password.value;
        const mensaje = document.getElementById("mensajeServer");

        try {
            const res = await fetch("http://localhost:3000/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();
            mensaje.innerText = data.message;

            if (data.status === "success") {
                localStorage.setItem("token", data.token);
                mensaje.style.color = "green";
                mensaje.innerText = "Acceso correcto";

                const payload = JSON.parse(atob(data.token.split(".")[1]));

                setTimeout(() => {
                    if (payload.rol === "profesor") {
                        window.location.href = "/dashboard"
                    } else if (payload.rol === "admin") {
                        window.location.href = "/admin";
                    } else {
                        window.location.href = "/home";
                    }
                }, 1500);
            } else {
                mensaje.innerText = data.message || "Error desconocido";
                mensaje.style.color = "red";   
            }

        } catch (error) {
            alert("Error al conectar con el servidor");
        }
    });
}

const registerForm = document.getElementById("registerForm");
if (registerForm) {
    registerForm.addEventListener("submit", async function (e) {
        e.preventDefault();

        const email = e.target.email.value;
        const password = e.target.password.value;
        const mensaje = document.getElementById("mensajeServer");

        try {
            const res = await fetch("http://localhost:3000/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();

            if (data.status === "success") {
                localStorage.setItem("token", data.token);

                mensaje.style.color = "green";
                mensaje.innerText = "Cuenta creada y sesión iniciada";

                setTimeout(() => {
                    window.location.href = "/home";
                }, 1500);
            } else {
                mensaje.style.color = "red";
                mensaje.innerText = data.message;
            }

        } catch (error) {
            alert("Error al conectar con el servidor");
        }
    });
}

const canvas = document.getElementById("canvas_grid");
if(canvas) {
    const ctx = canvas.getContext("2d");
    const size = 700;
    const range = 10; // de -10 a 10
    const step = size / (range * 2); // tamaño de cada celda

    // Dibujar grid
    function drawGrid() {
        ctx.clearRect(0, 0, size, size);

        for (let i = -range; i <= range; i++) {
            let pos = size / 2 + i * step;

        // líneas verticales
            ctx.beginPath();
            ctx.moveTo(pos, 0);
            ctx.lineTo(pos, size);
            ctx.strokeStyle = i === 0 ? "black" : "#ccc";
            ctx.stroke();

        // líneas horizontales
            ctx.beginPath();
            ctx.moveTo(0, pos);
            ctx.lineTo(size, pos);
            ctx.strokeStyle = i === 0 ? "black" : "#ccc";
            ctx.stroke();
        }
    }

    drawGrid();

    // Temporal (luego vendrá del backend)
    const puntoCorrecto = { x: 3, y: -2 };
    const puntos = [];

    function randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    while (puntos.length < 2) {
        let p = {
            x: randomInt(-10, 10),
            y: randomInt(-10, 10)
        };
        if ((p.x !== puntoCorrecto.x || p.y !== puntoCorrecto.y) && !puntos.some(pt => pt.x === p.x && pt.y === p.y)) {
            puntos.push(p);
        }
    }

    puntos.push(puntoCorrecto);

    function drawPoints() {
        puntos.forEach(p => {
            const px = size / 2 + p.x * step;
            const py = size / 2 - p.y * step;
            ctx.beginPath();
            ctx.arc(px, py, 6, 0, 2 * Math.PI);
            ctx.fillStyle = "red";
            ctx.fill();
        });
    }

    drawPoints();

    canvas.addEventListener("click", (e) => {
        const rect = canvas.getBoundingClientRect();

        const xPixel = e.clientX - rect.left;
        const yPixel = e.clientY - rect.top;

        // Convertir a coordenadas cartesianas
        let x = (xPixel - size / 2) / step;
        let y = (size / 2 - yPixel) / step;

        // Redondear a enteros
        x = Math.round(x);
        y = Math.round(y);

        document.getElementById("coords").textContent = `(${x}, ${y})`;

        const clicked = puntos.find(p => p.x === x && p.y === y);
        if (!clicked) return;

        const token = localStorage.getItem("token");

        fetch("http://localhost:3000/api/jugar", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                x,
                y,
                nivel: 1 // Cambiar después para cuando haya más
            })
        }).then(res => res.json()).then(data => {
            if (data.resultado === "acierto") {
                alert("¡Le diste!");
            } else {
                alert("Intenta otra vez");
            }
        }).catch(err => console.error(err));
    });
}

const crearProfesorForm = document.getElementById("crearProfesorForm");

if (crearProfesorForm) {
    crearProfesorForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = e.target.email.value;
        const password = e.target.password.value;
        const mensaje = document.getElementById("mensajeAdmin");

        const token = localStorage.getItem("token");

        try {
            const res = await fetch("http://localhost:3000/admin/crear-profesor", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();

            if (data.status === "success") {
                mensaje.style.color = "green";
                mensaje.innerText = "Profesor creado correctamente";
                e.target.reset();
            } else {
                mensaje.style.color = "red";
                mensaje.innerText = data.message;
            }

        } catch (err) {
            mensaje.innerText = "Error del servidor";
        }
    });
}

async function verificarAcceso(token) {
    try {
        const res = await fetch("http://localhost:3000/verification", {
            method: "GET", 
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            }
        });

        if (res.status === 401 || res.status === 403) {
            return false;
        }
        
        const data = await res.json();
        
        if (data.status === "success") {
            const bienvenida = document.getElementById("bienvenidaUsuario")
            if (bienvenida) {
                bienvenida.innerText = `Bienvenido ${data.usuario.email}`;
            }
            return true
        } else {
            return false
        }

    } catch (error) {
        console.error("Error de autenticazión", error);
        return false
    }
};

function cerrarSesion() {
    const confirmar = confirm("¿Seguro que quieres cerrar sesión?");

    if (confirmar) {
        localStorage.removeItem("token");
        window.location.href = "/";   
    }
};

function irInicioSesion() {
    const token = localStorage.getItem("token");
    
    if (token) {
        const payload = JSON.parse(atob(token.split(".")[1]));
        if (payload.rol === "profesor") {
            window.location.href = "/dashboard";
        } else if (payload.rol === "admin") {
            window.location.href = "/admin";
        } else {
            window.location.href = "/home";
        }
    } else {
        window.location.href = "/login"
    }
};

function irCrearCuenta() {
    window.location.href = "/register"
};

function irPaginaInicio() {
    window.location.href = "/"
};

function irPerfil() {
    window.location.href = "/perfil"
}

function irAventura() {
    window.location.href = "/mundos"
}

function irNiveles() {
    window.location.href = "/niveles"
}

function irJuego() {
    window.location.href = "/juego"
}

function regresarHome() {
    window.location.href = "/home"
}