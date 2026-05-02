document.addEventListener("DOMContentLoaded", async () => {
    const token = localStorage.getItem("token");
    const path = window.location.pathname;

    const rutasProtegidas = ["/home", "/perfil", "/mundos", "/niveles", "/juego", "/tienda", "/dashboard", "/admin"]
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

        if (path === "/home") {
            cargarMonedas();
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
let usoHint = false;
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
    let fallos = 0;
    let intentos = 0;

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

    function obtenerCuadrante(x, y) {
        if (x > 0 && y > 0) return 1;
        if (x < 0 && y > 0) return 2;
        if (x < 0 && y < 0) return 3;
        if (x > 0 && y < 0) return 4;
        return 0; // ejes
    }

    function generarPuntos() {
        puntos = [];
        const cuadranteCorrecto = obtenerCuadrante(puntoCorrecto.x, puntoCorrecto.y);

        function randomInt(min, max) {
            return Math.floor(Math.random() * (max - min + 1)) + min;
        }

        while (puntos.length < 2) {
            let p = {
                x: randomInt(-9, 9),
                y: randomInt(-9, 9)
            };

            const cuadranteP = obtenerCuadrante(p.x, p.y);
            const esCorrecto = p.x === puntoCorrecto.x && p.y === puntoCorrecto.y;
            const mismoCuadrante = cuadranteP === cuadranteCorrecto;
            const yaExiste = puntos.some(pt => pt.x === p.x && pt.y === p.y);

            if (!esCorrecto && !mismoCuadrante && !yaExiste) {
                puntos.push(p);
            }
        }
        puntos.push(puntoCorrecto);
    }

    async function cargarNivel() {
        fallos = 0;

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
                btn.style.display = "none";
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

        intentos++;

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
                nivel: Number(nivel),
                intentos,
                usoHint
            })
        });

        const data = await res.json();

        if (data.resultado === "acierto") {
            alert("¡Correcto! 🎉");
            
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
            fallos++;

            alert("Intenta otra vez");

            const btnHint = document.getElementById("btnHint");
            if (fallos >= 1 && btnHint) {
                btnHint.style.display = "block";
            }
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

function irTienda() {
    window.location.href = "/tienda"
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

    usoHint = true;

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

let cosmeticosGlobal = [];
let filtroActual = "todos";
let paginaActual = 1;
const ITEMS_POR_PAGINA = 6;

async function cargarTienda() {
    const token = localStorage.getItem("token");

    const res = await fetch("http://localhost:3000/api/tienda", {
        headers: {
            "Authorization": `Bearer ${token}`
        }
    });

    const data = await res.json();
    cosmeticosGlobal = data.cosmeticos;

    const filtroGuardado = localStorage.getItem("filtroTienda");
    if (filtroGuardado) {
        filtroActual = filtroGuardado;
    }

    renderTienda();
}

function cambiarFiltro(tipo) {
    filtroActual = tipo;
    paginaActual = 1;
    localStorage.setItem("filtroTienda", tipo);
    renderTienda();
}

function renderTienda() {
    const container = document.getElementById("cosmeticos");
    container.innerHTML = "";

    let filtrados = cosmeticosGlobal;

    if (filtroActual !== "todos") {
        filtrados = cosmeticosGlobal.filter(c => c.tipo_cosmetico === filtroActual);
    }

    const inicio = (paginaActual - 1) * ITEMS_POR_PAGINA;
    const paginaItems = filtrados.slice(inicio, inicio + ITEMS_POR_PAGINA);

    paginaItems.forEach(c => {
        const div = document.createElement("div");

        div.innerHTML = `
            <img src="/cosmeticos/${c.imagen}" class="item-img">
            <p>${c.nombre}</p>
            <p>💰 ${c.precio}</p>
            <button>${!c.comprado ? "Comprar" : c.activo ? "Quitar" : "Equipar"}</button>
        `;

        const btn = div.querySelector("button");

        btn.onclick = async () => {
            const token = localStorage.getItem("token");

            if (c.activo) {
                await fetch("/api/quitar", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({ id_cosmetico: c.id_cosmetico })
                });
            } else if (c.comprado) {
                await fetch("/api/equipar", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({ id_cosmetico: c.id_cosmetico })
                });
            } else {
                await fetch("/api/comprar", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({ id_cosmetico: c.id_cosmetico })
                });
            }

            cargarTienda();
            cargarAvatar();
        };

        container.appendChild(div);
    });

    renderPaginacion(filtrados.length);
}

function renderPaginacion(totalItems) {
    const cont = document.getElementById("paginacion");
    cont.innerHTML = "";

    const totalPaginas = Math.ceil(totalItems / ITEMS_POR_PAGINA);

    if (totalPaginas <= 1) return;

    if (paginaActual > 1) {
        const prev = document.createElement("button");
        prev.textContent = "←";
        prev.onclick = () => {
            paginaActual--;
            renderTienda();
        };
        cont.appendChild(prev);
    }

    if (paginaActual < totalPaginas) {
        const next = document.createElement("button");
        next.textContent = "→";
        next.onclick = () => {
            paginaActual++;
            renderTienda();
        };
        cont.appendChild(next);
    }
}

async function cargarAvatar() {
    const token = localStorage.getItem("token");

    const res = await fetch("http://localhost:3000/api/avatar", {
        headers: {
            "Authorization": `Bearer ${token}`
        }
    });

    const data = await res.json();

    const capas = {
        cabeza: null,
        cuerpo: null,
        pies: null,
        accesorio: null
    };

    data.avatar.forEach(c => {
        capas[c.tipo_cosmetico] = c.imagen;
    });

    const container = document.getElementById("avatar");

    container.innerHTML = `
        <img src="/cosmeticos/base_pato.png" class="layer">
        ${capas.cuerpo ? `<img src="/cosmeticos/${capas.cuerpo}" class="layer cuerpo">` : ""}
        ${capas.pies ? `<img src="/cosmeticos/${capas.pies}" class="layer pies">` : ""}
        ${capas.cabeza ? `<img src="/cosmeticos/${capas.cabeza}" class="layer cabeza">` : ""}
        ${capas.accesorio ? `<img src="/cosmeticos/${capas.accesorio}" class="layer accesorio">` : ""}
    `;
}

async function cargarMonedas() {
    const token = localStorage.getItem("token");

    const res = await fetch("http://localhost:3000/api/monedas", {
        headers: {
            "Authorization": `Bearer ${token}`
        }
    });

    const data = await res.json();

    const h2 = document.getElementById("monedas");
    if (h2) {
        h2.innerText = `${data.monedas}`;
    }
}

if (window.location.pathname === "/tienda") {
    cargarTienda();
    cargarAvatar();
}

if (window.location.pathname === "/home") {
    cargarAvatar();
}

function regresarHome() {
    window.location.href = "/home"
}