/**
 * Stryds / Arquitectura de Información & Sistema de Diseño
 * Manejador principal de interactividad, persistencia de tokens y scrollspy.
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
    roleButtons: null,
    rolePanels: null,
    navLinks: null,
    sections: null
  };

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
   * Scrollspy simple para iluminar el vínculo de navegación activo
   * a medida que el usuario se desplaza por las 4 secciones principales.
   */
  function initScrollspy() {
    el.navLinks = document.querySelectorAll('.doc-nav-link');
    el.sections = document.querySelectorAll('.doc-section');

    if (!el.navLinks.length || !el.sections.length) return;

    var handleScroll = function () {
      var scrollPos = window.scrollY || document.documentElement.scrollTop;
      var offsetBuffer = 140; // Compensación por la barra de navegación fija

      var currentSectionId = '';

      el.sections.forEach(function (section) {
        var top = section.offsetTop - offsetBuffer;
        var height = section.offsetHeight;
        if (scrollPos >= top && scrollPos < top + height) {
          currentSectionId = section.getAttribute('id');
        }
      });

      // Si estamos muy cerca del inicio, marcar la primera sección
      if (scrollPos < 200 && el.sections[0]) {
        currentSectionId = el.sections[0].getAttribute('id');
      }

      el.navLinks.forEach(function (link) {
        var href = link.getAttribute('href');
        if (href === '#' + currentSectionId) {
          link.classList.add('is-active');
          link.setAttribute('aria-current', 'page');
        } else {
          link.classList.remove('is-active');
          link.removeAttribute('aria-current');
        }
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
  }

  // Inicialización cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initRoleSelector();
      initColorCustomizer();
      generateTokenSwatches();
      initScrollspy();
    });
  } else {
    initRoleSelector();
    initColorCustomizer();
    generateTokenSwatches();
    initScrollspy();
  }
})();
