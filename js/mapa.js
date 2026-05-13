let dataLoaded = false;
let datosLotes = {}; 
const googleSheetURL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRppioD8iuH-_EW-sIZM14nmFsOO-CJ3EULJ9jrRL01k_na1mDpq86ev0V4MMTDznqqslTHMopie2h8/pub?gid=0&single=true&output=tsv';
let capaLotes;

const formatearMoneda = (valor) => {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(valor);
};

var map = L.map('map', {
    crs: L.CRS.Simple,
    minZoom: -1,
    maxZoom: 3,
    attributionControl: false,
    zoomControl: false
});

const estiloBase = { 
    color: "#002D0E", 
    weight: 1, 
    fillColor: "transparent", 
    fillOpacity: 0,
    fill: true
};

const loaderTimeline = gsap.timeline({ repeat: -1 });

// 2. Lógica del Spinner (Llenado vertical)
loaderTimeline.to("#fill-container", {
    height: "100%", 
    duration: 2.5,
    ease: "power1.inOut",
    onComplete: () => {
        if (dataLoaded) {
            finalizarLoader();
        }
    }
}).to("#fill-container", {
    height: "0%", 
    duration: 2,
    ease: "power1.inOut"
});

function finalizarLoader() {
    loaderTimeline.pause();
    
    // Forzamos el llenado total antes de ocultar
    gsap.to("#fill-container", { height: "100%", duration: 0.3 });

    gsap.to("#loader", {
        duration: 0.8,
        opacity: 0,
        ease: "power2.inOut",
        onComplete: () => {
            document.getElementById("loader").style.display = "none";
        }
    });
}

// Función para limpiar precios y convertirlos a números
function limpiarNumero(valor) {
    if (!valor || valor === "") return 0;
    
    // Convertimos a string por seguridad
    let s = valor.toString().trim();
    
    // 1. Eliminamos los puntos que se usan como separadores de miles
    // Ejemplo: "1.177.722,00" -> "1177722,00"
    s = s.replace(/\./g, "");
    
    // 2. Cambiamos la coma decimal por un punto decimal
    // Ejemplo: "1177722,00" -> "1177722.00"
    s = s.replace(/,/g, ".");
    
    // 3. Convertimos a número flotante
    const num = parseFloat(s);
    
    return isNaN(num) ? 0 : num;
}

function aplicarFiltros() {
    const maxArea = parseFloat(document.getElementById('range-area').value);
    const maxPrecio = parseFloat(document.getElementById('range-precio').value);

    // Actualizar etiquetas de texto en el menú
    document.getElementById('val-area').innerText = Math.round(maxArea);
    document.getElementById('val-precio-container').innerText = formatearMoneda(maxPrecio);

    capaLotes.eachLayer(layer => {
        const id = (layer.feature.properties.EntityHandle || "").toString().trim();
        const info = datosLotes[id];

        if (info) {
            const precioNum = limpiarNumero(info.precio);
            const superficieNum = limpiarNumero(info.superficie);

            // Lógica de filtrado
            const cumpleFiltro = superficieNum <= maxArea && precioNum <= maxPrecio;

            if (cumpleFiltro) {
                layer.setStyle(obtenerEstilo(layer.feature));
                // Forzamos la interacción solo si cumple el filtro
                layer.options.interactive = true;
                if(layer.getElement()) layer.getElement().style.pointerEvents = 'auto';
            } else {
                layer.setStyle(estiloBase);
                layer.options.interactive = false;
                if(layer.getElement()) layer.getElement().style.pointerEvents = 'none';
            }
        }
    });
}

// Eventos para los sliders (Escuchan el cambio en tiempo real)
document.getElementById('range-area').addEventListener('input', aplicarFiltros);
document.getElementById('range-precio').addEventListener('input', aplicarFiltros);

// === 1. LÓGICA DE INTERFAZ (OVERLAY) ===
function abrirOverlay(id, info) {
    const overlay = document.getElementById('info-overlay');
    const contenedorInfo = document.getElementById('detalles-lote');
    const imgLote = document.getElementById('img-lote');

    if (window.location.hash !== `#${id}`) {
        history.pushState(null, null, `#${id}`);
    }

    imgLote.src = `lotes/${id}.png`;
    imgLote.onerror = function() { this.src = 'lotes/placeholder.png'; };

    let contenido = `
        <h2 style="margin-bottom:10px;">Lote ${id}</h2>
        <div style="font-family: 'Barlow', sans-serif;">
            <img src="img/${info.tipo.toLowerCase()}.webp" alt= "icono de ${info.tipo}">
            <p><b>Superficie:</b> ${info.superficie} m²</p>
            <p><b>Precio:</b> $ ${info.precio} MXN</p>
            <p><b>Estatus:</b> ${info.estatus}</p>
        </div>
    `;

    contenedorInfo.innerHTML = contenido;
    overlay.style.display = 'block';
    gsap.to(overlay, {
        duration: 0.6,
        opacity: 1,
        y: 0,
        ease: "power2.out",
        onStart: () => {
            overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    });
}

function cerrarOverlay(conAnimacion = true) {
    const overlay = document.getElementById('info-overlay');
    if (!overlay || !overlay.classList.contains('active')) return;

    history.replaceState(null, null, window.location.pathname);

    const ejecutarCierre = () => {
        overlay.style.display = 'none';
        overlay.classList.remove('active');
        document.body.style.overflow = 'auto';
    };

    if (conAnimacion) {
        gsap.to(overlay, { duration: 0.4, opacity: 0, y: 20, ease: "power2.in", onComplete: ejecutarCierre });
    } else {
        ejecutarCierre();
    }
}

function abrirOverlayLago() {
    const overlay = document.getElementById('info-overlay');
    const contenedorInfo = document.getElementById('detalles-lote');
    const imgLote = document.getElementById('img-lote');

    imgLote.src = 'img/laguna-yaxkaan.webp'; 
    imgLote.onerror = function() { this.src = 'lotes/placeholder.png'; };

    let contenido = `
        <h2 style="margin-bottom:10px;">Lago Principal</h2>
        <div style="font-family: 'Barlow', sans-serif;">
            <p>Este cuerpo de agua es el corazón de <b>Yaxkaan</b>, diseñado no solo como un elemento estético, sino como un regulador térmico natural para el desarrollo.</p>
            <p><b>Amenidades:</b> Zona de senderismo, áreas de descanso y observación de aves locales.</p>
        </div>
    `;

    contenedorInfo.innerHTML = contenido;
    overlay.style.display = 'block';
    
    gsap.to(overlay, {
        duration: 0.6,
        opacity: 1,
        y: 0,
        ease: "power2.out",
        onStart: () => {
            overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    });
}

// === 2. PROCESAMIENTO DE DATOS ===
function procesarTSV(texto) {
    const lineas = texto.split(/\r?\n/);
    const diccionario = {};
    if (lineas.length < 1) return diccionario;
    
    const encabezados = lineas[0].split('\t').map(h => h.trim().toLowerCase());

    for (let i = 1; i < lineas.length; i++) {
        const celdas = lineas[i].split('\t');
        if (celdas.length < 2) continue;
        const fila = {};
        encabezados.forEach((h, index) => { fila[h] = celdas[index] ? celdas[index].trim() : ""; });
        // Usamos la columna 'lote' como ID
        if (fila.lote) diccionario[fila.lote.toString()] = fila;
    }
    return diccionario;
}

function detectarHash() {
    const hash = window.location.hash.substring(1); 
    const info = datosLotes[hash];
    if (hash && info) {
        const est = info.estatus.toLowerCase();
        if (est !== 'vendido' && est !== 'en construcción') {
            abrirOverlay(hash, info);
        }
    }
}

window.addEventListener('hashchange', detectarHash);

// === 3. LÓGICA DE MAPA Y ESTILOS ===
function obtenerEstilo(feature) {
    // 1. Detectar si es un Camellón o Área Verde desde el GeoJSON
    const layer = (feature.properties.Layer || "").toString().toUpperCase();
    const entity = (feature.properties.EntityHandle || "").toString().trim().toLowerCase();

    if (layer === 'CAMELLONES') {
        return { 
            color: "#67823A", 
            weight: 1, 
            fillColor: "url(#textura-verde)", // Referencia al ID del patrón SVG
            fillOpacity: 1, // La opacidad ya la controlamos dentro del SVG
            interactive: false // Evita que el cursor cambie a "pointer" y bloquea clics
        };
    }

    if (layer === 'LAGO') { 
        return { 
            color: "#4682B4",
            weight: 1, 
            fillColor: "url(#textura-lago)", 
            fillOpacity: 1, 
            interactive: true 
        };
    }

    if (layer === 'MACROLOTES') { 
        return { 
            color: "#7A6855",
            weight: 1, 
            dashArray: "6, 6",
            fillColor: "url(#textura-macrolote)", // ID del patrón SVG
            fillOpacity: 1, 
            interactive: false // Sin hover ni clics
        };
    }

    // 2. Lógica normal para los Lotes (Terrenos)
    const id = (feature.properties.EntityHandle || "").toString().trim();
    const info = datosLotes[id];
    
    if (!info) return estiloBase;

    const est = info.estatus.toLowerCase();
    switch (est) {
        case 'vendido':
            return { color: "#002D0E", weight: 1.5, fillColor: "#808080", fillOpacity: 0.7 };
        case 'apartado':
            return { color: "#886711", weight: 1.5, fillColor: "#D69A2D", fillOpacity: 0.7 };
        case 'disponible':
            return { color: "#002D0E", weight: 1.5, fillColor: "#418d4d", fillOpacity: 0.7 };
        default:
            return estiloBase;
    }
}

// === 4. CARGA DE DATOS ===
fetch(googleSheetURL)
    .then(res => res.text())
    .then(tsv => {
        datosLotes = procesarTSV(tsv);
        return fetch('mapa.geojson');
    })
    .then(res => res.json())
    .then(geojsonData => {
        capaLotes = L.geoJSON(geojsonData, {
            style: obtenerEstilo,
            onEachFeature: function(feature, layer) {
                const id = (feature.properties.EntityHandle || "").toString().trim();
                const info = datosLotes[id];

                if (info) {
            layer.bindTooltip(`L-${id}`, {
                permanent: true,
                direction: 'center',
                className: 'lote-label'
            });
        } else if (feature.properties.Layer === 'MACROLOTES') {
            layer.bindTooltip(`Macro Lote`, {
                permanent: true,
                direction: 'center',
                className: 'lote-label'
            });
        } else if (feature.properties.Layer === 'CAMELLONES') {
            layer.bindTooltip( feature.properties.EntityHandle, {
                permanent: true,
                direction: 'center',
                className: 'lote-label'
            });
        } else if (feature.properties.Layer === 'LAGO') {
            layer.bindTooltip( feature.properties.EntityHandle, {
                permanent: true,
                direction: 'center',
                className: 'lote-label'
            });
        }
                
                layer.on('click', () => {
    const propLayer = (feature.properties.Layer || "").toString().toUpperCase();
    const propEntity = (feature.properties.EntityHandle || "").toString().trim().toLowerCase();

    if (propLayer === 'LAGO' || propEntity === 'lago-principal') {
        abrirOverlayLago();
    } 
    
    else if (layer.options.interactive !== false && info) {
        const est = info.estatus.toLowerCase();
        if (est === 'disponible' || est === 'apartado') {
            abrirOverlay(id, info);
        }
    }
});

                layer.on('mouseover', function() {
                    if (this.options.interactive !== false) {
                        this.setStyle({ fillOpacity: 0.9, weight: 3 });
                    }
                });

                layer.on('mouseout', function() {
                    if (this.options.interactive !== false) {
                        this.setStyle(obtenerEstilo(feature));
                    }
                });
            }
        }).addTo(map);

  map.on('zoomend', function() {
    const currentZoom = map.getZoom();
    const labels = document.querySelectorAll('.lote-label');
    
    const threshold = 1; // Zoom donde aparecen
    const baseSize = 10;    // Tamaño inicial más pequeño
    const factor = 5;      // Crecimiento más suave
    const maxSize = 20;   

    // Cálculo con limitador (Math.min)
    let newSize = Math.min(maxSize, baseSize + (currentZoom - threshold) * factor);
    
    labels.forEach(l => {
        if (currentZoom >= threshold) {
            l.style.display = 'block';
            l.style.fontSize = newSize + 'px';
        } else {
            l.style.display = 'none';
        }
    });
});


 // --- Configuración de Sliders con Margen del 10% ---
const listaLotes = Object.values(datosLotes);
const precios = listaLotes.map(d => limpiarNumero(d.precio)).filter(n => n > 0);
const superficies = listaLotes.map(d => limpiarNumero(d.superficie)).filter(n => n > 0);

if (precios.length > 0 && superficies.length > 0) {
    // Calculamos máximos y mínimos con un margen de holgura (buffer) del 10%
    const realMaxP = Math.max(...precios);
    const realMinP = Math.min(...precios);
    const realMaxS = Math.max(...superficies);
    const realMinS = Math.min(...superficies);

    // Margen del 10%
    const maxP = Math.ceil(realMaxP * 1.1);
    const minP = Math.floor(realMinP * 0.9);
    const maxS = Math.ceil(realMaxS * 1.1);
    const minS = Math.floor(realMinS * 0.9);

    const rPrecio = document.getElementById('range-precio');
    const rArea = document.getElementById('range-area');

    // Configurar Slider de Precio al máximo extendido
    rPrecio.min = minP;
    rPrecio.max = maxP;
    rPrecio.value = maxP; // Inicia en el 110% del valor más alto
    rPrecio.step = 10;

    // Configurar Slider de Área al máximo extendido
    rArea.min = minS;
    rArea.max = maxS;
    rArea.value = maxS; // Inicia en el 110% del valor más alto
    rArea.step = 1;

    // Actualizar etiquetas visuales con el valor actual del slider (el máximo)
    document.getElementById('val-precio-container').innerText = formatearMoneda(maxP);
    document.getElementById('val-area').innerText = maxS;
    
    // Forzamos la ejecución del filtro para que todos los lotes (incluyendo el 21) 
    // se activen inmediatamente
    aplicarFiltros();
    // --- Lógica de Filtros para Móvil ---
const fab = document.getElementById('filter-fab');
const backdrop = document.getElementById('filter-backdrop');
const filterContainer = document.getElementById('filter-container');

if (fab) {
    fab.addEventListener('click', () => {
        // Mostrar backdrop
        gsap.to(backdrop, { 
            duration: 0.3, 
            opacity: 1, 
            pointerEvents: 'auto' 
        });
        
        // Subir contenedor
        gsap.to(filterContainer, { 
            duration: 0.6, 
            y: 0, 
            ease: "power2.out" 
        });
    });

    // Cerrar al presionar el backdrop (fuera del contenedor)
    backdrop.addEventListener('click', () => {
        gsap.to(backdrop, { 
            duration: 0.3, 
            opacity: 0, 
            pointerEvents: 'none' 
        });
        
        gsap.to(filterContainer, { 
            duration: 0.5, 
            y: '110%', 
            ease: "power2.in" 
        });
    });
}
}

    const bounds = capaLotes.getBounds();
    const boundsConMargen = bounds.pad(0.1);

    map.fitBounds(boundsConMargen);
    map.setMaxBounds(boundsConMargen);
        detectarHash();
    
    dataLoaded = true;    
    })
    .catch(err => {
        console.error("Error:", err);
        document.querySelector("#loader p").innerText = "Error al conectar con los datos.";
    });
