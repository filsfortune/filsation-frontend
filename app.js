// ==========================================
// 1. CONFIGURACIÓN GENERAL Y CREDENCIALES
// ==========================================
// API de Sanity para las fotos
const PROJECT_ID = 'hhdji3nw'; 
const DATASET = 'production';
const API_VERSION = 'v2021-10-21';
const querySanity = encodeURIComponent('*[_type == "fotografia"]{ titulo, municipioAsociado, descripcion, "urlImagen": imagen.asset->url }');
const urlSanity = `https://${PROJECT_ID}.api.sanity.io/${API_VERSION}/data/query/${DATASET}?query=${querySanity}`;

// 🗺️ Tu Backend en Render para los datos GIS de La Habana
const API_URL_BACKEND = 'https://filsation-cms.onrender.com/api'; // O la URL real de tu backend de Render

// Variable global para controlar el mapa de Leaflet
let mapaLaHabana;
let capaMunicipios;

// ==========================================
// 2. CONTROL DE NAVEGACIÓN (TABS) - GLOBAL
// ==========================================
function cambiarPestaña(idPestaña) {
    const contenidos = document.querySelectorAll('.tab-content');
    contenidos.forEach(contenido => contenido.classList.remove('active'));

    const botones = document.querySelectorAll('.tab-btn');
    botones.forEach(boton => boton.classList.remove('active'));

    const pestañaActiva = document.getElementById(idPestaña);
    if (pestañaActiva) pestañaActiva.classList.add('active');

    const botonActivo = document.querySelector(`.tab-btn[onclick*="${idPestaña}"]`);
    if (botonActivo) botonActivo.classList.add('active');

    console.log(`Navegando a: ${idPestaña}`);

    // Si vuelves al Home, obligamos a Leaflet a recalcular el tamaño para que no se vea gris
    if (idPestaña === 'home' && mapaLaHabana) {
        setTimeout(() => { mapaLaHabana.invalidateSize(); }, 200);
    }
    
    // Si entras a Fotos, las cargamos en ese instante
    if (idPestaña === 'photos' || idPestaña === 'PHOTOS') {
        obtenerFotosDeSanity();
    }
}
// Lo exponemos al HTML obligatoriamente
window.cambiarPestaña = cambiarPestaña;

// ==========================================
// 3. LÓGICA DEL MAPA INTERACTIVO (LEAFLET)
// ==========================================
async function inicializarMapaProvincia() {
    const mapaElemento = document.getElementById('map');
    if (!mapaElemento) return; // Si no estamos en la vista del mapa, salimos pacíficamente

    console.log("Inicializando mapa base de la Provincia de La Habana...");

    try {
        // 1. Crear el objeto mapa centrado en La Habana, Cuba
        mapaLaHabana = L.map('map').setView([23.045, -82.355], 11);

        // 2. Cargar la capa base de mapa (OpenStreetMap con diseño claro)
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '© OpenStreetMap | © CARTO',
            maxZoom: 19
        }).addTo(mapaLaHabana);

        // 3. Crear un grupo de capas para meter los municipios adentro
        capaMunicipios = L.layerGroup().addTo(mapaLaHabana);

        // 4. Cambiar el texto de "Cargando..." por uno listo
        const panelCuerpo = document.getElementById('panel-cuerpo');
        if (panelCuerpo) panelCuerpo.innerHTML = "Selecciona un municipio en el mapa interactivo para analizar sus datos urbanos.";

        // 5. HACER FETCH A TU BACKEND PARA TRAER LOS MUNICIPIOS (POSTGIS)
        // Reemplaza '/municipios' por la ruta exacta de tu API de Express
        const respuesta = await fetch(`${API_URL_BACKEND}/municipios`);
        const datosGeoJSON = await respuesta.json();

        console.log("Datos geográficos recibidos:", datosGeoJSON);

        // Dibujamos los polígonos de los municipios en el mapa
        L.geoJSON(datosGeoJSON, {
            style: {
                color: "#000000",   // Borde negro fino icónico de tu diseño
                weight: 1,
                fillColor: "#333333",
                fillOpacity: 0.1
            },
            onEachFeature: (feature, layer) => {
                // Interactividad: Al pasar el mouse por encima del municipio
                layer.on('mouseover', () => {
                    layer.setStyle({ fillOpacity: 0.3 });
                });
                layer.on('mouseout', () => {
                    layer.setStyle({ fillOpacity: 0.1 });
                });
                // Al hacer clic, actualiza el panel derecho con la información del municipio
                layer.on('click', () => {
                    const tituloPanel = document.getElementById('panel-titulo');
                    const cuerpoPanel = document.getElementById('panel-cuerpo');
                    
                    if (tituloPanel) tituloPanel.textContent = feature.properties.nombre || feature.properties.name || "Municipio";
                    if (cuerpoPanel) cuerpoPanel.textContent = feature.properties.descripcion || "Información de infraestructura de la Smart City en desarrollo.";
                });
            }
        }).addTo(capaMunicipios);

    } catch (error) {
        console.error("Error al montar el mapa o cargar los datos GeoJSON:", error);
        const panelCuerpo = document.getElementById('panel-cuerpo');
        if (panelCuerpo) panelCuerpo.innerHTML = "<span style='color:red;'>Error al conectar con la infraestructura de datos espaciales.</span>";
    }
}

// ==========================================
// 4. LÓGICA DE LA GALERÍA DE SANITY
// ==========================================
async function obtenerFotosDeSanity() {
    const contenedor = document.getElementById('contenedor-galeria');
    if (!contenedor) return;

    try {
        const respuesta = await fetch(urlSanity);
        const datos = await respuesta.json();
        
        if (datos.result && datos.result.length > 0) {
            renderizarGaleriaEstiloPinterest(datos.result, contenedor);
        } else {
            contenedor.innerHTML = '<p>No hay fotos publicadas en este momento.</p>';
        }
    } catch (error) {
        console.error("Error en Sanity:", error);
    }
}

function renderizarGaleriaEstiloPinterest(fotos, contenedor) {
    contenedor.innerHTML = ''; 

    fotos.forEach(foto => {
        if (!foto.urlImagen) return;

        const tarjeta = document.createElement('div');
        tarjeta.className = 'tarjeta-foto-pinterest';
        tarjeta.innerHTML = `
            <img src="${foto.urlImagen}" alt="${foto.titulo || 'Fotografía'}">
            <div class="capa-hover"><span>Ver detalles</span></div>
        `;

        tarjeta.addEventListener('click', () => { abrirLightboxZoom(foto); });
        contenedor.appendChild(tarjeta);
    });
}

function abrirLightboxZoom(foto) {
    const lightbox = document.getElementById('lightbox-zoom');
    const imgZoom = document.getElementById('lightbox-img');
    const tituloZoom = document.getElementById('lightbox-titulo');
    const municipioZoom = document.getElementById('lightbox-municipio');
    const descZoom = document.getElementById('lightbox-descripcion');

    if (imgZoom) imgZoom.src = foto.urlImagen;
    if (tituloZoom) tituloZoom.textContent = foto.titulo || 'Sin título';
    if (municipioZoom) municipioZoom.textContent = foto.municipioAsociado || 'Municipio';
    if (descZoom) descZoom.textContent = foto.descripcion || '';

    if (lightbox) lightbox.classList.add('activo');
}

// ==========================================
// 5. INICIALIZADOR AL CARGAR EL DOM
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // 1. Cargamos el mapa base
    inicializarMapaProvincia();

    // 2. Configuración de cierres del Lightbox de fotos
    const lightbox = document.getElementById('lightbox-zoom');
    const botonCerrar = document.getElementById('lightbox-cerrar');

    if (lightbox && botonCerrar) {
        botonCerrar.addEventListener('click', () => lightbox.classList.remove('activo'));
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) lightbox.classList.remove('activo');
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && lightbox.classList.contains('activo')) {
                lightbox.classList.remove('activo');
            }
        });
    }
});