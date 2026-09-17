<?php
/**
 * Extractor de contenido de WordPress para la migración a Astro.
 *
 * QUÉ HACE
 *   Recorre todas las páginas, en TODOS los idiomas, y exporta a un JSON:
 *   contenido, datos de Elementor, SEO de Rank Math, menús, medios, grupos de
 *   traducción de WPML, el kit global de Elementor (colores y tipografías de
 *   marca) y la configuración de los sliders de Slider Revolution.
 *
 * DÓNDE VA
 *   En la RAÍZ de WordPress, que en este sitio es el subdirectorio /zero/,
 *   junto a wp-load.php. Es decir: /zero/wp-extract.php
 *
 * CÓMO SE USA
 *   1. Subirlo a /zero/wp-extract.php
 *   2. Estando logueado como administrador, abrir en el navegador:
 *        https://e-nation.org/zero/wp-extract.php
 *      Eso muestra SOLO MÉTRICAS (nada de contenido).
 *   3. Descargar el JSON con:
 *        https://e-nation.org/zero/wp-extract.php?download=1
 *      El navegador lo guarda como wp-export.json.
 *   4. BORRAR EL ARCHIVO DEL SERVIDOR. Es de un solo uso.
 *
 * POR QUÉ NO IMPRIME EL CONTENIDO
 *   Entre las páginas están la política de privacidad y los términos y
 *   condiciones. Ese texto no debe pasar por el chat, ni citado, ni a un
 *   subagente: dispara falsos positivos de filtros de seguridad. Por eso el
 *   script en pantalla solo da métricas, y el contenido va en un archivo que se
 *   procesa por script.
 *
 * SEGURIDAD
 *   Exige `manage_options`. No escribe nada fuera de su propio directorio. No
 *   modifica la base de datos: solo lee.
 */

// Se captura cualquier salida que emitan WordPress o los plugins (avisos,
// notices) para que no corrompa las cabeceras HTTP ni el JSON de la descarga.
// Sin esto, un simple aviso de un plugin rompe la descarga del archivo.
ob_start();

// El export incluye `_elementor_data` de todas las paginas, que puede ser de
// varios MB, y recorre el arbol de widgets de cada una. Con los limites por
// defecto de algunos hostings (128M y 30s) esto se queda corto y el script muere
// a medias, que es peor que fallar rapido.
@ini_set('memory_limit', '512M');
@set_time_limit(300);

require_once __DIR__ . '/wp-load.php';

/**
 * Cierra el buffer de salida solo si hay uno activo. Sin la comprobacion,
 * ob_end_clean() emite un aviso "no buffer to delete" que se imprimiria ANTES
 * de nuestras cabeceras y las invalidaria.
 */
function en_cerrar_buffer() {
    while (ob_get_level() > 0) {
        @ob_end_clean();
    }
}

if (!current_user_can('manage_options')) {
    en_cerrar_buffer();
    status_header(403);
    die('Acceso denegado: se requiere administrador.');
}

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

/** ¿Está WPML activo? */
function en_wpml_activo() {
    return function_exists('icl_get_languages') && has_filter('wpml_object_id');
}

/** Idiomas configurados, o un único idioma "sin WPML". */
function en_idiomas() {
    if (!en_wpml_activo()) {
        return [['code' => 'sin-wpml', 'locale' => get_locale(), 'name' => 'Sin WPML']];
    }
    $langs = icl_get_languages('skip_missing=0&orderby=code');
    if (empty($langs) || !is_array($langs)) {
        return [['code' => 'desconocido', 'locale' => get_locale(), 'name' => 'Desconocido']];
    }
    $out = [];
    foreach ($langs as $l) {
        $out[] = [
            'code'   => isset($l['code']) ? $l['code'] : '',
            'locale' => isset($l['default_locale']) ? $l['default_locale'] : '',
            'name'   => isset($l['translated_name']) ? $l['translated_name'] : (isset($l['native_name']) ? $l['native_name'] : ''),
            'url'    => isset($l['url']) ? $l['url'] : '',
            'es_predeterminado' => !empty($l['is_default']),
        ];
    }
    return $out;
}

/** Idioma de un post concreto, con el detalle de WPML si está. */
function en_idioma_de($post_id, $post_type = 'page') {
    if (!en_wpml_activo()) return null;
    $det = apply_filters('wpml_element_language_details', null, [
        'element_id'   => $post_id,
        'element_type' => 'post_' . $post_type,
    ]);
    if (empty($det)) return null;
    return [
        'code'   => isset($det->language_code) ? $det->language_code : null,
        'trid'   => isset($det->trid) ? (int) $det->trid : null,
        'fuente' => isset($det->source_language_code) ? $det->source_language_code : null,
    ];
}

/** Traducciones de un post: idioma => id. */
function en_traducciones_de($post_id, $post_type = 'page') {
    if (!en_wpml_activo()) return [];
    $det = apply_filters('wpml_element_language_details', null, [
        'element_id'   => $post_id,
        'element_type' => 'post_' . $post_type,
    ]);
    if (empty($det) || empty($det->trid)) return [];
    $out = [];
    foreach (en_idiomas() as $l) {
        $code = $l['code'];
        if ($code === 'sin-wpml' || $code === 'desconocido') continue;
        $tid = apply_filters('wpml_object_id', $post_id, $post_type, false, $code);
        if ($tid) {
            $out[$code] = [
                'id'   => (int) $tid,
                'url'  => get_permalink($tid),
                'slug' => get_post_field('post_name', $tid),
                'title'=> get_the_title($tid),
            ];
        }
    }
    return $out;
}

/** Selector CSS aproximado del widget, para orientar la reconstrucción. */
function en_selector_hint($tipo) {
    $mapa = [
        'heading'        => 'h1, h2, h3, h4, h5, h6, .elementor-heading-title',
        'button'         => 'button, a.elementor-button, .elementor-button',
        'image'          => 'img, .elementor-image',
        'image-box'      => '.elementor-image-box, figure',
        'icon-box'       => '.elementor-icon-box',
        'icon'           => '.elementor-icon, i',
        'text-editor'    => '.elementor-text-editor, .elementor-widget-text-editor',
        'video'          => 'video, iframe, .elementor-video',
        'form'           => 'form, .elementor-form',
        'spacer'         => '.elementor-spacer',
        'divider'        => '.elementor-divider',
        'call-to-action' => '.elementor-cta',
        'counter'        => '.elementor-counter',
        'progress'       => '.elementor-progress-bar',
        'testimonial'    => '.elementor-testimonial',
        'toggle'         => '.elementor-toggle',
        'accordion'      => '.elementor-accordion',
        'tabs'           => '.elementor-tabs',
        'slider'         => '.elementor-slides',
        'carousel'       => '.elementor-carousel',
        'google_maps'    => '.elementor-google-map, iframe[src*="google.com/maps"]',
        'html'           => '.elementor-custom-html',
        'shortcode'      => '.elementor-shortcode',
    ];
    return isset($mapa[$tipo]) ? $mapa[$tipo] : '[data-element_type="widget"]';
}

/** Recorre los widgets de Elementor acumulando animaciones y un inventario. */
function en_recorrer_widgets($elementos, $slug, &$animaciones, &$inventario, $profundidad = 0) {
    if (!is_array($elementos)) return;
    foreach ($elementos as $i => $el) {
        if (!is_array($el)) continue;
        $tipo      = isset($el['widgetType']) ? $el['widgetType'] : (isset($el['elType']) ? $el['elType'] : 'desconocido');
        $id        = isset($el['id']) ? $el['id'] : 'sin-id';
        $settings  = isset($el['settings']) && is_array($el['settings']) ? $el['settings'] : [];

        // Inventario de widgets: sirve para saber de antemano qué hay que reconstruir.
        if (isset($el['elType']) && $el['elType'] === 'widget') {
            if (!isset($inventario[$tipo])) $inventario[$tipo] = 0;
            $inventario[$tipo]++;
        }

        // Animaciones de Elementor
        if (!empty($settings['_animation'])) {
            $animaciones[] = [
                'pagina'        => $slug,
                'widget_id'     => $id,
                'widget_type'   => $tipo,
                'animacion'     => $settings['_animation'],
                'retardo'       => isset($settings['_animation_delay']) ? (int) $settings['_animation_delay'] : 0,
                'duracion'      => isset($settings['_animation_duration']) ? $settings['_animation_duration'] : 'normal',
                'selector_hint' => en_selector_hint($tipo),
            ];
        }

        // Efectos de movimiento (parallax por transform de Elementor)
        if (!empty($settings['motion_fx_motion_fx_scrolling']) && $settings['motion_fx_motion_fx_scrolling'] === 'yes') {
            $animaciones[] = [
                'pagina'        => $slug,
                'widget_id'     => $id,
                'widget_type'   => $tipo,
                'animacion'     => 'motion_fx_scrolling',
                'retardo'       => 0,
                'duracion'      => 'n/a',
                'selector_hint' => en_selector_hint($tipo),
                'detalle_motion'=> [
                    'direccion' => isset($settings['motion_fx_translateY_direction']) ? $settings['motion_fx_translateY_direction'] : null,
                    'velocidad' => isset($settings['motion_fx_translateY_speed']) ? $settings['motion_fx_translateY_speed'] : null,
                    'efecto'    => isset($settings['motion_fx_translateY_effect']) ? $settings['motion_fx_translateY_effect'] : null,
                ],
            ];
        }

        // Parallax de fondo, que es la otra familia de efecto
        if (!empty($settings['background_background']) && $settings['background_background'] === 'classic') {
            $adj = isset($settings['background_attachment']) ? $settings['background_attachment'] : null;
            $img = isset($settings['background_image']['url']) ? $settings['background_image']['url'] : null;
            if ($adj || $img) {
                $animaciones[] = [
                    'pagina'         => $slug,
                    'widget_id'      => $id,
                    'widget_type'    => $tipo,
                    'animacion'      => 'background',
                    'retardo'        => 0,
                    'duracion'       => 'n/a',
                    'selector_hint'  => en_selector_hint($tipo),
                    'detalle_fondo'  => [
                        'attachment' => $adj,
                        'posicion'   => isset($settings['background_position']) ? $settings['background_position'] : null,
                        'tamano'     => isset($settings['background_size']) ? $settings['background_size'] : null,
                        'imagen'     => $img,
                        'repeat'     => isset($settings['background_repeat']) ? $settings['background_repeat'] : null,
                    ],
                ];
            }
        }

        if (isset($el['elements'])) {
            en_recorrer_widgets($el['elements'], $slug, $animaciones, $inventario, $profundidad + 1);
        }
    }
}

/** Imágenes referenciadas en un HTML o en un JSON serializado. */
function en_imagenes_de($texto) {
    $out = [];
    if (!is_string($texto) || $texto === '') return $out;
    if (preg_match_all('/<img[^>]+src=["\']([^"\']+)["\'][^>]*>/i', $texto, $m)) {
        foreach ($m[1] as $url) $out[$url] = true;
    }
    if (preg_match_all('/background-image:\s*url\(["\']?([^"\')\s]+)["\']?\)/i', $texto, $m2)) {
        foreach ($m2[1] as $url) $out[$url] = true;
    }
    // URLs de medios dentro del JSON de Elementor
    if (preg_match_all('#https?://[^"\']+/wp-content/uploads/[^"\']+\.(?:jpe?g|png|gif|webp|svg|avif)#i', $texto, $m3)) {
        foreach ($m3[0] as $url) $out[$url] = true;
    }
    $limpio = [];
    foreach (array_keys($out) as $url) {
        if (strpos($url, '/wp-includes/') !== false) continue;
        if (strpos($url, 'emoji') !== false) continue;
        if (strpos($url, 'data:image') === 0) continue;
        $limpio[] = $url;
    }
    return array_values(array_unique($limpio));
}

// ---------------------------------------------------------------------------
// Recolección
// ---------------------------------------------------------------------------

$export = [
    'meta' => [
        'sitio'            => get_site_url(),
        'inicio'           => home_url(),
        'nombre'           => get_bloginfo('name'),
        'descripcion'      => get_bloginfo('description'),
        'exportado_en'     => date('c'),
        'wp_version'       => get_bloginfo('version'),
        'tema'             => get_stylesheet(),
        'tema_padre'       => get_template(),
        'wpml'             => en_wpml_activo(),
        'subdirectorio_wp' => parse_url(get_site_url(), PHP_URL_PATH),
        'permisos_archivo' => 'de un solo uso: BORRAR del servidor tras descargar',
    ],
    'idiomas'        => en_idiomas(),
    'paginas'        => [],
    'menus'          => [],
    'medios'         => [],
    'animaciones'    => [],
    'inventario_widgets' => [],
    'kit_global_elementor' => null,
    'sliders_revolution'   => [],
];

// --- Kit global de Elementor: los tokens de marca reales -------------------
if (post_type_exists('elementor_library')) {
    $kits = get_posts([
        'post_type'      => 'elementor_library',
        'post_status'    => 'publish',
        'posts_per_page' => 1,
        'meta_key'       => '_elementor_template_type',
        'meta_value'     => 'kit',
        'suppress_filters' => true,
    ]);
    if (!empty($kits)) {
        $kit_id   = $kits[0]->ID;
        $ajustes  = get_post_meta($kit_id, '_elementor_page_settings', true);
        $export['kit_global_elementor'] = [
            'id'      => $kit_id,
            'ajustes' => is_array($ajustes) ? $ajustes : null,
        ];
    }
}

// --- Sliders de Slider Revolution -----------------------------------------
// La configuración vive en tablas propias del plugin. Sin esto habría que
// reconstruir los sliders solo desde el HTML renderizado, que es mucho peor.
//
// `revslider_css` son los PRESETS DE ESTILO ("Fashion-BigDisplay",
// "very_large_text"...). Es imprescindible y se descubrió tarde: las capas de los
// sliders NO declaran color, lo toman del preset. Sin esta tabla hay que
// adivinar los colores, y adivinar en una migración es exactamente lo que no se
// debe hacer.
global $wpdb;
foreach (['revslider_sliders', 'revslider_slides', 'revslider_css', 'revslider_layer_animations'] as $tabla) {
    $nombre = $wpdb->prefix . $tabla;
    $existe = $wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', $nombre));
    if (!$existe) continue;
    $filas = $wpdb->get_results("SELECT * FROM `$nombre`", ARRAY_A);
    if (!is_array($filas)) continue;
    foreach ($filas as $f) {
        // `params` es JSON serializado por el plugin
        if (isset($f['params']) && is_string($f['params'])) {
            $dec = json_decode($f['params'], true);
            if (is_array($dec)) $f['params_decodificado'] = $dec;
        }
        $export['sliders_revolution'][] = ['tabla' => $tabla] + $f;
    }
}

// --- Menús -----------------------------------------------------------------
foreach (wp_get_nav_menus() as $menu) {
    $items = [];
    // wp_get_nav_menu_items puede devolver false; sin esta guarda, el foreach
    // emitiria un aviso y en algunos hosts cortaria la ejecucion.
    $crudos = wp_get_nav_menu_items($menu->term_id);
    if (is_array($crudos)) {
        foreach ($crudos as $it) {
            $items[] = [
                'titulo'    => $it->title,
                'url'       => $it->url,
                'orden'     => (int) $it->menu_order,
                'padre'     => (int) $it->menu_item_parent,
                'tipo'      => $it->type,
                'objeto'    => $it->object,
                'idioma'    => en_idioma_de($it->ID, 'nav_menu_item'),
            ];
        }
    }
    $ubicaciones = [];
    foreach ((array) get_nav_menu_locations() as $ubic => $term_id) {
        if ((int) $term_id === (int) $menu->term_id) $ubicaciones[] = $ubic;
    }
    $export['menus'][] = [
        'nombre'      => $menu->name,
        'slug'        => $menu->slug,
        'ubicaciones' => $ubicaciones,
        'items'       => $items,
    ];
}

// --- Páginas, en TODOS los idiomas ----------------------------------------
// suppress_filters => true es imprescindible: sin él, WPML devuelve solo las
// páginas del idioma actual y el export saldría incompleto sin avisar.
$paginas = get_posts([
    'post_type'        => ['page', 'post'],
    'post_status'      => 'publish',
    'posts_per_page'   => -1,
    'orderby'          => 'menu_order title',
    'order'            => 'ASC',
    'suppress_filters' => true,
]);

foreach ($paginas as $p) {
    $idioma = en_idioma_de($p->ID, $p->post_type);

    // SEO de Rank Math, con reserva al título/excerpt si no está
    $seo_titulo = get_post_meta($p->ID, 'rank_math_title', true);
    if ($seo_titulo === '') $seo_titulo = $p->post_title;
    $seo_desc = get_post_meta($p->ID, 'rank_math_description', true);
    if ($seo_desc === '') {
        $seo_desc = wp_trim_words(strip_tags($p->post_excerpt ? $p->post_excerpt : $p->post_content), 30);
    }

    $datos = [
        'id'       => $p->ID,
        'tipo'     => $p->post_type,
        'slug'     => $p->post_name,
        'titulo'   => $p->post_title,
        'url'      => get_permalink($p->ID),
        'idioma'   => $idioma,
        'traducciones' => en_traducciones_de($p->ID, $p->post_type),
        'contenido'    => $p->post_content,
        'extracto'     => $p->post_excerpt,
        'fecha'        => $p->post_date,
        'modificado'   => $p->post_modified,
        'autor'        => get_the_author_meta('display_name', $p->post_author),
        'plantilla'    => get_page_template_slug($p->ID),
        'padre'        => (int) $p->post_parent,
        'orden_menu'   => (int) $p->menu_order,
        'seo'          => [
            'titulo'        => $seo_titulo,
            'descripcion'   => $seo_desc,
            'focus_keyword' => get_post_meta($p->ID, 'rank_math_focus_keyword', true),
            'robots'        => get_post_meta($p->ID, 'rank_math_robots', true),
            'canonical'     => get_post_meta($p->ID, 'rank_math_canonical_url', true),
        ],
        'elementor'    => [
            'es_builder'  => get_post_meta($p->ID, '_elementor_edit_mode', true) === 'builder',
            'version'     => get_post_meta($p->ID, '_elementor_version', true),
            'plantilla'   => get_post_meta($p->ID, '_elementor_template_type', true),
            'ajustes_pagina' => get_post_meta($p->ID, '_elementor_page_settings', true),
        ],
    ];

    // Imagen destacada
    $fic = get_the_post_thumbnail_url($p->ID, 'full');
    if ($fic) {
        $aid = get_post_thumbnail_id($p->ID);
        $datos['imagen_destacada'] = [
            'url'    => $fic,
            'alt'    => get_post_meta($aid, '_wp_attachment_image_alt', true),
            'ancho'  => get_post_meta($aid, '_wp_attachment_width', true),
            'alto'   => get_post_meta($aid, '_wp_attachment_height', true),
        ];
    }

    // Datos de Elementor: el JSON crudo es la fuente de la reconstrucción
    $elementor_json = get_post_meta($p->ID, '_elementor_data', true);
    if ($elementor_json) {
        $datos['elementor']['datos_crudos'] = $elementor_json;
        $widgets = json_decode($elementor_json, true);
        if (is_array($widgets)) {
            $anim = [];
            en_recorrer_widgets($widgets, $p->post_name . '|' . ($idioma ? $idioma['code'] : '?'), $anim, $export['inventario_widgets']);
            $datos['elementor']['total_animaciones'] = count($anim);
            $export['animaciones'] = array_merge($export['animaciones'], $anim);
        }
    }

    // Medios: del contenido y de los datos de Elementor
    $medios = array_merge(
        en_imagenes_de($p->post_content),
        en_imagenes_de(is_string($elementor_json) ? $elementor_json : '')
    );
    $medios = array_values(array_unique($medios));
    if ($medios) {
        $datos['imagenes'] = $medios;
        foreach ($medios as $u) $export['medios'][] = ['url' => $u, 'pagina' => $p->post_name];
    }

    $export['paginas'][] = $datos;
}

// Deduplicar medios por URL
$unicos = [];
foreach ($export['medios'] as $m) $unicos[$m['url']] = $m;
$export['medios'] = array_values($unicos);

$export['meta']['total_paginas']     = count($export['paginas']);
$export['meta']['total_medios']      = count($export['medios']);
$export['meta']['total_animaciones'] = count($export['animaciones']);
$export['meta']['total_widgets']     = array_sum($export['inventario_widgets']);

// JSON_INVALID_UTF8_SUBSTITUTE es imprescindible, no cosmetico: en un WordPress
// antiguo es habitual que la base de datos tenga texto con UTF-8 mal formado
// (arrastrado de imports o ediciones viejas). Sin este flag, json_encode
// devuelve FALSE EN SILENCIO y el export saldria vacio sin decir por que.
$json = json_encode(
    $export,
    JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE
);

if ($json === false) {
    // Se informa del motivo concreto en vez de entregar un archivo vacio.
    en_cerrar_buffer();
    header('Content-Type: text/plain; charset=utf-8');
    echo "ERROR: no se pudo serializar el export a JSON.\n";
    echo "Motivo de json_encode: " . json_last_error_msg() . "\n";
    echo "Codigo de error: " . json_last_error() . "\n\n";
    echo "Las paginas se recorrieron correctamente (" . count($export['paginas']) . "), el fallo esta al serializar.\n";
    echo "Suele ser memoria insuficiente: prueba a subir memory_limit en php.ini o a exportar por lotes.\n";
    exit(1);
}

// Copia en disco junto al script, por si se prefiere bajar por FTP
@file_put_contents(__DIR__ . '/wp-export.json', $json);

// ---------------------------------------------------------------------------
// Salida
// ---------------------------------------------------------------------------

// ?download=1 descarga el JSON como archivo, sin mostrarlo en pantalla.
if (isset($_GET['download'])) {
    en_cerrar_buffer(); // descarta cualquier salida previa de WordPress o plugins
    header('Content-Type: application/json; charset=utf-8');
    header('Content-Disposition: attachment; filename="wp-export.json"');
    header('Content-Length: ' . strlen($json));
    echo $json;
    exit;
}

// Por defecto: SOLO MÉTRICAS. Nunca el contenido.
en_cerrar_buffer();
header('Content-Type: text/plain; charset=utf-8');
$m = $export['meta'];
$lineas = [];
$lineas[] = 'EXPORTACION DE e-nation.org — SOLO METRICAS (el contenido no se imprime)';
$lineas[] = str_repeat('=', 70);
$lineas[] = '';
$lineas[] = 'WordPress:            ' . $m['wp_version'];
$lineas[] = 'Tema:                 ' . $m['tema'] . ' (padre: ' . $m['tema_padre'] . ')';
$lineas[] = 'WPML activo:          ' . ($m['wpml'] ? 'si' : 'NO');
$lineas[] = 'Subdirectorio de WP:  ' . ($m['subdirectorio_wp'] ? $m['subdirectorio_wp'] : '(raiz)');
$lineas[] = '';
$lineas[] = 'Idiomas (' . count($export['idiomas']) . '):';
foreach ($export['idiomas'] as $l) {
    $lineas[] = '  - ' . str_pad($l['code'], 5) . ' ' . str_pad($l['name'], 20) . ($l['es_predeterminado'] ? '[predeterminado]' : '');
}
$lineas[] = '';
$lineas[] = 'Paginas exportadas:   ' . $m['total_paginas'];
$por_idioma = [];
foreach ($export['paginas'] as $p) {
    $c = $p['idioma'] ? $p['idioma']['code'] : '(sin idioma)';
    if (!isset($por_idioma[$c])) $por_idioma[$c] = 0;
    $por_idioma[$c]++;
}
foreach ($por_idioma as $c => $n) $lineas[] = '    ' . str_pad($c, 14) . $n . ' paginas';
$lineas[] = '';
$lineas[] = 'Menus:                ' . count($export['menus']);
foreach ($export['menus'] as $mn) $lineas[] = '    ' . str_pad($mn['nombre'], 24) . count($mn['items']) . ' items';
$lineas[] = '';
$lineas[] = 'Imagenes referenciadas: ' . $m['total_medios'];
$lineas[] = 'Widgets de Elementor:   ' . $m['total_widgets'];
$lineas[] = 'Efectos registrados:    ' . $m['total_animaciones'];
$lineas[] = '';
$lineas[] = 'Inventario de widgets (que habra que reconstruir):';
arsort($export['inventario_widgets']);
foreach ($export['inventario_widgets'] as $t => $n) {
    $lineas[] = '    ' . str_pad($t, 26) . $n;
}
$lineas[] = '';
$lineas[] = 'Sliders de Revolution: ' . count($export['sliders_revolution']) . ' filas';
$lineas[] = 'Kit global capturado:  ' . ($export['kit_global_elementor'] ? 'si' : 'no');
$lineas[] = '';
$lineas[] = 'Paginas con el builder activo: ' . count(array_filter($export['paginas'], function ($p) {
    return !empty($p['elementor']['es_builder']);
})) . ' de ' . count($export['paginas']);
$lineas[] = '';
$lineas[] = str_repeat('-', 70);
$lineas[] = 'Tamano del JSON: ' . number_format(strlen($json)) . ' bytes';
$lineas[] = '';
$lineas[] = 'DESCARGAR:  anade ?download=1 a esta misma URL';
$lineas[] = 'Y DESPUES BORRA ESTE ARCHIVO DEL SERVIDOR.';

echo implode("\n", $lineas) . "\n";
