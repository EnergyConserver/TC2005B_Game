function regresarHome() {
    window.location.href = "/home"
}

function irPerfil() {
    window.location.href = "/perfil"
}

function irTienda() {
    window.location.href = "/tienda"
}

function irAventura() {
    window.location.href = "/mundos"
}

function irRepaso() {
    window.location.href = "/repaso"
}

function regresarANiveles() {
    const modoRepaso = localStorage.getItem("modoRepaso") === "true";
    
    if (modoRepaso) {
        window.location.href = "/repaso";
        return;
    }
    
    const mundo = localStorage.getItem("mundoSeleccionado");

    if (!mundo) {
        window.location.href = "/mundos";
        return;
    }

    window.location.href = "/niveles";
}

window.irAventura = irAventura;
window.irTienda = irTienda;
window.irRepaso = irRepaso;
window.irPerfil = irPerfil;
window.regresarANiveles = regresarANiveles;
window.regresarHome = regresarHome;
