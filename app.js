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
/* ==========================================================================
   FILSATION - VISOR CARTOGRÁFICO CIUDAD UNIVERSITARIA (NEON: CU_UCM)
   ========================================================================== */

const API_URL = 'https://filsation-api.onrender.com';

document.addEventListener('DOMContentLoaded', () => {
  const mapContainer = document.getElementById('ucm-map');
  if (!mapContainer) return;

  // 1. Inicializar Leaflet centrado en Ciudad Universitaria (Moncloa, Madrid)
  const map = L.map('ucm-map', {
    center: [40.4495, -3.7285],
    zoom: 15
  });

  // Capa base oscura (estética pantalla negra)
  // 1. En app.js, sustituye capaOscura por esta:
const capaOscura = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
  attribution: '&copy; Esri, HERE, Garmin, OpenStreetMap',
  maxZoom: 16
}).addTo(map);

  // Capa opcional: Ortofoto oficial de España (IGN PNOA)
  const capaOrtofoto = L.tileLayer.wms('https://www.ign.es/wms-inspire/pnoa-ma?', {
    layers: 'OI.OrthoimageCoverage',
    format: 'image/jpeg',
    transparent: false,
    attribution: '&copy; IGN España (PNOA)'
  });

  L.control.layers({
    'Mapa Oscuro Moncloa': capaOscura,
    'Ortofoto Satélite (PNOA)': capaOrtofoto
  }).addTo(map);

  // Estilos del polígono de Geografía e Historia (y futuras facultades)
  const estiloNormal = {
    color: '#2dd4bf',      // Borde turquesa neón
    weight: 2.5,
    fillColor: '#14b8a6',
    fillOpacity: 0.35
  };

  const estiloActivo = {
    color: '#fb923c',      // Borde naranja brillante al seleccionarlo
    weight: 3.5,
    fillColor: '#f97316',
    fillOpacity: 0.55
  };

  let poligonoSeleccionado = null;
  let capaGeoJSON = null;

  // 2. Cargar polígonos desde Neon (tabla facultades_ucm vía Render)
  async function cargarFacultadesUCM() {
    const listaContainer = document.getElementById('ancla-lista-mapas');

    try {
      const response = await fetch(`${API_URL}/api/facultades-ucm`);
      if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);

      const geojson = await response.json();

      // Mensaje inicial en el panel derecho
      listaContainer.innerHTML = `
        <div style="padding: 16px; font-size: 13px; color: #475569; line-height: 1.6;">
          <strong>Campus Moncloa · UCM</strong><br>
          Recintos activos: <strong>${geojson.features.length}</strong>.<br><br>
          Haz clic sobre el polígono de <strong>Facultad de Geografía e Historia</strong> en el visor oscuro para proyectar su ficha técnica y ver los mapas disponibles.
        </div>
      `;

      capaGeoJSON = L.geoJSON(geojson, {
        style: estiloNormal,
        onEachFeature: (feature, layer) => {
          const props = feature.properties || {};
          const titulo = props.nombre || `Recinto #${feature.id}`;

          // Etiqueta flotante al pasar el cursor por encima del polígono
          layer.bindTooltip(titulo, { sticky: true });

          layer.on('mouseover', () => {
            if (poligonoSeleccionado !== layer) {
              layer.setStyle({ fillOpacity: 0.55, weight: 3 });
            }
          });

          layer.on('mouseout', () => {
            if (poligonoSeleccionado !== layer) {
              capaGeoJSON.resetStyle(layer);
            }
          });

          // Al hacer CLICK en el polígono: centrar edificio y actualizar panel derecho
          layer.on('click', () => {
            if (poligonoSeleccionado) {
              capaGeoJSON.resetStyle(poligonoSeleccionado);
            }
            poligonoSeleccionado = layer;
            layer.setStyle(estiloActivo);

            map.fitBounds(layer.getBounds(), { padding: [50, 50], maxZoom: 18 });
            cargarDetalleYTienda(feature.id, props);
          });
        }
      }).addTo(map);

    } catch (error) {
      console.error('Error cargando facultades_ucm:', error);
      listaContainer.innerHTML = `
        <div class="cargando-estado" style="color: #dc2626; padding: 15px;">
          Error al conectar con <code>/api/facultades-ucm</code>. Revisa que Render haya terminado el despliegue.
        </div>
      `;
    }
  }

  // 3. Consultar la Ruta 2 (/api/facultades-ucm/:id) y pintar ficha + catálogo de mapas
  async function cargarDetalleYTienda(id, propsBasicos) {
    const cabecera = document.getElementById('sidebar-cabecera');
    const listaContainer = document.getElementById('ancla-lista-mapas');

    listaContainer.innerHTML = '<div class="cargando-estado">Calculando métricas espaciales...</div>';

    try {
      const res = await fetch(`${API_URL}/api/facultades-ucm/${id}`);
      const datos = res.ok ? await res.json() : propsBasicos;

      // Actualizar cabecera del panel derecho
      if (cabecera) {
        cabecera.innerHTML = `
          <h3>${datos.nombre || 'Facultad UCM'}</h3>
          <p>Código: <strong>${datos.codigo_edificio || 'N/D'}</strong> · Campus ${datos.campus || 'Moncloa'}</p>
        `;
      }

      // Catálogo de mapas en venta para este recinto
      const catalogoMapas = [
        {
          sku: `${datos.codigo_edificio || 'UCM'}-GIS`,
          titulo: 'Pack Cartográfico Base (GIS & CAD)',
          descripcion: 'Huella arquitectónica georreferenciada, parcelario, curvas de nivel y red viaria perimetral en ETRS89 UTM 30N.',
          formatos: '.gpkg · .shp · .dxf · .geojson',
          precio: '12.00 €'
        },
        {
          sku: `${datos.codigo_edificio || 'UCM'}-MOV`,
          titulo: 'Mapa de Movilidad Suave y Accesibilidad',
          descripcion: 'Isócronas peatonales (5-10 min) desde Metro Ciudad Universitaria, paradas EMT, BiciMAD y pendientes de aceras.',
          formatos: '.pdf (A3 Alta Res) · .geojson',
          precio: '18.00 €'
        },
        {
          sku: `${datos.codigo_edificio || 'UCM'}-3D`,
          titulo: 'Gemelo Digital 3D Exterior (Fotogrametría)',
          descripcion: 'Modelo tridimensional texturizado de alta resolución listo para Blender, QGIS y ArcGIS Pro.',
          formatos: '.glb · .obj · .las',
          precio: '45.00 €'
        },
        {
          sku: `${datos.codigo_edificio || 'UCM'}-ART`,
          titulo: 'Lámina Cartográfica Editorial (Print-Ready)',
          descripcion: 'Plano arquitectónico minimalista del edificio y su entorno ajardinado listo para impresión en gran formato.',
          formatos: '.pdf · .svg',
          precio: '15.00 €'
        }
      ];

      let html = `
        <div style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; background: #f8fafc; font-size: 12.5px;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <div><span style="color:#64748b;">Superficie GIS:</span><br><strong>${datos.superficie_m2 ? Number(datos.superficie_m2).toLocaleString('es-ES') + ' m²' : 'N/D'}</strong></div>
            <div><span style="color:#64748b;">Categoría:</span><br><strong>${datos.categoria || 'Moncloa'}</strong></div>
          </div>
        </div>
        <div style="padding: 14px 16px;">
          <h4 style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #0f172a; margin-bottom: 12px;">
            Diversidad de Mapas en Venta
          </h4>
      `;

      catalogoMapas.forEach(item => {
        html += `
          <div style="border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; margin-bottom: 10px; background: #ffffff;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
              <strong style="font-size: 13.5px; color: #0f172a;">${item.titulo}</strong>
              <span style="font-weight: 700; color: #0d9488; white-space: nowrap;">${item.precio}</span>
            </div>
            <p style="font-size: 12px; color: #475569; margin: 6px 0; line-height: 1.45;">${item.descripcion}</p>
            <div style="font-size: 11px; font-family: monospace; color: #0f766e; margin-bottom: 10px;">
              ${item.formatos}
            </div>
            <button onclick="alert('Has seleccionado: ${item.titulo} (${item.sku}) - ${item.precio}')" 
                    style="width: 100%; padding: 8px; background: #0f172a; color: #ffffff; border: none; border-radius: 4px; font-size: 12px; font-weight: 600; cursor: pointer;">
              Adquirir mapa (${item.precio})
            </button>
          </div>
        `;
      });

      html += `</div>`;
      listaContainer.innerHTML = html;

    } catch (error) {
      console.error('Error al cargar detalle de la facultad:', error);
    }
  }

  // 4. Recalcular tamaño del mapa cuando cambias de pestaña (HOME -> MAPS)
  document.querySelectorAll('a, button, [data-tab]').forEach(el => {
    el.addEventListener('click', () => {
      setTimeout(() => {
        map.invalidateSize();
      }, 150);
    });
  });

  // Arrancar carga inicial
  cargarFacultadesUCM();
});

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
    window.articulosBlogCache = articulos; // Asegura disponibilidad global para el clic

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

function abrirLectorArticulo(index) {
    const lista = window.articulosBlogCache || articulosBlogCache || [];
    const articulo = lista[index];
    if (!articulo) return;

    const modal = document.getElementById('modal-lector');
    const tituloEl = document.getElementById('lector-titulo');
    const fechaEl = document.getElementById('lector-fecha');
    const imagenEl = document.getElementById('lector-imagen');
    const cuerpoEl = document.getElementById('lector-cuerpo');
    const scrollContenedor = document.getElementById('modal-lector-scroll');

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
        // Mueve el modal a la raíz del body para evitar recortes de contenedores padre en laptop
        document.body.appendChild(modal);
        
        modal.classList.add('activo');
        modal.style.cssText = `
            display: flex !important;
            justify-content: center !important;
            align-items: flex-start !important;
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            overflow-y: auto !important;
            background: rgba(15, 23, 42, 0.78) !important;
            backdrop-filter: blur(6px) !important;
            opacity: 1 !important;
            visibility: visible !important;
            pointer-events: auto !important;
            z-index: 2147483647 !important;
        `;
        modal.scrollTop = 0;
    }
}
window.abrirLectorArticulo = abrirLectorArticulo;

function cerrarModalLector() {
    const modal = document.getElementById('modal-lector');
    if (modal) {
        modal.classList.remove('activo');
        modal.style.setProperty('display', 'none', 'important');
        modal.style.setProperty('opacity', '0', 'important');
        modal.style.setProperty('pointer-events', 'none', 'important');
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