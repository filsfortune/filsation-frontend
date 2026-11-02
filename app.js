// ===================================================
// 1. CONFIGURACIÓN GENERAL Y CREDENCIALES (SANITY)
// ===================================================
const PROJECT_ID = 'hhdji3nw'; 
const DATASET = 'production';
const API_VERSION = 'v2021-10-21';

// Query para extraer las fotos de la galería (Pestaña Photos)
const querySanity = encodeURIComponent('*[_type == "fotografia"]{ titulo, municipioAsociado, descripcion, "urlImagen": imagen.asset->url }');
const urlSanity = `https://${PROJECT_ID}.api.sanity.io/${API_VERSION}/data/query/${DATASET}?query=${querySanity}`;

// Query para extraer los mapas cartográficos (Pestaña Maps)
const queryMapas = encodeURIComponent('*[_type == "mapa"]{ titulo, "urlImagen": imagen.asset->url }');
const urlSanityMapas = `https://${PROJECT_ID}.api.sanity.io/${API_VERSION}/data/query/${DATASET}?query=${queryMapas}`;

// Query para extraer la multimedia del carrusel (Pestaña Home)
const queryHome = encodeURIComponent('*[_type == "multimediaHome"] | order(orden asc){ _id, tipo, "imagenUrl": imagen.asset->url, "videoUrl": videoFile.asset->url }');
const urlSanityHome = `https://${PROJECT_ID}.api.sanity.io/${API_VERSION}/data/query/${DATASET}?query=${queryHome}`;

// Variable global para controlar el carrusel de la Home
let indiceSlideActual = 0;

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

    // Si entras al Home, cargamos el carrusel multimedia
    if (idPestaña === 'home' || idPestaña === 'HOME') {
        cargarMultimediaHomeSanity();
    }
    
    // Si entras a Fotos, las cargamos en ese instante
    if (idPestaña === 'photos' || idPestaña === 'PHOTOS') {
        obtenerFotosDeSanity();
    }

    // Si entras a Maps, cargamos el catálogo cartográfico de Sanity
    if (idPestaña === 'maps' || idPestaña === 'MAPS') {
        cargarMapasDesdeSanity();
    }
}
window.cambiarPestaña = cambiarPestaña;

// ==========================================
// 3. CARRUSEL MULTIMEDIA EN HOME (SANITY)
// ==========================================
async function cargarMultimediaHomeSanity() {
    const track = document.getElementById('carruselTrack');
    if (!track) return;
    
    // Evitamos peticiones repetidas si las diapositivas ya están montadas
    if (track.querySelectorAll('.slide').length > 0) return;

    try {
        const respuesta = await fetch(urlSanityHome);
        if (!respuesta.ok) throw new Error("Fallo al conectar con Sanity Home");
        
        const datos = await respuesta.json();
        const items = datos.result;

        if (!items || items.length === 0) {
            track.innerHTML = '<div class="slide-loading">No hay contenido publicado en la Home.</div>';
            return;
        }

        // Construcción dinámica de slides (fotos o vídeos)
        track.innerHTML = items.map(item => {
            if (item.tipo === 'foto' && item.imagenUrl) {
                return `
                    <div class="slide">
                        <img src="${item.imagenUrl}?auto=format&q=80" alt="Fotografía" class="slide-media">
                        <span class="slide-badge">Fotografía</span>
                    </div>
                `;
            } else if (item.tipo === 'video' && item.videoUrl) {
                return `
                    <div class="slide">
                        <video class="slide-media" autoplay loop muted playsinline>
                            <source src="${item.videoUrl}" type="video/mp4">
                        </video>
                        <span class="slide-badge">Vídeo Clip</span>
                    </div>
                `;
            }
            return '';
        }).join('');

        inicializarDotsCarrusel(items.length);

    } catch (error) {
        console.error("Error cargando carrusel Home desde Sanity:", error);
        track.innerHTML = '<div class="slide-loading">Error al sincronizar multimedia.</div>';
    }
}

function inicializarDotsCarrusel(totalSlides) {
    const contenedorDots = document.getElementById('carruselDots');
    if (!contenedorDots) return;
    
    contenedorDots.innerHTML = '';
    for (let i = 0; i < totalSlides; i++) {
        const dot = document.createElement('span');
        dot.classList.add('dot');
        if (i === 0) dot.classList.add('active');
        dot.addEventListener('click', () => irASlide(i));
        contenedorDots.appendChild(dot);
    }
}

function irASlide(index) {
    const track = document.getElementById('carruselTrack');
    const slides = document.querySelectorAll('.slide');
    const dots = document.querySelectorAll('.dot');
    
    if (slides.length === 0) return;
    if (index < 0) index = slides.length - 1;
    if (index >= slides.length) index = 0;

    indiceSlideActual = index;
    const anchoSlide = slides[0].clientWidth;
    
    track.scrollTo({
        left: anchoSlide * index,
        behavior: 'smooth'
    });

    dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === index);
    });
}

function moverCarrusel(direccion) {
    irASlide(indiceSlideActual + direccion);
}
window.moverCarrusel = moverCarrusel;

// ==========================================
// 4. GALERÍA DE FOTOS PINTEREST (PESTAÑA PHOTOS)
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
        console.error("Error en Sanity Fotos:", error);
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
// 5. VISOR DE MAPAS CARTOGRÁFICOS (PESTAÑA MAPS)
// ==========================================
async function cargarMapasDesdeSanity() {
    const contenedorLista = document.getElementById('ancla-lista-mapas');
    const visorImagen = document.getElementById('foto-visor-principal');
    
    if (contenedorLista && contenedorLista.querySelectorAll('.carta-mapa-item').length > 0) return;

    try {
        const respuesta = await fetch(urlSanityMapas);
        if (!respuesta.ok) throw new Error("Fallo en la respuesta del servidor");
        
        const datos = await respuesta.json();
        const listaDeMapas = datos.result;

        if (!contenedorLista) return;
        contenedorLista.innerHTML = ''; 

        if (listaDeMapas.length === 0) {
            contenedorLista.innerHTML = '<div class="cargando-estado">No hay mapas cargados en Sanity.</div>';
            return;
        }

        if (visorImagen) {
            visorImagen.src = listaDeMapas[0].urlImagen;
            visorImagen.alt = listaDeMapas[0].titulo || 'Mapa de la Ciudad';
        }

        listaDeMapas.forEach((mapa, index) => {
            const tarjeta = document.createElement('div');
            tarjeta.className = 'carta-mapa-item';
            
            if (index === 0) tarjeta.classList.add('seleccionada');

            tarjeta.innerHTML = `
                <h4>${mapa.titulo || 'Sin título'}</h4>
                <p>Plano cartográfico técnico.</p>
            `;

            tarjeta.addEventListener('click', () => {
                document.querySelectorAll('.carta-mapa-item').forEach(c => c.classList.remove('seleccionada'));
                tarjeta.classList.add('seleccionada');

                if (visorImagen) {
                    visorImagen.style.opacity = '0.3';
                    setTimeout(() => {
                        visorImagen.src = mapa.urlImagen;
                        visorImagen.alt = mapa.titulo || 'Mapa Seleccionado';
                        visorImagen.style.opacity = '1';
                    }, 150);
                }
            });

            contenedorLista.appendChild(tarjeta);
        });

    } catch (error) {
        console.error("Error conectando a la API de Sanity Mapas:", error);
        if (contenedorLista) {
            contenedorLista.innerHTML = '<div class="cargando-estado" style="color: red;">Error al sincronizar datos de mapas.</div>';
        }
    }
}

// ==========================================
// 6. INICIALIZADOR Y EVENTOS AL CARGAR EL DOM
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // 1. Cargar contenido por defecto para la Home
    cargarMultimediaHomeSanity();

    // 2. Controladores de cierre del Lightbox de Fotos
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