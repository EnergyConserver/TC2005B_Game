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
    const mundo = localStorage.getItem("mundoSeleccionado");
    const nivel = localStorage.getItem("nivelSeleccionado");
    const token = localStorage.getItem("token");

    let puntoCorrecto;
    let puntos = [];

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

    function generarPuntos() {
        puntos = [];

        function randomInt(min, max) {
            return Math.floor(Math.random() * (max - min + 1)) + min;
        }

        while (puntos.length < 2) {
            let p = {
                x: randomInt(-9, 9),
                y: randomInt(-9, 9)
            };

            if ((p.x !== puntoCorrecto.x || p.y !== puntoCorrecto.y) && !puntos.some(pt => pt.x === p.x && pt.y === p.y)) {
                puntos.push(p);
            }
        }
        puntos.push(puntoCorrecto);
    }

    async function cargarNivel() {
        const res = await fetch(`http://localhost:3000/api/nivel?mundo=${mundo}&nivel=${nivel}`, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const data = await res.json();

        if (!res.ok) {
            alert(data.message);
            window.location.href = "/niveles";
            return;
        }

        if (data.status === "success") {
            puntoCorrecto = {
                x: data.nivel.meta_x,
                y: data.nivel.meta_y
            };

            const preguntaElem = document.getElementById("pregunta");
            const hintElem = document.getElementById("hint");
            const btn = document.getElementById("btnHint");

            if (preguntaElem) {
                preguntaElem.innerText = data.nivel.pregunta;
            }

            if (hintElem) {
                hintElem.innerText = data.nivel.hint;
            }

            if (hintElem && btn) {
                hintElem.style.display = "none";
                btn.innerText = "Mostrar pista";
            }

            generarPuntos();
            drawGrid();
            drawPoints();
        }
    }

    canvas.addEventListener("click", async (e) => {
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

        const res = await fetch("http://localhost:3000/api/jugar", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                x,
                y,
                mundo: Number(mundo),
                nivel: Number(nivel)
            })
        });

        const data = await res.json();

        if (data.resultado === "acierto") {
            const res = await fetch(`http://localhost:3000/api/siguiente-nivel?mundo=${mundo}&nivel=${nivel}`, {
                headers: { "Authorization": `Bearer ${token}` }
            });

            const dataNext = await res.json();
            const btn = document.getElementById("btnNext");

            if (dataNext.existe) {
                btn.style.display = "block";
                btn.textContent = "Siguiente nivel ➜";
            } else {
                btn.style.display = "block";
                btn.textContent = "🏁 Terminar mundo";
                btn.onclick = () => window.location.href = "/mundos";
            }
        } else {
            alert("Intenta otra vez");
        }
    });

    cargarNivel();
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

async function puedeAccederAMundo(mundo) {
    const token = localStorage.getItem("token");

    const res = await fetch(`http://localhost:3000/api/nivel?mundo=${mundo}&nivel=1`, {
        headers: {
            "Authorization": `Bearer ${token}`
        }
    });

    return res.ok;
}

async function seleccionarMundo(mundo) {
    const permitido = await puedeAccederAMundo(mundo);

    if (!permitido) {
        alert("Debes completar el mundo anterior");
        return;
    }
    
    localStorage.setItem("mundoSeleccionado", mundo);
    window.location.href = "/niveles"
}

async function seleccionarNivel(nivel) {
    const mundo = localStorage.getItem("mundoSeleccionado");
    const token = localStorage.getItem("token");

    const res = await fetch(`http://localhost:3000/api/nivel?mundo=${mundo}&nivel=${nivel}`, {
        headers: {
            "Authorization": `Bearer ${token}`
        }
    });

    if (!res.ok) {
        const data = await res.json();
        alert(data.message);
        return;
    }
    
    localStorage.setItem("nivelSeleccionado", nivel);
    window.location.href = "/juego"
}

function mostrarHint() {
    const hintElem = document.getElementById("hint");
    const btn = document.getElementById("btnHint");

    if (!hintElem || !btn) return;

    if (hintElem.style.display === "none") {
        hintElem.style.display = "block";
        btn.innerText = "Ocultar pista";
    } else {
        hintElem.style.display = "none";
        btn.innerText = "Mostrar pista";
    }
}

async function irSiguienteNivel() {
    let mundo = Number(localStorage.getItem("mundoSeleccionado"));
    let nivel = Number(localStorage.getItem("nivelSeleccionado"));

    const res = await fetch(`http://localhost:3000/api/siguiente-nivel?mundo=${mundo}&nivel=${nivel}`, {
        headers: {
            "Authorization": `Bearer ${localStorage.getItem("token")}`
        }
    });

    const data = await res.json();

    if (data.existe) {
        nivel++;
        localStorage.setItem("nivelSeleccionado", nivel);
        window.location.href = "/juego";
    } else {
        alert("Terminaste el mundo!");
        window.location.href = "/mundos";
    }
}

function regresarHome() {
    window.location.href = "/home"
}