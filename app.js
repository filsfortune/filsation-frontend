// 1. Configuración de Sanity (Verificado)
const PROJECT_ID = 'hhdji3nw'; 
const DATASET = 'production';
const API_VERSION = 'v2021-10-21';

// 💡 CONSULTA CORREGIDA: Pedimos la URL explícita del "asset" de la imagen
const query = encodeURIComponent('*[_type == "fotografia"]{ titulo, municipioAsociado, descripcion, "urlImagen": imagen.asset->url }');
const url = `https://${PROJECT_ID}.api.sanity.io/${API_VERSION}/data/query/${DATASET}?query=${query}`;

// 2. Función principal para obtener datos
async function obtenerFotosDeSanity() {
    try {
        const respuesta = await fetch(url);
        const datos = await respuesta.json();
        
        console.log("Datos crudos de Sanity:", datos);

        // Validamos que haya resultados
        if (datos.result && datos.result.length > 0) {
            renderizarGaleriaEstiloPinterest(datos.result);
        } else {
            console.warn("No se encontraron fotos publicadas en Sanity.");
            document.getElementById('contenedor-galeria').innerHTML = '<p>No hay fotos disponibles.</p>';
        }

    } catch (error) {
        console.error("Error al conectar con Sanity:", error);
    }
}

// 3. Renderizado estilo Pinterest y evento de Zoom
function renderizarGaleriaEstiloPinterest(fotos) {
    const contenedor = document.getElementById('contenedor-galeria');
    if (!contenedor) return;
    contenedor.innerHTML = ''; // Limpiar recuadros negros anteriores

    fotos.forEach(foto => {
        // Validación de seguridad para la URL
        if (!foto.urlImagen) {
            console.warn("Una foto no tiene URL válida:", foto);
            return; // Saltamos esta foto si no tiene imagen
        }

        const tarjeta = document.createElement('div');
        tarjeta.className = 'tarjeta-foto-pinterest';

        // Estructura HTML de la tarjeta
        tarjeta.innerHTML = `
            <img src="${foto.urlImagen}" alt="${foto.titulo || 'Fotografía de Arquitectura'}">
            <div class="capa-hover">
                <span>Ver detalles</span>
            </div>
        `;

        // 🌟 EVENTO: Al hacer clic, abre la foto en grande (Lightbox)
        tarjeta.addEventListener('click', () => {
            abrirLightboxZoom(foto);
        });

        contenedor.appendChild(tarjeta);
    });
}

// 4. Lógica de la Ventana Flotante (Lightbox Zoom)
function abrirLightboxZoom(foto) {
    const lightbox = document.getElementById('lightbox-zoom');
    const imgZoom = document.getElementById('lightbox-img');
    const tituloZoom = document.getElementById('lightbox-titulo');
    const municipioZoom = document.getElementById('lightbox-municipio');
    const descZoom = document.getElementById('lightbox-descripcion');

    // Inyectamos los datos en el Lightbox
    imgZoom.src = foto.urlImagen;
    tituloZoom.textContent = foto.titulo || 'Sin título';
    municipioZoom.textContent = foto.municipioAsociado || 'Municipio';
    descZoom.textContent = foto.descripcion || '';

    // Mostramos la ventana añadiendo la clase activa
    lightbox.classList.add('activo');
}

// 5. Inicialización y controles de cierre
document.addEventListener('DOMContentLoaded', () => {
    obtenerFotosDeSanity();

    const lightbox = document.getElementById('lightbox-zoom');
    const botonCerrar = document.getElementById('lightbox-cerrar');

    if (botonCerrar && lightbox) {
        // Cerrar con la 'X'
        botonCerrar.addEventListener('click', () => lightbox.classList.remove('activo'));
        
        // Cerrar haciendo clic fuera de la foto
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) {
                lightbox.classList.remove('activo');
            }
        });
        
        // Cerrar con la tecla Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && lightbox.classList.contains('activo')) {
                lightbox.classList.remove('activo');
            }
        });
    }
});