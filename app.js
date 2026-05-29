// 1. FUNCIONAMIENTO DE LOS TABS (MENÚ SUPERIOR)
function cambiarPestaña(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    event.currentTarget.classList.add('active');
    document.getElementById(`tab-${tabName}`).classList.add('active');
}

// 2. INICIALIZAR EL MAPA DE LEAFLET
const map = L.map('map').setView([23.1136, -82.3666], 10.5); // Ajustamos el zoom para ver toda la provincia

// Fondo de mapa minimalista claro (CartoDB Light)
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CARTO'
}).addTo(map);

// URL de tu API real en Render
const API_URL = 'https://filsation-api.onrender.com/api';

// Variable global para guardar la capa de municipios y poder interactuar con ella
let capaMunicipios;

// 3. CARGAR TODOS LOS MUNICIPIOS EN EL MAPA
async function cargarMapaMosaico() {
    try {
        const respuesta = await fetch(`${API_URL}/municipios`);
        const municipios = await respuesta.json();

        // Convertimos el array de municipios en un formato que Leaflet entienda (GeoJSON)
        const funcionesGeoJSON = municipios.map(m => {
            const geom = JSON.parse(m.geometria);
            return {
                type: "Feature",
                properties: {
                    id: m.id,
                    nombre: m.nombre
                },
                geometry: geom
            };
        });

        const coleccionGeoJSON = {
            type: "FeatureCollection",
            features: funcionesGeoJSON
        };

        // Pintamos el mosaico en el mapa con diseño elegante
        capaMunicipios = L.geoJSON(coleccionGeoJSON, {
            style: {
                color: '#000000',      // Líneas divisorias negras y finas
                weight: 1,
                fillColor: '#888888',  // Gris neutro para el diseño base
                fillOpacity: 0.15      // Sutil transparencia hueso/gris
            },
            onEachFeature: configurarInteraccionMunicipio
        }).addTo(map);

        // Quitamos el mensaje de carga del panel derecho
        document.getElementById('panel-cuerpo').innerHTML = "<p>Haz clic sobre cualquier municipio en el mapa para explorar sus datos urbanos.</p>";

    } catch (error) {
        console.error("Error al cargar los municipios:", error);
        document.getElementById('panel-cuerpo').innerText = "Error al conectar con la base de datos de municipios.";
    }
}

// 4. INTERACCIÓN: QUÉ PASA CUANDO EL USUARIO INTERACTÚA CON UN MUNICIPIO
function configurarInteraccionMunicipio(feature, layer) {
    
    // Efecto visual al pasar el mouse por encima (Hover)
    layer.on('mouseover', function () {
        layer.setStyle({
            fillColor: '#000000', // Se oscurece al pasar el cursor
            fillOpacity: 0.3
        });
    });

    layer.on('mouseout', function () {
        capaMunicipios.resetStyle(layer); // Recupera el diseño original al quitar el mouse
    });

    // Acción principal: Clic en el municipio
    layer.on('click', async function () {
        const id = feature.properties.id;
        const nombre = feature.properties.nombre;

        // Cambiamos inmediatamente el título grande de la derecha
        document.getElementById('panel-titulo').innerText = nombre;
        document.getElementById('panel-cuerpo').innerHTML = `<p class="loading">Consultando detalles de ${nombre} en Neon...</p>`;

        // Hacemos la consulta a la ruta detallada del backend (/api/municipios/:id)
        try {
            const respuesta = await fetch(`${API_URL}/municipios/${id}`);
            const detalle = await respuesta.json();

            // Rellenamos el cuerpo del panel con la información devuelta por el servidor
            document.getElementById('panel-cuerpo').innerHTML = `
                <p style="margin-bottom: 15px;"><strong>ID Urbano:</strong> ${detalle.id}</p>
                <p style="margin-bottom: 15px;"><strong>Código Técnico (FID):</strong> ${detalle.fid}</p>
                <p>${detalle.informacion_urbana}</p>
            `;
        } catch (error) {
            console.error("Error al obtener detalles del municipio:", error);
            document.getElementById('panel-cuerpo').innerHTML = "<p>No se pudieron recuperar los detalles de este entorno urbano.</p>";
        }
    });
}

// Ejecutar la carga del mapa al abrir la web
cargarMapaMosaico();