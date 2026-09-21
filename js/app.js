/**
 * Stryds / Arquitectura de Información & Sistema de Diseño
 * Manejador principal: router de vistas (dashboard + 4 secciones),
 * generador de tiles, personalizador de tokens y toggle de tema.
 */
(function () {
  'use strict';

  // Helper de selección rápida por ID requerido por la especificación
  var $ = function (id) {
    return document.getElementById(id);
  };

  // Caché de elementos de DOM frecuentemente consultados
  var el = {
    colorPrimaryInput: $('color-primary-input'),
    tokensGrid: $('tokens-grid'),
    dashboardGrid: $('dashboardGrid'),
    roleButtons: null,
    rolePanels: null,
    views: null,
    navLinks: null
  };

  var DASHBOARD_ID = 'dashboard';

  /**
   * Inicializa el selector de roles de la Sección 3 (Navegación).
   * Conmuta la visibilidad de las maquetas de navegación y actualiza aria-pressed.
   */
  function initRoleSelector() {
    el.roleButtons = document.querySelectorAll('.role-switch-btn');
    el.rolePanels = document.querySelectorAll('.role-view-panel');

    if (!el.roleButtons.length || !el.rolePanels.length) return;

    el.roleButtons.forEach(function (button) {
      button.addEventListener('click', function () {
        var targetRole = button.getAttribute('data-role');

        // Actualizar estados de botones
        el.roleButtons.forEach(function (btn) {
          var isCurrent = btn === button;
          btn.setAttribute('aria-pressed', isCurrent ? 'true' : 'false');
        });

        // Conmutar panel visible
        el.rolePanels.forEach(function (panel) {
          if (panel.getAttribute('data-role') === targetRole) {
            panel.classList.add('is-active');
          } else {
            panel.classList.remove('is-active');
          }
        });
      });
    });
  }

  /**
   * Maneja el cambio interactivo de --color-primary y su persistencia segura.
   * Modifica :root directamente para que todos los componentes reactivos respondan.
   */
  function initColorCustomizer() {
    if (!el.colorPrimaryInput) return;

    // Helper para garantizar formato hexadecimal requerido por input[type="color"].
    // Sin fallback hardcodeado: si no puede parsear, lee el valor vivo de
    // --color-primary desde tokens.css (ningún color literal fuera de ese archivo).
    function fallbackHex() {
      // El token vivo es la única fuente de verdad; si no resolvió, no hay
      // color de respaldo que inventar acá — se deja que el navegador use el
      // value= que el propio <input type="color"> trae desde el HTML.
      return getComputedStyle(document.documentElement)
        .getPropertyValue('--color-primary').trim();
    }

    function normalizeHex(colorStr) {
      if (!colorStr) return fallbackHex();
      colorStr = colorStr.trim();
      if (colorStr.startsWith('#') && (colorStr.length === 7 || colorStr.length === 4)) {
        if (colorStr.length === 4) {
          return '#' + colorStr[1] + colorStr[1] + colorStr[2] + colorStr[2] + colorStr[3] + colorStr[3];
        }
        return colorStr;
      }
      var rgbMatch = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
      if (rgbMatch) {
        var r = parseInt(rgbMatch[1], 10).toString(16).padStart(2, '0');
        var g = parseInt(rgbMatch[2], 10).toString(16).padStart(2, '0');
        var b = parseInt(rgbMatch[3], 10).toString(16).padStart(2, '0');
        return '#' + r + g + b;
      }
      return fallbackHex();
    }

    // Recuperar color previamente guardado si existe en el almacenamiento local
    try {
      var savedColor = localStorage.getItem('stryds_color_primary');
      if (savedColor) {
        document.documentElement.style.setProperty('--color-primary', savedColor);
        el.colorPrimaryInput.value = normalizeHex(savedColor);
      } else {
        var computedColor = getComputedStyle(document.documentElement)
          .getPropertyValue('--color-primary')
          .trim();
        if (computedColor) {
          el.colorPrimaryInput.value = normalizeHex(computedColor);
        }
      }
    } catch (err) {
      // Ignorar fallos de acceso a localStorage (ej. modo incógnito estricto)
    }

    var applyColor = function (colorValue) {
      document.documentElement.style.setProperty('--color-primary', colorValue);

      // Actualizar valor numérico mostrado en el swatch dinámico de primario
      var primaryValElem = $('val---color-primary');
      if (primaryValElem) {
        primaryValElem.textContent = colorValue;
      }

      try {
        localStorage.setItem('stryds_color_primary', colorValue);
      } catch (err) {
        // Almacenamiento no disponible
      }
    };

    el.colorPrimaryInput.addEventListener('input', function (e) {
      applyColor(e.target.value);
    });

    el.colorPrimaryInput.addEventListener('change', function (e) {
      applyColor(e.target.value);
    });
  }

  /**
   * Descubre y renderiza dinámicamente todos los tokens de color y superficie
   * inspeccionando las hojas de estilo cargadas y calculando sus valores en :root.
   */
  function generateTokenSwatches() {
    if (!el.tokensGrid) return;

    var discoveredTokens = [];
    var seen = {};

    // Extraer propiedades personalizadas declaradas en las hojas de estilo del documento
    for (var i = 0; i < document.styleSheets.length; i++) {
      var sheet = document.styleSheets[i];
      try {
        var rules = sheet.cssRules || sheet.rules;
        if (!rules) continue;

        for (var j = 0; j < rules.length; j++) {
          var rule = rules[j];
          if (rule.selectorText && (rule.selectorText === ':root' || rule.selectorText.indexOf(':root') !== -1)) {
            var style = rule.style;
            for (var k = 0; k < style.length; k++) {
              var propName = style[k];
              if (
                (propName.startsWith('--color') ||
                 propName.startsWith('--surface') ||
                 propName.startsWith('--text-') ||
                 propName.startsWith('--state-') ||
                 propName.startsWith('--border-')) &&
                !seen[propName]
              ) {
                seen[propName] = true;
                discoveredTokens.push(propName);
              }
            }
          }
        }
      } catch (e) {
        // En caso de hojas protegidas por CORS u otros errores de lectura
      }
    }

    // Fallback asegurado con la lista estándar si el navegador restringe la lectura de rules
    if (discoveredTokens.length === 0) {
      discoveredTokens = [
        '--color-primary',
        '--color-primary-ink',
        '--surface-canvas',
        '--surface-card',
        '--surface-card-alt',
        '--border-hairline',
        '--border-strong',
        '--text-primary',
        '--text-muted',
        '--state-honesty-bg',
        '--state-honesty-border',
        '--state-honesty-text',
        '--state-critical-bg',
        '--state-critical-border',
        '--state-critical-text',
        '--state-pending-bg',
        '--state-pending-border',
        '--state-pending-text'
      ];
    }

    var rootComputed = getComputedStyle(document.documentElement);
    el.tokensGrid.innerHTML = '';

    discoveredTokens.forEach(function (token) {
      var currentValue = rootComputed.getPropertyValue(token).trim();

      var card = document.createElement('div');
      card.className = 'token-swatch-card';

      var preview = document.createElement('div');
      preview.className = 'token-swatch-preview';
      // Asignar el token como variable para que reaccione inmediatamente a cambios en tiempo real
      preview.style.backgroundColor = 'var(' + token + ')';

      var info = document.createElement('div');
      info.className = 'token-swatch-info';

      var name = document.createElement('span');
      name.className = 'token-swatch-name';
      name.textContent = token;

      var val = document.createElement('span');
      val.className = 'token-swatch-value';
      val.id = 'val-' + token;
      val.textContent = currentValue || 'definido en tokens.css';

      info.appendChild(name);
      info.appendChild(val);
      card.appendChild(preview);
      card.appendChild(info);

      el.tokensGrid.appendChild(card);
    });
  }

  /**
   * Router de vistas: dashboard + 4 secciones, todas en el mismo documento
   * (requisito de tarea.txt: "un solo index.html"). Mismo patrón que
   * mockup/js/mockup.js — .view/.view.is-active con doble requestAnimationFrame
   * para que la transición de entrada corra en vez de saltar al estado final.
   */
  function show(viewId) {
    if (!el.views || !el.views.length) return;
    var target = null;

    el.views.forEach(function (view) {
      var isTarget = view.id === viewId;
      if (isTarget) target = view;
      view.classList.remove('is-visible');
      view.classList.toggle('is-active', isTarget);
    });

    if (!target) return;

    // Reflow antes de agregar is-visible: si no, el navegador colapsa el
    // estado inicial y final de la transición y no se ve nada animarse.
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        target.classList.add('is-visible');
      });
    });

    // Si la vista es una sección (trae data-index), la tile del dashboard
    // correspondiente se marca .cur para cuando el usuario vuelva atrás.
    if (el.dashboardGrid) {
      el.dashboardGrid.querySelectorAll('.dashboard-tile').forEach(function (tile) {
        tile.classList.toggle('is-current', tile.getAttribute('data-view') === viewId);
      });
    }

    el.navLinks.forEach(function (link) {
      var isCurrent = link.getAttribute('data-view') === viewId;
      link.classList.toggle('is-active', isCurrent);
      if (isCurrent) {
        link.setAttribute('aria-current', 'page');
      } else {
        link.removeAttribute('aria-current');
      }
    });

    try { history.replaceState(null, '', '#' + viewId); } catch (e) { /* file:// a veces lo bloquea */ }

    window.scrollTo({ top: 0, behavior: 'instant' in window.scrollTo ? 'instant' : 'auto' });
  }

  /**
   * Genera las 4 tiles del dashboard clonando el innerHTML real de cada
   * .view (excepto el propio dashboard) — no son íconos ni resúmenes
   * inventados, es el contenido real de la sección en miniatura, escalado.
   * Mismo patrón que #grid/.mini en presentacion/index.html.
   */
  function renderDashboardTiles() {
    if (!el.dashboardGrid) return;
    el.dashboardGrid.innerHTML = '';

    var TILE_NATIVE_WIDTH = 1040; // ancho aproximado del contenido de una .view

    el.views.forEach(function (view) {
      if (view.id === DASHBOARD_ID) return;

      var tile = document.createElement('button');
      tile.type = 'button';
      tile.className = 'dashboard-tile';
      tile.setAttribute('data-view', view.id);
      tile.setAttribute('aria-label', 'Abrir sección ' + (view.getAttribute('data-title') || view.id));

      var mini = document.createElement('div');
      mini.className = 'dashboard-tile-mini';
      mini.style.width = TILE_NATIVE_WIDTH + 'px';
      // Clon real del contenido, sin el botón "← Dashboard" (no tiene sentido
      // en la miniatura) ni los <script> inline que pudiera arrastrar.
      var clone = view.cloneNode(true);
      var backBtn = clone.querySelector('.back-to-dashboard');
      if (backBtn) backBtn.remove();
      mini.innerHTML = clone.innerHTML;

      var label = document.createElement('div');
      label.className = 'dashboard-tile-label';
      label.innerHTML =
        '<span class="dashboard-tile-index">' + (view.getAttribute('data-index') || '') + '</span>' +
        '<span class="dashboard-tile-title">' + (view.getAttribute('data-title') || view.id) + '</span>';

      tile.appendChild(mini);
      tile.appendChild(label);
      tile.addEventListener('click', function () { show(view.id); });

      el.dashboardGrid.appendChild(tile);
    });

    scaleTiles();
  }

  /**
   * Recalcula la escala de cada .dashboard-tile-mini según el ancho real de
   * su tile. Debe correr después de que el dashboard sea visible: mientras
   * .view tiene display:none, clientWidth da 0 y la escala sale mal.
   */
  function scaleTiles() {
    if (!el.dashboardGrid) return;
    el.dashboardGrid.querySelectorAll('.dashboard-tile').forEach(function (tile) {
      var mini = tile.querySelector('.dashboard-tile-mini');
      if (!mini) return;
      var tileWidth = tile.clientWidth || 320;
      var nativeWidth = parseFloat(mini.style.width) || 1040;
      mini.style.transform = 'scale(' + (tileWidth / nativeWidth) + ')';
    });
  }

  /**
   * Inicializa el router: cachea las vistas, cablea los data-view clickeables
   * de la nav y los botones "← Dashboard", y abre la vista del hash actual
   * (o el dashboard si no hay hash / no matchea ninguna vista).
   */
  function initRouter() {
    el.views = document.querySelectorAll('.view');
    el.navLinks = document.querySelectorAll('[data-view]');
    if (!el.views.length) return;

    el.navLinks.forEach(function (trigger) {
      trigger.addEventListener('click', function (ev) {
        ev.preventDefault();
        show(trigger.getAttribute('data-view'));
      });
    });

    document.querySelectorAll('.back-to-dashboard').forEach(function (btn) {
      btn.addEventListener('click', function () { show(DASHBOARD_ID); });
    });

    window.addEventListener('resize', scaleTiles);

    renderDashboardTiles();

    var hash = (location.hash || '').replace('#', '');
    var hasMatch = hash && document.getElementById(hash) && document.getElementById(hash).classList.contains('view');
    show(hasMatch ? hash : DASHBOARD_ID);
  }

  /**
   * Toggle de tema claro/oscuro. El tema ya se aplicó antes del primer paint
   * (script inline en el <head>); esto solo maneja el click y persiste.
   */
  function initThemeToggle() {
    var btn = $('themeToggle');
    if (!btn) return;

    function currentTheme() {
      return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    }

    function syncButton() {
      var isLight = currentTheme() === 'light';
      btn.setAttribute('aria-pressed', String(isLight));
      btn.setAttribute('aria-label', isLight ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro');
    }

    btn.addEventListener('click', function () {
      var next = currentTheme() === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) { /* modo incógnito estricto */ }
      syncButton();
      // Vuelve a generar los swatches: sus valores hex cambian con el tema.
      generateTokenSwatches();
    });

    syncButton();
  }

  // Inicialización cuando el DOM esté listo
  function init() {
    initRoleSelector();
    initColorCustomizer();
    generateTokenSwatches();
    initThemeToggle();
    initRouter();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
