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

// ==========================================
// 6. LÓGICA DE LA PESTAÑA DE BLOG (SPLIT)
// ==========================================

// Datos simulados (Reemplazables en el futuro por fetch de Sanity)
const baseDatosBlog = [
    {
        id: 1,
        titulo: "UNStudio Reveals River-Orientated Master Plan for Former Industrial Site in Cluj-Napoca, Romania",
        fecha: "about 11 hours ago",
        imagen: "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=800", // Aquí irá tu imagen de arquitectura
        contenido: "UNStudio has unveiled a transformative master plan designed to revitalize a former industrial landscape into a vibrant, green, urban ecosystem. Spanning multiple hectares along the river corridor, the project introduces state-of-the-art sustainable frameworks, integrating residential, commercial, and public green spaces. The design seamlessly blends pedestrian-first mobility with smart infrastructure networks, setting a brand-new architectural benchmark for urban renewals in eastern Europe. Residents will enjoy extensive boardwalks, integrated water treatment wetlands, and architectural typologies that prioritize natural ventilation and solar alignment."
    },
    {
        id: 2,
        titulo: "Elizabeth Mews House / Trewhela Williams",
        fecha: "Yesterday",
        imagen: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800",
        contenido: "Located in the heart of London, this contemporary mews house intervention balances heritage preservation with radical modern spatial layouts. Trewhela Williams architects approached the facade with a delicate touch, introducing pale brick accents and rhythmic structural openings that optimize natural light penetration without compromising private indoor environments."
    },
    {
        id: 3,
        titulo: "Bogotá Architecture Guide: 30 Places to Discover in Colombia's Capital City",
        fecha: "3 days ago",
        imagen: "https://images.unsplash.com/photo-1584967918940-a7d51b06427b?w=800",
        contenido: "Exploring the hybrid architectural identity of Bogotá requires diving deep into its brick modernism, colonial foundations, and avant-garde skyscrapers. From Rogelio Salmona's masterful spatial fluidities in the Torres del Parque to the latest high-density vertical projects in the international center, this curated guide offers a thorough geometric analysis of Colombia's evolving skyline."
    }
];

// Función para inicializar el blog
function cargarModuloBlog() {
    const zonaLista = document.getElementById('lista-articulos-zona');
    if (!zonaLista) return;

    zonaLista.innerHTML = '';

    // 1. Renderizar la lista lateral derecha
    baseDatosBlog.forEach((articulo, index) => {
        const tarjeta = document.createElement('div');
        tarjeta.className = `tarjeta-miniatura ${index === 0 ? 'activa' : ''}`;
        tarjeta.setAttribute('data-id', articulo.id);

        tarjeta.innerHTML = `
            <img src="${articulo.imagen}" alt="Miniatura">
            <div class="info-miniatura">
                <h4>${articulo.titulo}</h4>
                <span>${articulo.fecha}</span>
            </div>
        `;

        // Evento clic para cambiar el artículo de la izquierda
        tarjeta.addEventListener('click', () => {
            seleccionarArticuloBlog(articulo.id);
        });

        zonaLista.appendChild(tarjeta);
    });

    // 2. Cargar por defecto el primero (el más reciente) a la izquierda
    if (baseDatosBlog.length > 0) {
        mostrarArticuloIzquierda(baseDatosBlog[0]);
    }
}

// Cambia visualmente el foco del artículo seleccionado
function seleccionarArticuloBlog(id) {
    // Quitar clase activa a todas las miniaturas
    document.querySelectorAll('.tarjeta-miniatura').forEach(t => t.classList.remove('activa'));
    
    // Añadir clase activa a la seleccionada
    const tarjetaSeleccionada = document.querySelector(`.tarjeta-miniatura[data-id="${id}"]`);
    if (tarjetaSeleccionada) tarjetaSeleccionada.classList.add('activa');

    // Buscar el artículo de la base de datos e inyectarlo
    const articulo = baseDatosBlog.find(a => a.id === id);
    if (articulo) {
        mostrarArticuloIzquierda(articulo);
    }
}

// Inyecta el contenido completo a la izquierda y resetea el scroll hacia arriba
function mostrarArticuloIzquierda(articulo) {
    const zonaArticulo = document.getElementById('articulo-completo-zona');
    if (!zonaArticulo) return;

    zonaArticulo.innerHTML = `
        <h2>${articulo.titulo}</h2>
        <div class="meta-fecha">${articulo.fecha}</div>
        <img src="${articulo.imagen}" alt="${articulo.titulo}">
        <div class="cuerpo-texto">${articulo.contenido}</div>
    `;

    // 🌟 EFECTO REQUERIDO: Reinicia el scroll del panel izquierdo arriba al cambiar de texto
    zonaArticulo.scrollTo({ top: 0, behavior: 'smooth' });
}

// Corregir el interceptor al final de tu app.js
const originalCambiarPestaña = window.cambiarPestaña;
window.cambiarPestaña = function(idPestaña) {
    if (typeof originalCambiarPestaña === 'function') {
        originalCambiarPestaña(idPestaña);
    }
    
    // 🌟 COMPROBACIÓN COMPLETAMENTE CORREGIDA:
    if (idPestaña === 'blog' || idPestaña === 'BLOG') {
        cargarModuloBlog();
    }
};


// ============================================================
// INTERACCIÓN EXCLUSIVA PARA LA PESTAÑA DE MAPAS (ESTÁTICO)
// ============================================================
function cambiarMapaVisualizado(rutaImagen, tituloMapa) {
    // 1. Capturamos el visor de la izquierda (Imagen y Título)
    const imgGrande = document.getElementById('foto-mapa-grande');
    const tituloGrande = document.getElementById('titulo-mapa-grande');
    
    // Si los elementos existen, cambiamos su contenido dinámicamente
    if (imgGrande && tituloGrande) {
        imgGrande.src = rutaImagen;
        tituloGrande.textContent = tituloMapa;
    }

    // 2. Cambiamos el estado visual del botón seleccionado en la derecha
    // Buscamos todos los botones que tengan la clase 'map-item' dentro de la sección de mapas
    const botonesMapas = document.querySelectorAll('#pantalla-mapas .map-item');
    
    // Le quitamos la clase 'active' a todos para que se apaguen
    botonesMapas.forEach(btn => btn.classList.remove('active'));
    
    // Le ponemos la clase 'active' al botón exacto al que le acabamos de dar clic
    if (window.event && window.event.currentTarget) {
        window.event.currentTarget.classList.add('active');
    }
}

// ==========================================
// MÓDULO DE MAPAS DINÁMICOS DESDE SANITY
// ==========================================
async function cargarModuloMapas() {
    const ID_PROYECTO = 'hhdji3nw';
    const DATASET = 'production';
    const QUERY = encodeURIComponent(`*[_type == "mapa"] | order(orden asc){
        titulo,
        icono,
        "url": imagen.asset->url
    }`);
    
    const URL = `https://${ID_PROYECTO}.api.sanity.io/v2021-10-21/data/query/${DATASET}?query=${QUERY}`;
    const contenedor = document.getElementById('contenedor-botones-mapas');
    const imgVisor = document.getElementById('foto-mapa-grande');
    const txtVisor = document.getElementById('titulo-mapa-grande');

    try {
        const res = await fetch(URL);
        const json = await res.json();
        const mapas = json.result;

        if (mapas && mapas.length > 0) {
            contenedor.innerHTML = ''; // Limpiar botones viejos

            mapas.forEach((mapa, i) => {
                const btn = document.createElement('button');
                btn.className = `map-item ${i === 0 ? 'active' : ''}`;
                btn.innerHTML = `<span class="icon">${mapa.icono || '🗺️'}</span> ${mapa.titulo}`;
                
                btn.onclick = () => {
                    // Cambiar clases active
                    document.querySelectorAll('.map-item').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    // Cambiar foto visor
                    imgVisor.src = mapa.url;
                    txtVisor.textContent = mapa.titulo;
                };
                contenedor.appendChild(btn);
            });

            // Cargar el primer mapa por defecto
            imgVisor.src = mapas[0].url;
            txtVisor.textContent = mapas[0].titulo;
        }
    } catch (e) {
        console.error("Error cargando mapas:", e);
    }
}

