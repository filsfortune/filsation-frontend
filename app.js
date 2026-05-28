// 1. FUNCIONAMIENTO DE LOS TABS (MENÚ)
function cambiarPestaña(tabName) {
    // Desactivar todos los botones y contenidos
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    // Activar la pestaña seleccionada
    event.currentTarget.classList.add('active');
    document.getElementById(`tab-${tabName}`).classList.add('active');
}

// 2. INICIALIZAR EL MAPA DE LEAFLET
// Creamos un visor básico centrado en La Habana de forma temporal
const map = L.map('map').setView([23.1136, -82.3666], 11);

// Añadimos un fondo de mapa gris/minimalista para que combine con Filsation
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CARTO'
}).addTo(map);

// Cambiamos el localhost por tu servidor real de Render en internet:
const API_URL = 'https://filsation-api.onrender.com/api';

async function cargarDatosProvincia() {
    try {
        const respuesta = await fetch(`${API_URL}/provincia`);
        const datos = await respuesta.json();

        // Actualizar el panel derecho con los datos reales de Node.js + Neon
        document.getElementById('panel-titulo').innerText = datos.nombre;
        
        document.getElementById('panel-cuerpo').innerHTML = `
            <p style="margin-bottom: 15px;">${datos.informacion_general}</p>
            <p><strong>Población Total:</strong> ${Number(datos.poblacion_total).toLocaleString()} habitantes</p>
            <p><strong>Extensión:</strong> ${Number(datos.extension_total).toLocaleString()} km²</p>
        `;

        // 4. PINTAR EL POLÍGONO DE LA PROVINCIA EN EL MAPA
        if (datos.geometria) {
            const geojsonProvincia = JSON.parse(datos.geometria);
            
            L.geoJSON(geojsonProvincia, {
                style: {
                    color: '#000000',      // Línea del borde negra fina
                    weight: 1.5,
                    fillColor: '#555555',  // Relleno gris
                    fillOpacity: 0.1       // Muy transparente para la elegancia
                }
            }).addTo(map);
        }

    } catch (error) {
        console.error("Error al conectar con la API:", error);
        document.getElementById('panel-cuerpo').innerText = "No se pudo conectar con el servidor Node.js.";
    }
}

// Ejecutar la carga de datos al abrir la página
cargarDatosProvincia();