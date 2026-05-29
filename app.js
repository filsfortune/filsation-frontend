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

        // Actualizar el título principal de la pantalla
        document.getElementById('panel-titulo').innerText = nombre;
        document.getElementById('panel-cuerpo').innerHTML = `<p class="loading">Analizando entorno de ${nombre}...</p>`;

        try {
            const respuesta = await fetch(`${API_URL}/municipios/${id}`);
            const detalle = await respuesta.json();

            // Formatear los números para que se vean profesionales
            const poblacionFormateada = detalle.poblacion > 0 ? `${Number(detalle.poblacion).toLocaleString()} hab.` : 'Dato en actualización';
            const extensionFormateada = detalle.extension > 0 ? `${detalle.extension} km²` : 'Dato en actualización';

            // Insertar el contenido en el panel derecho con diseño limpio (Sin IDs)
            document.getElementById('panel-cuerpo').innerHTML = `
                <div style="margin-bottom: 25px; font-family: sans-serif; font-size: 13px; letter-spacing: 1px; text-transform: uppercase; color: #555;">
                    <span><strong>Extensión:</strong> ${extensionFormateada}</span>
                    <span style="margin-left: 20px;"><strong>Población:</strong> ${poblacionFormateada}</span>
                </div>
                <p style="text-align: justify; font-size: 16px; font-family: 'Playfair Display', Georgia, serif; line-height: 1.7; color: #111;">
                    ${detalle.reseña}
                </p>
            `;
        } catch (error) {
            console.error("Error al obtener detalles del municipio:", error);
            document.getElementById('panel-cuerpo').innerHTML = "<p>No se pudieron recuperar los indicadores de este entorno urbano.</p>";
        }
    });
}

// 1. Configuración de tus credenciales de Sanity
const PROJECT_ID = 'hhdji3nw'; // <-- Reemplaza esto con tu ID de Sanity
const DATASET = 'production';
const API_VERSION = 'v2021-10-21';

// 2. Construcción de la consulta (Trae todos los documentos de tipo 'fotografia')
const query = encodeURIComponent('*[_type == "fotografia"]{ title, municipioAsociado, "urlImagen": imagen.asset->url, descripcion }');
const url = `https://${PROJECT_ID}.api.sanity.io/${API_VERSION}/data/query/${DATASET}?query=${query}`;

// 3. Función para obtener las fotos
async function obtenerFotosDeSanity() {
  try {
    const respuesta = await fetch(url);
    const datos = await respuesta.json();
    const contenedor = document.getElementById('contenedor-galeria');
    
    // Aquí tienes el array con todas tus fotos listas para usar
    console.log("Fotos recibidas de Sanity:", datos.result);
    
    // Aquí puedes llamar a una función para pintar las fotos en tu mapa o galería
    // ejemplo: inicializarGaleria(datos.result);
    
  } catch (error) {
    console.error("Error al conectar con Sanity:", error);
  }
}

// Ejecutar la función al cargar la página
obtenerFotosDeSanity();

// Ejecutar la carga del mapa al abrir la web
cargarMapaMosaico();