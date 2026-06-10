let cosmeticosGlobal = [];
let filtroActual = "todos";
let paginaActual = 1;
const ITEMS_POR_PAGINA = 6;

async function cargarTienda() {
    const token = localStorage.getItem("token");

    const res = await fetch("/api/tienda", {
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

    if (filtroActual === "comprados") {
        filtrados = cosmeticosGlobal.filter(c => c.comprado);
    } else if (filtroActual !== "todos") {
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

            await cargarTienda();
            await cargarAvatar();
            await cargarMonedas();
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

    const res = await fetch("/api/avatar", {
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

    const res = await fetch("/api/monedas", {
        headers: {
            "Authorization": `Bearer ${token}`
        }
    });

    const data = await res.json();

    const h2 = document.getElementById("monedas");
    if (h2) {
        h2.innerText = `💰: ${data.monedas}`;
    }
}

if (window.location.pathname === "/tienda") {
    cargarTienda();
    cargarAvatar();
}

if (window.location.pathname === "/home") {
    cargarAvatar();
}

window.cambiarFiltro = cambiarFiltro;