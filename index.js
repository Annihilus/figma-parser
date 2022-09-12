import fetch from 'node-fetch';
// import { cssGradient } from './utils/gradient.js';
import { colorToRgba } from './utils/color.js';
import * as fs from 'fs';

// var fs = require('fs');

const FIGMA_FILE = '';
const FIGMA_TOKEN = 'figd_ARCGHU5g0FIXtqOTjClda2IqkHmFoWzoCBAAf3GQ';

const POSITIONS = {
  MAX: 'bottom',
  CENTER: 'center',
}

const FONT_STYLES_MAP = {
  fontFamily: {
    css: 'FontFamily'
  },
  lineHeightPx: {
    css: 'LineHeight',
    units: 'px'
  },
  letterSpacing: {
    css: 'LetterSpacing',
    units: 'px'
  },
  fontWeight: {
    css: 'FontWeight',
    units: 'px'
  },
  fontSize: {
    css: 'FontSize',
    units: 'px'
  },
}

const BASE_STYLES_MAP = {
  strokeWeight: {
    css: 'Border'
  }
}

async function fetchFigma(path) {
  const response = await fetch(path, {
    method: 'GET',
    headers: {
      'X-Figma-Token': FIGMA_TOKEN
    }
  });

  const data = await response.json();

  return data;
}

function getStylesPath(styles) {
  const ids = Object.keys(styles).join(',');

  return `https://api.figma.com/v1/files/NkNip5QXSmDjYr3zjWyDYd/nodes?ids=${ids}`;
}

async function getFiles(path) {
  let stylesPath;
  let components;

  // Collecting all data from firma file
  await fetchFigma(path)
    .then(data => {
      stylesPath = getStylesPath(data.styles);
      components = data.document;
    });

  // Collecting styles mixins
  // await fetchFigma(stylesPath)
  //   .then(styles => {
  //     collectStyles(styles.nodes);
  //   });

  let str = '';

  // Parsing components
  findComponents(components)
    .forEach(component => {
      str += `// =============================================================
// ${component.name}\n`;

      str = parseComponent(component, str);
    });

  const cssFormat = `:root {
${str}}`;

  createCssFile(cssFormat);
}

function collectStyles(nodes) {
  const stylesMap = {};

  const styles = Object.values(nodes)
    .map(x => x.document);

  styles.sort(function(a, b) {
    return (a.type < b.type) ? -1 : (a.type > b.type) ? 1 : 0;
  });

  styles.forEach(style => {
    const modifier = style.name.replace('/', '');

    stylesMap[style.id] = {};

    if (style.type === 'RECTANGLE') {
      stylesMap[style.id][modifier + 'Color'] = colorToRgba(style.fills[0].color);
    }

    if (style.type === 'TEXT') {
      const fontStyles = Object.keys(style.style);
      fontStyles.forEach(item => {
        const cssPropName = FONT_STYLES_MAP[item];

        if (cssPropName) {
          stylesMap[style.id][modifier + cssPropName] = null;
        }
      });
    }
  });
}

function findComponents(data, componentSets = []) {
  if (data.children) {
    data.children.forEach(child => {
      if (child.type === 'COMPONENT_SET') {
        componentSets.push(child);
      } else if (child.children) {
        findComponents(child, componentSets);
      }
    });
  }

  return componentSets;
}

function parseComponent(component, str) {
  component.children.forEach(variant => {
    const modifier = getModifier(component.name, variant);
    const props = collectProperties(variant);

    // TODO
    str += createVariables(modifier, props);

    if (variant.children.length) {
      str = parseComponentChildren(modifier, variant.children, str);
    }
  });


  return str;
}

function createCssFile(content) {
  fs.writeFile('figma-variables.scss', content, function (err) {
    if (err) throw err;
    console.log('Variables scss file is created successfully.');
  });
}

function createVariables(modifier, props, grouping = true) {
  let str = grouping ? `// =============================================================
// ${modifier}
// =============================================================\n` : '';

  Object.entries(props).forEach(([key, value]) => {
    str += `--${modifier}${key}: "${value}";\n`;
  });

  return str;
}

function parseComponentChildren(modifier, children, str) {
  children
    .filter(child => child.type !== 'TEXT')
    .forEach(child => {
      const normalizedName = child.name.replace('$','');
      const props = collectProperties(child);
      const elementName = normalizedName[0].toUpperCase() + normalizedName.substring(1).toLowerCase();
      const childModifier = `${modifier}${child.type === 'TEXT' ? '' : elementName}`;

      str += createVariables(childModifier, props, child.type !== 'TEXT');
    });

  return str;
}

function getModifier(component, variant) {
  const variantModifiers = variant.name
    .split(',')
    .map(modifier => modifier.split('='))
    .filter(modifier => modifier[1] !== 'False')
    .map(modifier => {
      if (modifier[1] === 'True') {
        return modifier[0];
      }

      return modifier[1];
    })
    .join('')
    .replace(/\s/g, '');

  return component + variantModifiers;
}

function collectProperties(variant) {
  // Collecting font styles
  let fontStyles = {};
  if (variant.style) {
    const styles = Object.keys(variant.style);
    styles.forEach(item => {
      const cssPropName = FONT_STYLES_MAP[item];

      if (cssPropName) {
        const units = cssPropName.units ? cssPropName.units : '';

        fontStyles[cssPropName.css] = `${variant.style[item]}${units}`;
      }
    });
  }

  if (variant.type === 'TEXT') {
    if (variant.fills && variant.fills.length) {
      fontStyles.Color = colorToRgba(variant.fills[0].color);
    }

    return fontStyles;
  }

  // const styles = Object.keys(variant.style);
  // styles.forEach(item => {
  //   const cssPropName = FONT_STYLES_MAP[item];

  //   if (cssPropName) {
  //     const units = cssPropName.units ? cssPropName.units : '';

  //     fontStyles[cssPropName.css] = `${variant.style[item]}${units}`;
  //   }
  // });

  return {
    Width: `${variant.absoluteBoundingBox.width}px`,
    Height: `${variant.absoluteBoundingBox.height}px`,
    Padding: collectPadding(variant),
    Border: collectBorder(variant),
    BorderRadius: `${variant.cornerRadius || 0}px`,
    Background: collectBackground(variant),
    Transition: collectTransition(variant),
    AlignV: collectAlign(variant.counterAxisAlignItems, 'top'),
    AlignH: collectAlign(variant.primaryAxisAlignItems, 'left'),
    Spacing: `${variant.itemSpacing || 0}px`,
    BoxShadow: collectShadow(variant),
    ...fontStyles,
  };
}

function collectBorder(variant) {
  if (!variant.strokes.length) {
    return 'none';
  }

  const color = colorToRgba(variant.strokes[0].color);
  const type = variant.strokes[0].type.toLowerCase();

  return `${variant.strokeWeight}px ${type} ${color}`;
}

function collectBackground(variant) {
  if (variant.background && variant.background.length) {
    const bg = variant.background[0];

    if (bg.type === 'SOLID') {
      return colorToRgba(bg.color);
    } else {
      // return cssGradient(bg);
    }
  }

  return 'transparent';
}

function collectShadow(variant) {
  if (!variant.effects.length) {
    return 'none';
  }

  const shadow = variant.effects[0];
  const type = shadow.type === 'INNER_SHADOW' ? 'inset' : '';

  return `${shadow.offset.x}px ${shadow.offset.y}px ${shadow.radius}px ${type} ${colorToRgba(shadow.color)}`;
}

function collectPadding(variant) {
  return `${variant.paddingTop || 0}px ${variant.paddingRight || 0}px ${variant.paddingBottom || 0}px ${variant.paddingLeft || 0}px`;
}

function collectTransition(variant) {
  if (!variant.transitionDuration) {
    return 'none';
  }

  return `all ${variant.transitionDuration}ms ${variant.transitionEasing.toLowerCase()}`;
}

function collectAlign(value, defaultValue) {
  return POSITIONS[value] ? POSITIONS[value] : defaultValue;
}

// Getting all
getFiles('https://api.figma.com/v1/files/o2EFM7hYM1rHlK4N7Kftdt');
// Getting styles
// getFiles('https://api.figma.com/v1/files/:key/nodes?ids=1:14');
// getFiles('https://api.figma.com/v1/files/:key/nodes?ids=1:14')

console.log('TEST');
