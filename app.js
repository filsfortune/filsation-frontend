// ==========================================
// 1. CONFIGURACIÓN DE SANITY
// ==========================================
const PROJECT_ID = 'hhdji3nw'; 
const DATASET = 'production';
const API_VERSION = 'v2021-10-21';

const query = encodeURIComponent('*[_type == "fotografia"]{ titulo, municipioAsociado, descripcion, "urlImagen": imagen.asset->url }');
const url = `https://${PROJECT_ID}.api.sanity.io/${API_VERSION}/data/query/${DATASET}?query=${query}`;

// ==========================================
// 2. OBTENCIÓN DE DATOS (CON FILTRO DE SEGURIDAD)
// ==========================================
async function obtenerFotosDeSanity() {
    const contenedor = document.getElementById('contenedor-galeria');
    // Si no existe el contenedor de fotos, no hacemos la petición al API para no congelar el sitio
    if (!contenedor) return;

    try {
        const respuesta = await fetch(url);
        const datos = await respuesta.json();
        
        if (datos.result && datos.result.length > 0) {
            renderizarGaleriaEstiloPinterest(datos.result, contenedor);
        } else {
            contenedor.innerHTML = '<p class="sin-fotos">No hay fotografías disponibles.</p>';
        }
    } catch (error) {
        console.error("Error al conectar con Sanity:", error);
    }
}

// ==========================================
// 3. RENDERIZADO ESTILO PINTEREST
// ==========================================
function renderizarGaleriaEstiloPinterest(fotos, contenedor) {
    contenedor.innerHTML = ''; 

    fotos.forEach((foto, indice) => {
        if (!foto.urlImagen) return;

        const tarjeta = document.createElement('div');
        tarjeta.className = 'tarjeta-foto-pinterest';

        tarjeta.innerHTML = `
            <img src="${foto.urlImagen}" alt="${foto.titulo || 'Fotografía'}">
            <div class="capa-hover">
                <span>Ver detalles</span>
            </div>
        `;

        tarjeta.addEventListener('click', () => {
            abrirLightboxZoom(foto);
        });

        contenedor.appendChild(tarjeta);
    });
}

// ==========================================
// 4. LÓGICA DEL LIGHTBOX (ZOOM)
// ==========================================
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
// 5. CONTROL DE NAVEGACIÓN (TABS) - ¡SIEMPRE ACTIVO!
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

    // 💡 TRUCO CLAVE: Si cambias a la pestaña de fotos, cárgalas en ese instante
    if (idPestaña === 'photos' || idPestaña === 'PHOTOS') {
        obtenerFotosDeSanity();
    }
}

// Hacemos la función global para que los botones onclick del HTML la vean pase lo que pase
window.cambiarPestaña = cambiarPestaña;

// ==========================================
// 6. LÓGICA DEL MAPA (PROTEGIDA)
// ==========================================
function inicializarMapaProvincia() {
    const mapaElemento = document.getElementById('map');
    // Si el mapa no está en la pantalla actual, detenemos la función amigablemente
    if (!mapaElemento) return;

    console.log("Inicializando mapa de la Provincia de La Habana...");
    
    // AQUÍ CORRE TU CÓDIGO ACTUAL DEL MAPA
    // (Asegúrate de que tus variables de Leaflet como L.map('map') estén aquí adentro
    // o declaradas correctamente para que carguen los datos de la provincia)
}

// ==========================================
// 7. INICIALIZACIÓN GLOBAL
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // Intentamos cargar el mapa si corresponde
    inicializarMapaProvincia();
    
    // Intentamos cargar las fotos si el contenedor está disponible desde el inicio
    obtenerFotosDeSanity();

    // Configuración de los cierres del Lightbox
    const lightbox = document.getElementById('lightbox-zoom');
    const botonCerrar = document.getElementById('lightbox-cerrar');

    if (lightbox && botonCerrar) {
        botonCerrar.addEventListener('click', () => lightbox.classList.remove('active'));
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) lightbox.classList.remove('active');
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && lightbox.classList.contains('active')) {
                lightbox.classList.remove('active');
            }
        });
    }
});