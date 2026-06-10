const sonidoMoverse = new Audio("/sonidos/Walking.mp3");
const sonidoResCorrecta = new Audio("/sonidos/CorrectAnswer.mp3");
const sonidoResIncorrecta = new Audio("/sonidos/IncorrectAnswer.mp3");

function reproducirSonido(audio) {
    audio.currentTime = 0;
    audio.play();
}

const canvas = document.getElementById("canvas_grid");
let usoHint = false;
let capasAvatar = [];
let avatarCargado = false;
let jugadorMoviendose = false;
let vectores = [];
let pasoActual = 0;
let tipoNivel = "punto";
let dataNivel = null;
let modoRepaso = false;
if(canvas) {
    modoRepaso = localStorage.getItem("modoRepaso") === "true";
    
    const ctx = canvas.getContext("2d");
    const size = 700;
    const range = 10; // de -10 a 10
    const step = size / (range * 2); // tamaño de cada celda
    const mundo = localStorage.getItem("mundoSeleccionado");
    const nivel = localStorage.getItem("nivelSeleccionado");
    const token = localStorage.getItem("token");
    let puntoInicio;
    let puntoActual;

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

        ctx.font = "15px Arial";
        ctx.fillStyle = "black";

        // Eje Y (arriba)
        ctx.fillText("+Y", size / 2 + 10, 20);

        // Eje X (derecha)
        ctx.fillText("+X", size - 20, size / 2 - 10);
    }

    function drawPoints() {
        if (tipoNivel === "vectores") return;
        
        puntos.forEach(p => {
            const px = size / 2 + p.x * step;
            const py = size / 2 - p.y * step;

            ctx.beginPath();
            ctx.arc(px, py, 6, 0, 2 * Math.PI);
            ctx.fillStyle = "red";
            ctx.fill();
        });
    }
    
    async function cargarAvatarCanvas() {
        const token = localStorage.getItem("token");

        const res = await fetch("/api/avatar", {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const data = await res.json();

        capasAvatar = [];

        function cargarImg(src) {
            return new Promise(resolve => {
                const img = new Image();
                img.src = src;
                img.onload = () => resolve(img);
            });
        }

        const base = await cargarImg("/cosmeticos/base_pato.png");
        capasAvatar.push(base);

        const orden = ["cuerpo", "pies", "cabeza", "accesorio"];

        for (const tipo of orden) {
            const capa = data.avatar.find(c => c.tipo_cosmetico === tipo);
            if (capa) {
                const img = await cargarImg(`/cosmeticos/${capa.imagen}`);
                capasAvatar.push(img);
            }
        }
        avatarCargado = true;
    }

    function drawPlayer() {
        const px = size / 2 + puntoActual.x * step;
        const py = size / 2 - puntoActual.y * step;
        const tamaño = 60;

        if (!avatarCargado) return;

        capasAvatar.forEach(img => {
            ctx.drawImage(
                img,
                px - tamaño / 2,
                py - tamaño / 2,
                tamaño,
                tamaño
            );
        });
    }

    function render() {
        drawGrid();
        drawPoints();
        drawPlayer();
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

        const res = await fetch(`/api/nivel?mundo=${mundo}&nivel=${nivel}`, {
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

        tipoNivel = data.nivel.tipo || "punto";
        vectores = data.vectores || [];
        pasoActual = 0;

        if (data.status === "success") {
            dataNivel = data.nivel
            
            puntoCorrecto = {
                x: data.nivel.meta_x,
                y: data.nivel.meta_y
            };

            puntoInicio = {
                x: data.nivel.inicio_x,
                y: data.nivel.inicio_y
            };

            puntoActual = { ...puntoInicio };

            if (tipoNivel !== "vectores") {
                generarPuntos();
            } else {
                puntos = [];
            }

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

            await cargarAvatarCanvas();
            render();
        }
    }

    function moverJugador(destino, verificar = true, reproducirPaso = true) {
        jugadorMoviendose = true;
        const velocidad = 0.04;

        if (reproducirPaso) {
            sonidoMoverse.currentTime = 0;
            sonidoMoverse.play();
        }

        function animar() {
            const dx = destino.x - puntoActual.x;
            const dy = destino.y - puntoActual.y;

            const distancia = Math.sqrt(dx * dx + dy * dy);

            if (distancia < 0.05) {
                sonidoMoverse.pause();
                sonidoMoverse.currentTime = 0;
                
                puntoActual = { ...destino };
                render();

                jugadorMoviendose = false;
                
                if (verificar) {
                    verificarResultado(destino);
                }

                return;
            }
            
            puntoActual.x += dx * velocidad;
            puntoActual.y += dy * velocidad;

            render();
            requestAnimationFrame(animar);
        }
        animar();
    }

    async function verificarResultado(destino) {
        intentos++;

        if (tipoNivel === "punto") {
            const res = await fetch("/api/jugar", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    x: destino.x,
                    y: destino.y,
                    mundo: Number(mundo),
                    nivel: Number(nivel),
                    intentos,
                    usoHint
                })
            });

            const data = await res.json();

            if (data.resultado === "acierto") {
                terminarNivel(data.monedasGanadas);
            } else {
                fallo();
            }
            return;
        }

        const vector = vectores[pasoActual];

        if (dataNivel.tema == "suma") {
            const esperado = {
            x: puntoInicio.x + vectores
                .slice(0, pasoActual + 1)
                .reduce((sum, v) => sum + v.dx, 0),
            y: puntoInicio.y + vectores
                .slice(0, pasoActual + 1)
                .reduce((sum, v) => sum + v.dy, 0)
            };

            if (destino.x === esperado.x && destino.y === esperado.y) {
                pasoActual++;

                if (pasoActual === vectores.length) {
                    const res = await fetch("/api/jugar", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            x: destino.x,
                            y: destino.y,
                            mundo: Number(mundo),
                            nivel: Number(nivel),
                            intentos,
                            usoHint
                        })
                    });
                    const data = await res.json();
                    terminarNivel(data.monedasGanadas);
                }

            } else {
                fallo();
            }   
        } else if (dataNivel.tema === "resta") {
            
            let esperadoX = vectores[0].dx;
            let esperadoY = vectores[0].dy;

            for (let i = 1; i < vectores.length; i++) {
                esperadoX -= vectores[i].dx;
                esperadoY -= vectores[i].dy;
            }

            esperadoX += puntoInicio.x;
            esperadoY += puntoInicio.y;

            if (destino.x === esperadoX && destino.y === esperadoY) {
                const res = await fetch("/api/jugar", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        x: destino.x,
                        y: destino.y,
                        mundo: Number(mundo),
                        nivel: Number(nivel),
                        intentos,
                        usoHint
                    })
                });
                const data = await res.json();
                terminarNivel(data.monedasGanadas);
            } else {
                fallo();
            }
        } else if (dataNivel.tema === "escala") {
            const esperado = {
                x: puntoInicio.x + vectores
                    .slice(0, pasoActual + 1)
                    .reduce((sum, v) => sum + (v.dx * v.escala), 0),

                y: puntoInicio.y + vectores
                    .slice(0, pasoActual + 1)
                    .reduce((sum, v) => sum + (v.dy * v.escala), 0)
            };

            if (destino.x === esperado.x && destino.y === esperado.y) {
                pasoActual++;

                if (pasoActual === vectores.length) {
                    const res = await fetch("/api/jugar", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            x: destino.x,
                            y: destino.y,
                            mundo: Number(mundo),
                            nivel: Number(nivel),
                            intentos,
                            usoHint
                        })
                    });
                    const data = await res.json();
                    terminarNivel(data.monedasGanadas);
                }
            } else {
                fallo();
            }
        }
    }

    function terminarNivel(monedasGanadas = 0) {
        jugadorMoviendose = true;

        sonidoMoverse.pause();
        sonidoMoverse.currentTime = 0;
        reproducirSonido(sonidoResCorrecta);
        
        alert(`¡Correcto! 🎉\nGanaste ${monedasGanadas} monedas 💰`);

        if (modoRepaso) {
            localStorage.removeItem("modoRepaso");
            alert("Repaso completado");
            window.location.href = "/repaso";
            return;
        }

        setTimeout(async () => {
            try {
                const res = await fetch(`/api/siguiente-nivel?mundo=${mundo}&nivel=${nivel}`, {
                    headers: {
                        "Authorization": `Bearer ${token}`
                    }
                });
                const data = await res.json();
                
                if (data.existe) {
                    const siguienteNivel = Number(nivel) + 1;

                    localStorage.setItem("nivelSeleccionado", siguienteNivel);

                    pasoActual = 0;
                    vectores = [];
                    puntos = [];

                    window.location.href = "/juego";
                } else {
                    alert("Terminaste el mundo!");
                    window.location.href = "/mundos";
                }
            } catch(err) {
                alert("Error al cargar el siguiente nivel");
                jugadorMoviendose = false;
            }
        }, 500);
    }

    function fallo() {
        fallos++;

        sonidoMoverse.pause();
        sonidoMoverse.currentTime = 0;
        reproducirSonido(sonidoResIncorrecta);
        alert("Intenta otra vez");

        pasoActual = 0;
        puntoActual = { ...puntoInicio };

        moverJugador(puntoInicio, false, false);

        const btnHint = document.getElementById("btnHint");
        if (fallos >= 1 && btnHint) {
            btnHint.style.display = "block";
        }
    } 

    canvas.addEventListener("click", async (e) => {
        
        if (jugadorMoviendose) return;
        
        const rect = canvas.getBoundingClientRect();

        const xPixel = e.clientX - rect.left;
        const yPixel = e.clientY - rect.top;

        // Convertir a coordenadas cartesianas
        let x = (xPixel - size / 2) / step;
        let y = (size / 2 - yPixel) / step;

        // Redondear a enteros
        x = Math.round(x);
        y = Math.round(y);

        let destino;

        if (tipoNivel === "vectores") {
            destino = { x, y };
        } else {
            destino = puntos.find(p => p.x === x && p.y === y);
            if (!destino) return;
        }

        moverJugador(destino);

    });

    cargarNivel();
}

async function cargarRepaso() {

    const token = localStorage.getItem("token");

    const resTemas = await fetch("/api/temas", {
        headers: {
            "Authorization": `Bearer ${token}`
        }
    });

    const dataTemas = await resTemas.json();

    const select = document.getElementById("filtroTema");

    dataTemas.temas.forEach(t => {

        const option = document.createElement("option");

        option.value = t.tema;

        option.textContent = t.tema;

        select.appendChild(option);
    });

    async function cargarLista() {

        const tema = select.value;

        const res = await fetch(`/api/repaso?tema=${tema}`, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const data = await res.json();

        const lista = document.getElementById("listaRepaso");

        lista.innerHTML = "";
        let temaAnterior = null;

        data.niveles.forEach(n => {

            const div = document.createElement("div");

            let encabezadoTema = "";

            if (n.tema !== temaAnterior) {
                encabezadoTema = `<h3>${n.tema}</h3>`;
                temaAnterior = n.tema;
            }

            div.innerHTML = `
                ${encabezadoTema}
                <div class="nivel-repaso">
                    <p>Mundo ${n.mundo} - Nivel ${n.orden_nivel}</p>
                    <button>Repasar</button>
                </div>
            `;

            div.querySelector("button").onclick = () => {
                seleccionarNivelRepaso(
                    n.mundo,
                    n.orden_nivel
                );
            };

            lista.appendChild(div);
        });
    }

    select.addEventListener("change", cargarLista);

    cargarLista();
}

async function puedeAccederAMundo(mundo) {
    const token = localStorage.getItem("token");

    const res = await fetch(`/api/nivel?mundo=${mundo}&nivel=1`, {
        headers: {
            "Authorization": `Bearer ${token}`
        }
    });

    return res.ok;
}

async function seleccionarMundo(mundo) {
    const permitido = await puedeAccederAMundo(mundo);

    if (!permitido) {
        alert("Debes completar la isla anterior");
        return;
    }
    
    localStorage.setItem("mundoSeleccionado", mundo);
    window.location.href = "/niveles"
}

async function seleccionarNivel(nivel) {
    localStorage.removeItem("modoRepaso");
    
    const mundo = localStorage.getItem("mundoSeleccionado");
    const token = localStorage.getItem("token");

    const res = await fetch(`/api/nivel?mundo=${mundo}&nivel=${nivel}`, {
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

function seleccionarNivelRepaso(mundo, nivel) {
    localStorage.setItem("mundoSeleccionado", mundo);
    localStorage.setItem("nivelSeleccionado", nivel);
    localStorage.setItem("modoRepaso", "true");
    window.location.href = "/juego";
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

    const res = await fetch(`/api/siguiente-nivel?mundo=${mundo}&nivel=${nivel}`, {
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

async function cargarEstadoNiveles() {
    const mundo = localStorage.getItem("mundoSeleccionado");
    const token = localStorage.getItem("token");

    const res = await fetch(`/api/progreso-mundo?mundo=${mundo}`, {
        headers: {
            "Authorization": `Bearer ${token}`
        }
    });

    const data = await res.json();
    const niveles = data.niveles;

    console.log(niveles);

    niveles.forEach((nivel, index) => {
        const div = document.querySelector(`.button_nivel${nivel.orden_nivel}`);

        if (!div) return;

        div.classList.remove("bloqueado", "disponible", "completado");

        if (index > 0 && niveles[index - 1].estado !== "completado") {
            div.classList.add("bloqueado");
        } 
        else if (nivel.estado === "completado") {
            div.classList.add("completado");
        } 
        else {
            div.classList.add("disponible");
        }

        const btn = div.querySelector("button");
        btn.onclick = () => {
            if (div.classList.contains("bloqueado")) {
                alert("Debes completar el nivel anterior");
                return;
            }
            seleccionarNivel(nivel.orden_nivel);
        };
    });
}

async function cargarEstadoMundos() {
    const token = localStorage.getItem("token");

    const res = await fetch("/api/progreso-mundos", {
        headers: {
            "Authorization": `Bearer ${token}`
        }
    });

    const data = await res.json();

    const mundos = data.mundos;

    mundos.forEach((mundo, index) => {

        const div = document.querySelector(`.button_isla${mundo.orden}`);

        if (!div) return;

        div.classList.remove("bloqueado", "disponible", "completado");

        if (index > 0 && mundos[index - 1].estado !== "completado") {
            div.classList.add("bloqueado");
        }
        else if (mundo.estado === "completado") {
            div.classList.add("completado");
        }
        else {
            div.classList.add("disponible");
        }

        const btn = div.querySelector("button");

        btn.onclick = () => {

            if (div.classList.contains("bloqueado")) {
                alert("Debes completar la isla anterior");
                return;
            }

            seleccionarMundo(mundo.orden);
        };
    });
}

if (window.location.pathname === "/repaso") {
    cargarRepaso();
}

if (window.location.pathname === "/niveles") {
    cargarEstadoNiveles();
}

if (window.location.pathname === "/mundos") {
    cargarEstadoMundos();
}

window.mostrarHint = mostrarHint;
window.seleccionarMundo = seleccionarMundo;
window.seleccionarNivel = seleccionarNivel;
