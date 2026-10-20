let IP_TELEVISION = localStorage.getItem("samsung_ip") || "192.168.1.15";
const PUERTO = "8002"; 
const NOMBRE_APP = "ControlWebDefinitivo";

let socket = null;
let tokenValido = localStorage.getItem("samsung_token") || "";

// Configurar IP de la TV
function configurarIP() {
    const nuevaIP = prompt("Introduce la dirección IP de tu Samsung QN85B:", IP_TELEVISION);
    if (nuevaIP) {
        IP_TELEVISION = nuevaIP;
        localStorage.setItem("samsung_ip", nuevaIP);
        forzarReconexion();
    }
}
// Actualizamos esta función para que controle el botón visualmente
function conectarTV(callbackComando) {
    const botonStatus = document.getElementById("btn-status");

    if (socket && socket.readyState === WebSocket.OPEN) {
        if (callbackComando) callbackComando();
        return;
    }

    // Actualizar botón a estado de "conectando" temporalmente
    if (botonStatus) {
        botonStatus.innerText = " ⏳ ";
        botonStatus.className = "btn btn-status-desconectado";
    }

    const nameB64 = btoa(NOMBRE_APP);
    let url = `wss://${IP_TELEVISION}:${PUERTO}/api/v2/channels/samsung.remote.control?name=${nameB64}`;
    if (tokenValido) url += `&token=${tokenValido}`;

    socket = new WebSocket(url);

    // CUANDO SE LOGRA CONECTAR: El botón cambia a verde
    socket.onopen = () => {
        console.log("Conectado a la TV.");
        if (botonStatus) {
            botonStatus.innerText = " 🟢 ";
            botonStatus.className = "btn btn-status-conectado";
        }
        if (callbackComando) setTimeout(callbackComando, 300);
    };

    // SI SE PIERDE LA CONEXIÓN O SE CIERRA: El botón regresa a rojo
    socket.onclose = () => {
        console.log("Conexión perdida con la TV.");
        if (botonStatus) {
            botonStatus.innerText = "🔴 Desconectado";
            botonStatus.className = "btn btn-status-desconectado";
        }
    };

    socket.onerror = (error) => {
        console.error("Error en la conexión WebSocket:", error);
        if (botonStatus) {
            botonStatus.innerText = "❌ Error IP";
            botonStatus.className = "btn btn-status-desconectado";
        }
    };

    socket.onmessage = (event) => {
        const respuesta = JSON.parse(event.data);
        if (respuesta.event === "ms.channel.connect" && respuesta.data?.token) {
            tokenValido = respuesta.data.token;
            localStorage.setItem("samsung_token", tokenValido);
            console.log("Token guardado.");
function forzarReconexion() {
    if (socket) socket.close();
    conectarTV(() => alert("¡Señal enviada! Revisa si la TV pide permiso."));
}

function enviarComando(codigoBoton) {
    conectarTV(() => {
        const payload = {
            method: "ms.remote.control",
            params: { Cmd: "Click", DataOfCmd: codigoBoton, Option: "false", TypeOfRemote: "SendRemoteKey" }
        };
        socket.send(JSON.stringify(payload));
    });
}

// --- MOTOR DEL PANEL TÁCTIL (TOUCHPAD) ---
const touchpad = document.getElementById("touchpad");
let startX = 0, startY = 0;
let touchStartTime = 0;
let bucleGesto = null;
let tiempoInicioGesto = 0;
let comandoActual = null;
let esGestoDeMovimiento = false;

touchpad.addEventListener("touchstart", (e) => {
    const t = e.touches[0];
    startX = t.clientX;
    startY = t.clientY;
    touchStartTime = Date.now();
    tiempoInicioGesto = Date.now();
    esGestoDeMovimiento = false;
    comandoActual = null;
});

touchpad.addEventListener("touchmove", (e) => {
    if (bucleGesto) return; // Si ya se está ejecutando un bucle de repetición, no calcula más rumbos

    const t = e.touches[0];
    const diffX = t.clientX - startX;
    const diffY = t.clientY - startY;
    const umbral = 35; // Pixeles mínimos para detectar movimiento

    if (Math.abs(diffX) > umbral || Math.abs(diffY) > umbral) {
        esGestoDeMovimiento = true;
        
        // Determinar dirección del deslizamiento
        if (Math.abs(diffX) > Math.abs(diffY)) {
            comandoActual = diffX > 0 ? "KEY_RIGHT" : "KEY_LEFT";
        } else {
            comandoActual = diffY > 0 ? "KEY_DOWN" : "KEY_UP";
        }

        // Iniciar la ráfaga de comandos repetidos
        ejecutarBucleComando();
    }
});

touchpad.addEventListener("touchend", () => {
    // Limpiar bucles activos
    clearTimeout(bucleGesto);
    bucleGesto = null;

    const duracionToque = Date.now() - touchStartTime;

    // Si el usuario NO deslizó el dedo, es un comando ENTER
    if (!esGestoDeMovimiento) {
        if (duracionToque > 500) {
            // PULSACIÓN LARGA EN ENTER: Envía una ráfaga rápida simulando retención
            for (let i = 0; i < 5; i++) {
                setTimeout(() => enviarComando("KEY_ENTER"), i * 80);
            }
        } else {
            // UN SOLO TOQUE: Enter normal
            enviarComando("KEY_ENTER");
        }
    }
});

function ejecutarBucleComando() {
    if (!comandoActual) return;
    
    enviarComando(comandoActual);

    const tiempoTranscurrido = Date.now() - tiempoInicioGesto;
    // Configuración dinámica del retardo: si pasan más de 3 segundos (3000ms), baja a 100ms. Si no, se queda en 200ms.
    const siguienteIntervalo = tiempoTranscurrido > 3000 ? 100 : 200;

    bucleGesto = setTimeout(ejecutarBucleComando, siguienteIntervalo);
}

// Iniciar conexión automática al cargar
conectarTV();