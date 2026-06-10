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
            const res = await fetch("/api/login", {
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

        const nombre = e.target.nombre.value;
        const email = e.target.email.value;
        const password = e.target.password.value;
        const mensaje = document.getElementById("mensajeServer");

        try {
            const res = await fetch("/api/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ nombre, email, password })
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

const crearAdminForm = document.getElementById("crearAdminForm");

if (crearAdminForm) {
    crearAdminForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = e.target.email.value;
        const password = e.target.password.value;
        const mensaje = document.getElementById("mensajeAdmin2");

        const token = localStorage.getItem("token");

        try {
            const res = await fetch("/api/admin/crear-admin", {
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
                mensaje.innerText = "Admin creado correctamente";
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

const crearProfesorForm = document.getElementById("crearProfesorForm");

if (crearProfesorForm) {
    crearProfesorForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = e.target.email.value;
        const password = e.target.password.value;
        const mensaje = document.getElementById("mensajeAdmin");

        const token = localStorage.getItem("token");

        try {
            const res = await fetch("/api/admin/crear-profesor", {
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

const cambiarPasswordForm = document.getElementById("cambiarPasswordForm");

if (cambiarPasswordForm) {
    cambiarPasswordForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = e.target.email.value;
        const password = e.target.password.value;
        const mensaje = document.getElementById("mensajeCambio");

        const token = localStorage.getItem("token");

        const res = await fetch("/api/admin/cambiar-password", {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        mensaje.innerText = data.message;

        if (data.status === "success") {
            mensaje.style.color = "green";
            e.target.reset();
        } else {
            mensaje.style.color = "red";
        }
    });
}

async function actualizarPerfil(campo) {
    const mensaje = document.getElementById("mensajePerfil");
    const token = localStorage.getItem("token");

    let valor;

    if (campo === "nombre") {
        valor = document.getElementById("nuevoNombre").value;
    }

    if (campo === "correo") {
        valor = document.getElementById("nuevoCorreo").value;
    }

    if (campo === "password") {
        valor = document.getElementById("nuevaPassword").value;
    }

    try {
        const res = await fetch("/api/usuario", {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                [campo]: valor
            })
        });

        const data = await res.json();

        if (data.status === "success") {
            if (data.token) {
                localStorage.setItem("token", data.token);
            }
            mensaje.style.color = "green";
            let texto = "";
            if (campo === "nombre") texto = "Nombre cambiado correctamente";
            if (campo === "correo") texto = "Correo cambiado correctamente";
            if (campo === "password") texto = "Contraseña cambiada correctamente";

            mensaje.innerText = texto;
        } else {
            mensaje.style.color = "red";
            mensaje.innerText = data.message;
        }

    } catch (err) {
        mensaje.style.color = "red";
        mensaje.innerText = "Error del servidor";
    }
}

async function verificarAcceso(token) {
    try {
        const res = await fetch("/api/verification", {
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
                bienvenida.innerText = `Bienvenido ${data.usuario.nombre}`;
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

window.cerrarSesion = cerrarSesion;
window.irInicioSesion = irInicioSesion;
window.irCrearCuenta = irCrearCuenta;
window.irPaginaInicio = irPaginaInicio;
window.actualizarPerfil = actualizarPerfil;