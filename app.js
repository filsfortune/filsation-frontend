// ===================================================
// 1. CONFIGURACIÓN GENERAL Y CREDENCIALES PARA PHOTOS
// ===================================================
// API de Sanity para las fotos
const PROJECT_ID = 'hhdji3nw'; 
const DATASET = 'production';
const API_VERSION = 'v2021-10-21';

// Tu Query para extraer las fotos
const querySanity = encodeURIComponent('*[_type == "fotografia"]{ titulo, municipioAsociado, descripcion, "urlImagen": imagen.asset->url }');
const urlSanity = `https://${PROJECT_ID}.api.sanity.io/${API_VERSION}/data/query/${DATASET}?query=${querySanity}`;

// ===================================================
// 1. CONFIGURACIÓN Y CREDENCIALES DE SANITY PARA MAPS
// ===================================================
const PROJECT_ID = 'hhdji3nw'; 
const DATASET = 'production';
const API_VERSION = 'v2021-10-21';

// Tu Query para extraer los mapas cartográficos
const queryMapas = encodeURIComponent('*[_type == "mapaTematico"]{ titulo, descripcion, "urlImagen": imagen.asset->url }');
const urlSanityMapas = `https://${PROJECT_ID}.api.sanity.io/${API_VERSION}/data/query/${DATASET}?query=${queryMapas}`;

// 🗺️ Tu Backend en Render para los datos GIS de La Habana
const API_URL_BACKEND = 'https://filsation-api.onrender.com/api'; 

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

    // DISPARADOR INTELIGENTE: Si el usuario pulsa 'MAPS', se activa la conexión a Sanity
    if (idPestaña === 'maps') {
        cargarMapasDesdeSanity();
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
        const respuesta = await fetch(`${API_URL_BACKEND}/municipios`);

        // 🌟 AGREGA ESTA COMPROBACIÓN AQUÍ ABAJO:
if (!respuesta.ok) {
    throw new Error(`Error en el servidor: ${respuesta.status}`);
}
        const datosGeoJSON = await respuesta.json();

        console.log("Datos geográficos recibidos:", datosGeoJSON);

        // Dibujamos los polígonos de los municipios en el mapa
        L.geoJSON(datosGeoJSON, {
            style: {
                color: "#000000",   
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
// 4. LÓGICA DE LA GALERÍA FOTOS DE SANITY
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
        
        // Estructura optimizada: Solo el título h4 para la capa hover centrado
        tarjeta.innerHTML = `
            <img src="${foto.urlImagen}" alt="${foto.titulo || 'Fotografía'}">
            <div class="capa-hover">
                <h4>${foto.titulo || 'Sin título'}</h4>
            </div>
        `;

        tarjeta.addEventListener('click', () => { 
            abrirLightboxZoom(foto); 
        });
        
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
// 2. FUNCIÓN DE CARGA DESDE SANITY PARA MAPS
// ==========================================
async function cargarMapasDesdeSanity() {
    const contenedorLista = document.getElementById('ancla-lista-mapas');
    const visorImagen = document.getElementById('foto-visor-principal');
    
    // Si ya hay tarjetas dibujadas, no volvemos a hacer la petición
    if (contenedorLista && contenedorLista.querySelectorAll('.carta-mapa-item').length > 0) return;

    try {
        const respuesta = await fetch(urlSanityMapas);
        if (!respuesta.ok) throw new Error("Fallo en la respuesta del servidor");
        
        const datos = await respuesta.json();
        const listaDeMapas = datos.result;

        if (!contenedorLista) return;
        contenedorLista.innerHTML = ''; // Limpiamos el texto "Conectando..."

        if (listaDeMapas.length === 0) {
            contenedorLista.innerHTML = '<div class="cargando-estado">No hay mapas cargados en Sanity.</div>';
            return;
        }

        // Proyectamos el primer mapa de Sanity de manera automática al abrir la sección
        if (visorImagen && !visorImagen.src) {
            visorImagen.src = listaDeMapas[0].urlImagen;
            visorImagen.alt = listaDeMapas[0].titulo;
        }

        // Creamos los botones laterales para cada mapa
        listaDeMapas.forEach((mapa, index) => {
            const tarjeta = document.createElement('div');
            tarjeta.className = 'carta-mapa-item';
            
            if (index === 0) tarjeta.classList.add('seleccionada');

            tarjeta.innerHTML = `
                <h4>${mapa.titulo || 'Mapa Temático'}</h4>
                <p>${mapa.descripcion || 'Sin descripción.'}</p>
            `;

            // Al hacer clic, cambiamos la foto reflejada en la parte izquierda
            tarjeta.addEventListener('click', () => {
                document.querySelectorAll('.carta-mapa-item').forEach(c => c.classList.remove('seleccionada'));
                tarjeta.classList.add('seleccionada');

                if (visorImagen) {
                    visorImagen.style.opacity = '0.3';
                    setTimeout(() => {
                        visorImagen.src = mapa.urlImagen;
                        visorImagen.alt = mapa.titulo;
                        visorImagen.style.opacity = '1';
                    }, 150);
                }
            });

            contenedorLista.appendChild(tarjeta);
        });

    } catch (error) {
        console.error("Error conectando a la API de Sanity:", error);
        if (contenedorLista) {
            contenedorLista.innerHTML = '<div class="cargando-estado" style="color: red;">Error al sincronizar datos de mapas.</div>';
        }
    }
}

// ==========================================
// 5. INICIALIZADOR AL CARGAR EL DOM
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // 1. Cargamos el mapa base de La Habana
    inicializarMapaProvincia();

    // 2. Configuración de cierres del Lightbox de fotos (Sincronizado con clase 'activo')
    const lightbox = document.getElementById('lightbox-zoom');
    const botonCerrar = document.getElementById('lightbox-cerrar');

    if (lightbox && botonCerrar) {
        botonCerrar.addEventListener('click', () => {
            lightbox.classList.remove('activo');
        });
        
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) {
                lightbox.classList.remove('activo');
            }
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && lightbox.classList.contains('activo')) {
                lightbox.classList.remove('activo');
            }
        });
    }
});






