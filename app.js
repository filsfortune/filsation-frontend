// ==========================================
// 1. CONFIGURACIÓN DE SANITY
// ==========================================
const PROJECT_ID = 'hhdji3nw'; 
const DATASET = 'production';
const API_VERSION = 'v2021-10-21';

// Consulta GROQ optimizada: Extrae de forma explícita el asset de la imagen para evitar recuadros vacíos.
const query = encodeURIComponent('*[_type == "fotografia"]{ titulo, municipioAsociado, descripcion, "urlImagen": imagen.asset->url }');
const url = `https://${PROJECT_ID}.api.sanity.io/${API_VERSION}/data/query/${DATASET}?query=${query}`;

// ==========================================
// 2. OBTENCIÓN DE DATOS DESDE LA API
// ==========================================
async function obtenerFotosDeSanity() {
    try {
        const respuesta = await fetch(url);
        const datos = await respuesta.json();
        
        console.log("Datos crudos recibidos de Sanity:", datos);

        // Validamos pacíficamente que existan fotos dentro del resultado
        if (datos.result && datos.result.length > 0) {
            renderizarGaleriaEstiloPinterest(datos.result);
        } else {
            console.warn("Sanity respondió con éxito, pero no se encontraron documentos tipo 'fotografia'.");
            const contenedor = document.getElementById('contenedor-galeria');
            if (contenedor) {
                contenedor.innerHTML = '<p class="sin-fotos">No hay fotografías disponibles en este momento.</p>';
            }
        }

    } catch (error) {
        console.error("Error crítico al intentar conectar con el API de Sanity:", error);
    }
}

// ==========================================
// 3. RENDERIZADO DEL MURO ESTILO PINTEREST
// ==========================================
function renderizarGaleriaEstiloPinterest(fotos) {
    const contenedor = document.getElementById('contenedor-galeria');
    
    // Control de seguridad: Si el usuario está en el HOME, esta pestaña no tiene la galería y frena la ejecución sin lanzar errores.
    if (!contenedor) {
        console.log("Contenedor '#contenedor-galeria' no detectado en esta pantalla. Saltando renderizado.");
        return;
    }
    
    contenedor.innerHTML = ''; // Limpiamos cualquier residuo visual o de pruebas previas

    fotos.forEach((foto, indice) => {
        // Doble validación de seguridad para garantizar que exista una URL de imagen utilizable
        if (!foto.urlImagen) {
            console.warn(`La fotografía en el índice [${indice}] no contiene un asset de imagen válido de Sanity:`, foto);
            return; // Omite esta tarjeta para evitar romper el diseño del grid
        }

        const tarjeta = document.createElement('div');
        tarjeta.className = 'tarjeta-foto-pinterest';

        // Estructura semántica de la tarjeta inyectada
        tarjeta.innerHTML = `
            <img src="${foto.urlImagen}" alt="${foto.titulo || 'Fotografía Arquitectónica'}">
            <div class="capa-hover">
                <span>Ver detalles</span>
            </div>
        `;

        // Añadimos el disparador para abrir la ventana flotante (Zoom-In Lightbox) al hacer clic
        tarjeta.addEventListener('click', () => {
            abrirLightboxZoom(foto);
        });

        contenedor.appendChild(tarjeta);
    });
}

// ==========================================
// 4. LÓGICA DE LA VENTANA FLOTANTE (LIGHTBOX ZOOM)
// ==========================================
function abrirLightboxZoom(foto) {
    const lightbox = document.getElementById('lightbox-zoom');
    const imgZoom = document.getElementById('lightbox-img');
    const tituloZoom = document.getElementById('lightbox-titulo');
    const municipioZoom = document.getElementById('lightbox-municipio');
    const descZoom = document.getElementById('lightbox-descripcion');

    // Mapeamos los datos dinámicos obtenidos del objeto de Sanity
    if (imgZoom) imgZoom.src = foto.urlImagen;
    if (tituloZoom) tituloZoom.textContent = foto.titulo || 'Sin título';
    if (municipioZoom) municipioZoom.textContent = foto.municipioAsociado || 'Municipio no especificado';
    if (descZoom) descZoom.textContent = foto.descripcion || 'Sin descripción disponible para esta obra.';

    // Mostramos la interfaz de Zoom añadiendo la clase CSS activa
    if (lightbox) {
        lightbox.classList.add('activo');
    }
}

// ==========================================
// 5. INICIALIZACIÓN DE EVENTOS Y CONTROLES
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // Inicializamos la llamada a la base de datos de Sanity de inmediato al cargar el DOM
    obtenerFotosDeSanity();

    const lightbox = document.getElementById('lightbox-zoom');
    const botonCerrar = document.getElementById('lightbox-cerrar');

    if (lightbox && botonCerrar) {
        // Opción 1: Cerrar presionando directamente la 'X' superior
        botonCerrar.addEventListener('click', () => {
            lightbox.classList.remove('activo');
        });
        
        // Opción 2: Cerrar haciendo clic sobre el fondo translúcido (fuera del recuadro blanco de información)
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) {
                lightbox.classList.remove('activo');
            }
        });
        
        // Opción 3: Accesibilidad avanzada mediante teclado presionando la tecla Escape ('ESC')
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && lightbox.classList.contains('activo')) {
                lightbox.classList.remove('activo');
            }
        });
    }
});

// ==========================================
// 6. CONTROL DE NAVEGACIÓN (TABS)
// ==========================================
function cambiarPestaña(idPestaña) {
    // 1. Ocultar todos los contenidos de las pestañas
    const contenidos = document.querySelectorAll('.tab-content');
    contenidos.forEach(contenido => {
        contenido.classList.remove('active');
    });

    // 2. Desactivar todos los botones del menú
    const botones = document.querySelectorAll('.tab-btn');
    botones.forEach(boton => {
        boton.classList.remove('active');
    });

    // 3. Mostrar la pestaña actual seleccionada
    const pestañaActiva = document.getElementById(idPestaña);
    if (pestañaActiva) {
        pestañaActiva.classList.add('active');
    }

    // 4. Activar el botón correspondiente que recibió el clic
    // Buscamos el botón que tenga el atributo onclick apuntando a esta pestaña
    const botonActivo = document.querySelector(`.tab-btn[onclick*="${idPestaña}"]`);
    if (botonActivo) {
        botonActivo.classList.add('active');
    }
    
    console.log(`Navegando a la pestaña: ${idPestaña}`);
}

// Hacemos la función global explícitamente para que el HTML (onclick) pueda leerla siempre
window.cambiarPestaña = cambiarPestaña;