async function unirseGrupo() {
    const codigo = document.getElementById("codigoGrupo").value;
    const mensaje = document.getElementById("mensajeGrupo");
    const token = localStorage.getItem("token");

    try {
        const res = await fetch("/api/grupos/unirse", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ codigo })
        });

        const data = await res.json();

        if (data.status === "success") {
            mensaje.style.color = "green";
            mensaje.innerText = "Te uniste al grupo";
            cargarMisGrupos();
        } else {
            mensaje.style.color = "red";
            mensaje.innerText = data.message;
        }

    } catch (err) {
        mensaje.innerText = "Error del servidor";
    }
}

async function cargarMisGrupos() {
    const token = localStorage.getItem("token");

    const res = await fetch("/api/mis-grupos", {
        headers: {
            "Authorization": `Bearer ${token}`
        }
    });

    const data = await res.json();

    const lista = document.getElementById("listaGrupos");
    if (!lista) return;

    lista.innerHTML = "";

    data.grupos.forEach(g => {
        const li = document.createElement("li");
        li.textContent = `${g.nombre} (${g.codigo_acceso})`;
        lista.appendChild(li);
    });
}

let grupoSeleccionado = null;

async function crearGrupo() {
    const nombre = document.getElementById("nombreGrupo").value;
    const mensaje = document.getElementById("mensajeCrearGrupo");
    const token = localStorage.getItem("token");

    try {
        const res = await fetch("/api/grupos", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ nombre })
        });

        const data = await res.json();

        if (data.status === "success") {
            mensaje.style.color = "green";
            mensaje.innerText = `Grupo creado. Código: ${data.codigo}`;
            cargarGruposProfesor();
        } else {
            mensaje.style.color = "red";
            mensaje.innerText = data.message || "Error desconocido";
        }

    } catch (err) {
        mensaje.innerText = "Error del servidor";
    }
}

async function eliminarGrupo(idGrupo) {
    const confirmar = confirm("¿Seguro que quieres eliminar este grupo?");

    if (!confirmar) return;

    const token = localStorage.getItem("token");

    try {
        const res = await fetch(`/api/grupos/${idGrupo}`, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const data = await res.json();

        if (data.status === "success") {
            alert("Grupo eliminado");
            cargarGruposProfesor();
            const lista = document.getElementById("listaAlumnos");
            if (lista) {
                lista.innerHTML = "";
            }
            grupoSeleccionado = null;
        } else {
            alert(data.message);
        }

    } catch (err) {
        alert("Error del servidor");
    }
}

async function cargarGruposProfesor() {
    const token = localStorage.getItem("token");

    const res = await fetch("/api/grupos-profesor", {
        headers: {
            "Authorization": `Bearer ${token}`
        }
    });

    const data = await res.json();

    const lista = document.getElementById("listaGruposProfesor");
    lista.innerHTML = "";

    data.grupos.forEach(g => {
        const li = document.createElement("li");

        li.innerHTML = `
            ${g.nombre} (${g.codigo_acceso})
            <button onclick="verAlumnos(${g.id_grupo})">Ver alumnos</button>
            <button onclick="eliminarGrupo(${g.id_grupo})">Eliminar</button>
        `;

        lista.appendChild(li);
    });
}

async function verAlumnos(idGrupo) {
    grupoSeleccionado = idGrupo;
    const token = localStorage.getItem("token");

    const res = await fetch(`/api/grupos/${idGrupo}/estadisticas`, {
        headers: {
            "Authorization": `Bearer ${token}`
        }
    });

    const data = await res.json();

    const lista = document.getElementById("listaAlumnos");
    lista.innerHTML = "";

    data.alumnos.forEach(a => {
        const li = document.createElement("li");
        li.innerHTML = `<strong>${a.nombre}</strong>(${a.correo}) - ${a.mundos} isla - ${a.puntaje} pts`;
        lista.appendChild(li);
    });
}

if (window.location.pathname === "/perfil") {
    cargarMisGrupos();
}

if (window.location.pathname === "/dashboard") {
    cargarGruposProfesor();

    setInterval(() => {
        if (grupoSeleccionado) {
            verAlumnos(grupoSeleccionado);
        }
    }, 5000); // cada 5 segundos
}

window.crearGrupo = crearGrupo;
window.unirseGrupo = unirseGrupo;