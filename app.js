// ===================================================
// 1. CONFIGURACIÓN GENERAL Y CREDENCIALES (SANITY)
// ===================================================
const PROJECT_ID = 'hhdji3nw'; 
const DATASET = 'production';
const API_VERSION = 'v2021-10-21';

// Querys GROQ Sanity
const querySanity = encodeURIComponent('*[_type == "fotografia"]{ titulo, municipioAsociado, descripcion, "urlImagen": imagen.asset->url }');
const urlSanity = `https://${PROJECT_ID}.api.sanity.io/${API_VERSION}/data/query/${DATASET}?query=${querySanity}`;

const queryMapas = encodeURIComponent('*[_type == "mapa"]{ titulo, "urlImagen": imagen.asset->url }');
const urlSanityMapas = `https://${PROJECT_ID}.api.sanity.io/${API_VERSION}/data/query/${DATASET}?query=${queryMapas}`;

const queryHome = encodeURIComponent('*[_type == "multimediaHome"] | order(orden asc){ _id, tipo, "imagenUrl": imagen.asset->url, "videoUrl": videoFile.asset->url }');
const urlSanityHome = `https://${PROJECT_ID}.api.sanity.io/${API_VERSION}/data/query/${DATASET}?query=${queryHome}`;

const queryBlog = encodeURIComponent('*[_type == "articuloBlog"] | order(fechaPublicacion desc){ _id, titulo, resumen, categoria, fechaPublicacion, "imagenUrl": imagenPortada.asset->url, contenido }');
const urlSanityBlog = `https://${PROJECT_ID}.api.sanity.io/${API_VERSION}/data/query/${DATASET}?query=${queryBlog}`;

// Variables globales
let indiceSlideActual = 0;
let articulosBlogCache = [];

// ==========================================
// 2. CONTROL DE NAVEGACIÓN (TABS) - GLOBAL
// ==========================================
// CONTROL DE NAVEGACIÓN ENTRE SECCIONES (HOME, MAPS, PHOTOS, BLOG)
function cambiarPestaña(idPestaña) {
    const targetId = idPestaña.toLowerCase();

    // 1. Ocultar de forma absoluta TODAS las secciones del DOM
    const secciones = document.querySelectorAll('section, .tab-content');
    secciones.forEach(sec => {
        sec.classList.remove('active');
        sec.classList.add('hidden');
        sec.style.setProperty('display', 'none', 'important'); // Cancela cualquier flex inline
    });

    // 2. Desactivar los botones del menú superior
    const botones = document.querySelectorAll('.tab-btn');
    botones.forEach(btn => btn.classList.remove('active'));

    // 3. Mostrar únicamente la sección seleccionada
    const seccionActiva = document.getElementById(targetId);
    if (seccionActiva) {
        seccionActiva.classList.remove('hidden');
        seccionActiva.classList.add('active');

        if (targetId === 'home') {
            seccionActiva.style.setProperty('display', 'block', 'important');
        } else {
            seccionActiva.style.setProperty('display', 'block', 'important');
        }
    }

    // 4. Marcar botón activo
    const botonActivo = document.querySelector(`.tab-btn[onclick*="${idPestaña}"]`);
    if (botonActivo) botonActivo.classList.add('active');

    // Carga diferida según la pestaña seleccionada
    if (targetId === 'home') cargarMultimediaHomeSanity();
    if (targetId === 'photos') obtenerFotosDeSanity();
    if (targetId === 'maps') cargarMapasDesdeSanity();
    if (targetId === 'blog') cargarBlogDesdeSanity();
}
window.cambiarPestaña = cambiarPestaña;
// ==========================================
// 3. CARRUSEL MULTIMEDIA EN HOME (SANITY)
// ==========================================
async function cargarMultimediaHomeSanity() {
    const track = document.getElementById('carruselTrack');
    if (!track) return;
    
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
// 4. GALERÍA DE FOTOS PINTEREST (PHOTOS)
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
// 5. VISOR DE MAPAS CARTOGRÁFICOS (MAPS)
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
// 6. MÓDULO DEL BLOG (MOSAICO Y LECTOR)
// ==========================================
// Carga del Blog desde Sanity.io
async function cargarBlogDesdeSanity() {
    const contenedor = document.getElementById('contenedor-blog');
    if (!contenedor) return;

    if (articulosBlogCache.length > 0) return;

    try {
        const respuesta = await fetch(urlSanityBlog);
        const datos = await respuesta.json();
        articulosBlogCache = datos.result || [];

        if (articulosBlogCache.length === 0) {
            contenedor.innerHTML = '<p>No hay artículos publicados en el blog por el momento.</p>';
            return;
        }

        renderizarGridBlog(articulosBlogCache, contenedor);
    } catch (error) {
        console.error("Error al cargar artículos del blog:", error);
        contenedor.innerHTML = '<p>Error al conectar con Sanity Blog.</p>';
    }
}

// Renderizado de las tarjetas estáticas dinámicas
function renderizarGridBlog(articulos, contenedor) {
    contenedor.innerHTML = articulos.map((art, index) => {
        const fecha = art.fechaPublicacion 
            ? new Date(art.fechaPublicacion).toDateString()
            : '';

        return `
            <article class="tarjeta-blog" onclick="abrirLectorArticulo(${index})" style="display: flex; flex-direction: column; align-items: flex-start; text-align: left; width: 100%; min-width: 0; cursor: pointer; box-sizing: border-box;">
                <h3 class="tarjeta-blog-titulo" style="font-size: 1.35rem; font-weight: 700; color: #111111; margin: 0 0 1rem 0; line-height: 1.25; font-family: sans-serif;">
                    ${art.titulo}
                </h3>
                <div class="tarjeta-blog-header" style="width: 100%; height: 175px; min-height: 175px; max-height: 175px; overflow: hidden; margin-bottom: 1rem; background-color: #e2e8f0;">
                    ${art.imagenUrl 
                        ? `<img src="${art.imagenUrl}?w=600&h=350&fit=crop&auto=format" alt="${art.titulo}" class="tarjeta-blog-img" style="width: 100%; height: 100%; object-fit: cover; object-position: center; display: block;">` 
                        : ''}
                </div>
                <div class="tarjeta-blog-body" style="display: flex; flex-direction: column; align-items: flex-start; width: 100%;">
                    <p class="tarjeta-blog-resumen" style="font-size: 0.9rem; color: #333333; line-height: 1.5; margin: 0 0 0.85rem 0; font-family: sans-serif;">
                        ${art.resumen || ''}
                    </p>
                    <span class="tarjeta-blog-fecha" style="font-size: 0.8rem; color: #888888; font-family: sans-serif; margin-bottom: 1rem;">
                        ${fecha}
                    </span>
                    <button class="btn-read-more" type="button"
                        onclick="abrirLectorArticulo(${index}); event.stopPropagation();"
                        onmouseover="this.style.backgroundColor='#2563eb'"
                        onmouseout="this.style.backgroundColor='#0f172a'"
                        style="background-color: #0f172a; color: #ffffff; border: none; padding: 0.6rem 1.35rem; font-size: 0.825rem; font-weight: 600; letter-spacing: 0.03em; border-radius: 4px; cursor: pointer; font-family: sans-serif; transition: background-color 0.2s ease;">
                        Read More
                    </button>
                </div>
            </article>
        `;
    }).join('');
}

// Apertura del modal flotante al pulsar Read More
// Apertura del modal flotante al pulsar Read More
function abrirLectorArticulo(index) {
    const articulo = articulosBlogCache[index];
    if (!articulo) {
        console.error("No se encontró el artículo en el índice:", index);
        return;
    }

    const modal = document.getElementById('modal-lector');
    const tituloEl = document.getElementById('lector-titulo');
    const fechaEl = document.getElementById('lector-fecha');
    const imagenEl = document.getElementById('lector-imagen');
    const cuerpoEl = document.getElementById('lector-cuerpo');

    if (tituloEl) tituloEl.textContent = articulo.titulo || '';
    if (fechaEl) {
        fechaEl.textContent = articulo.fechaPublicacion 
            ? new Date(articulo.fechaPublicacion).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })
            : '';
    }
    
    if (imagenEl) {
        if (articulo.imagenUrl) {
            imagenEl.src = articulo.imagenUrl;
            imagenEl.style.display = 'block';
        } else {
            imagenEl.style.display = 'none';
        }
    }

    // Procesa bloques de texto enriquecido (Portable Text) de Sanity a párrafos HTML
    if (cuerpoEl) {
        if (Array.isArray(articulo.contenido)) {
            cuerpoEl.innerHTML = articulo.contenido
                .filter(block => block._type === 'block' && block.children)
                .map(block => `<p>${block.children.map(child => child.text).join('')}</p>`)
                .join('');
        } else {
            cuerpoEl.innerHTML = `<p>${articulo.resumen || ''}</p>`;
        }
    }

    if (modal) {
        modal.classList.add('activo');
        // Fuerza la visibilidad del overlay por encima de cualquier regla CSS
        modal.style.setProperty('display', 'flex', 'important');
        modal.style.setProperty('opacity', '1', 'important');
        modal.style.setProperty('pointer-events', 'auto', 'important');
        modal.style.setProperty('z-index', '99999', 'important');
        document.body.style.overflow = 'hidden';
    }
}
window.abrirLectorArticulo = abrirLectorArticulo;

function cerrarModalLector() {
    const modal = document.getElementById('modal-lector');
    if (modal) {
        modal.classList.remove('activo');
        modal.style.setProperty('opacity', '0', 'important');
        modal.style.setProperty('pointer-events', 'none', 'important');
        setTimeout(() => {
            if (!modal.classList.contains('activo')) {
                modal.style.setProperty('display', 'none', 'important');
            }
        }, 300);
        document.body.style.overflow = '';
    }
}
window.cerrarModalLector = cerrarModalLector;

// ==========================================
// 7. INICIALIZADOR Y EVENTOS DE CARGA (DOM)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // 1. Cargar Home al iniciar
    cargarMultimediaHomeSanity();

    // 2. Lightbox de Fotos
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

    // 3. Modal Lector del Blog
    const btnCerrarLector = document.getElementById('btn-cerrar-lector');
    const btnTop = document.getElementById('btn-top-lector');
    const scrollContainer = document.getElementById('modal-lector-scroll');

    if (btnCerrarLector) {
        btnCerrarLector.addEventListener('click', cerrarModalLector);
    }

    if (scrollContainer && btnTop) {
        scrollContainer.addEventListener('scroll', () => {
            if (scrollContainer.scrollTop > 300) {
                btnTop.classList.add('visible');
            } else {
                btnTop.classList.remove('visible');
            }
        });

        btnTop.addEventListener('click', () => {
            scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
});