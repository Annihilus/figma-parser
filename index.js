import fetch from 'node-fetch';
import * as fs from 'fs';
import {
  collectAlign,
  collectBackground,
  collectBorder,
  collectColor,
  collectPadding,
  collectShadow,
  collectTransition
} from './utils/collect.js';

// var fs = require('fs');

const FIGMA_FILE = 'o2EFM7hYM1rHlK4N7Kftdt';
const FIGMA_TOKEN = 'figd_ARCGHU5g0FIXtqOTjClda2IqkHmFoWzoCBAAf3GQ';

const STATES = ['hover', 'disabled', 'readonly'];

const CONFIG = {
  components: {
    Buttons: {
      exclude: ['width'],
      children: {
        spinner: {
          variables: true,
          include: ['border', 'width', 'height']
        }
      }
    },
  },
}

const FONT_STYLES_MAP = {
  'font-family': {
    collector: (variant) => variant.style.fontFamily,
  },
  'line-height': {
    units: 'px',
    collector: (variant) => variant.style.lineHeightPx,
  },
  'letter-spacing': {
    units: 'px',
    collector: (variant) => variant.style.letterSpacing,
  },
  'font-size': {
    units: 'px',
    collector: (variant) => variant.style.fontSize,
  },
  'font-weight': {
    collector: (variant) => variant.style.fontWeight,
  },
  'color': {
    collector: collectColor,
  }
}

const BASE_STYLES_MAP = {
  'width': {
    units: 'px',
    collector: (variant) => variant.absoluteBoundingBox.width,
  },
  'height': {
    units: 'px',
    collector: (variant) => variant.absoluteBoundingBox.height,
  },
  'padding': {
    collector: collectPadding,
  },
  'border': {
    collector: collectBorder,
  },
  'border-radius': {
    units: 'px',
    collector: (variant) => variant.cornerRadius || 0,
  },
  'background': {
    collector: collectBackground,
  },
  'align-items': {
    collector: (variant) => collectAlign(variant.counterAxisAlignItems, 'top'),
  },
  'justify-content': {
    collector: (variant) => collectAlign(variant.counterAxisAlignItems, 'left'),
  },
  'gap': {
    collector: (variant) => `${variant.itemSpacing || 0}px`,
  },
  'box-shadow': {
    collector: collectShadow,
  },
  'transition': {
    collector: collectTransition,
  }
}

const STYLES = {
  ...BASE_STYLES_MAP,
  ...FONT_STYLES_MAP,
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
      str = parseComponent(component, str);
    });

  createCssFile(str);
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

function parseComponent(component) {
  const propsMap = [];
  const modifiers = [];

  component.children.forEach(variant => {
    const modifier = getModifier(variant);

    // collectProperties(variant, propsMap, modifiers, modifier);

    if (variant.children) {
      variant.children.forEach(child => {
        if (child.type !== 'TEXT' && child.name !== 'name') {
          const childModifier = `${modifier} .${child.name}`;

          collectProperties(child, propsMap, modifiers, childModifier, true);

          console.log(propsMap);
        }
      });
    }
  });

  const mixin = createMixin(parse(propsMap, component.name), component.name);

  return mixin;
}

function createMixin(data, component) {
  let result = '';
  let baseStyles = '';

  Object.keys(data).forEach(key => {
    let props = '';
    const propData = Object.entries(data[key]);

    propData.forEach(([prop, value], index) => {
      const postfix = propData.length !== index + 1 ? '\n' : '';
      const spaces = key === '' ? '  ' : '    ';
      const result = `${spaces}${prop}: ${value};${postfix}`;

      if (key === '') {
        baseStyles += result;
      } else {
        props += result;
      }
    });

    const keyParts = key.split(',');
    let keyString = '';

    keyParts.forEach((part, index) => {
      const spaces = '  ';
      keyString += keyParts.length !== index + 1 ? `${spaces}&${part},\n` : `${spaces}&${part}`;
    });


    if (key !== '') {
    result += `
${keyString} {
${props}
  }\n`
    }
  });


  return `@mixin ${component.toLowerCase()} {
${baseStyles}
${result}
}`
}

function collectModifiersCount(modifier, result = {}) {
  const parts = modifier.replace(/\s/g, '').split('.');

  parts.forEach(part => {
    if (!result[part]) {
      result[part] = 1;
    } else {
      result[part] += 1;
    }
  });

  return result;
}

function parse(props, component) {
  const result = {};
  let modifier = '';
  let modCounts = {};
  let value = null;
  let count = 0;

  Object.keys(STYLES)
    .filter(key => {
      // TODO new method filter
      if (CONFIG.components[component].exclude) {
        return !CONFIG.components[component].exclude.includes(key);
      }

      if (CONFIG.components[component].include) {
        return CONFIG.components[component].include.includes(key);
      }
    })
    .forEach(key => {

      const sortedByProp = props.sort(function(a, b) {
        return (a.values[key] < b.values[key]) ? -1 : (a.values[key] > b.values[key]) ? 1 : 0;
      });

      for (let i = 0; i < sortedByProp.length; i++) {
        if (sortedByProp[i + 1]?.values[key] === sortedByProp[i]?.values[key]) {
          count += 1;
          const mod = sortedByProp[i].modifier;

          value = sortedByProp[i].values[key];

          if (value) {
            modifier = modifier.length ? `${modifier},${mod}` : mod;
          }
        } else {
          modifier = count === sortedByProp.length - 1 ? '' : modifier;

          if (value) {
            if (!result[modifier]) {
              result[modifier] = {};
            }

            result[modifier][key] = value;
          }

          modifier = '';
          count = 0;
        }
      }
    });

    // console.log(result);

  return result;
}

function createCssFile(content) {
  fs.writeFile('figma-variables.scss', content, function (err) {
    if (err) throw err;
    console.log('Variables scss file is created successfully.');
  });
}

function getModifier(variant) {
  const variantModifiers = variant.name
    .toLowerCase()
    .split(',')
    .map(modifier => modifier.split('='))
    .filter(modifier => modifier[1] !== 'false')
    .map(modifier => {
      const modNoSpaces = modifier[0].replace(/\s/g, '');
      const prefix = STATES.includes(modNoSpaces) ? ':' : '.';

      if (modifier[1] === 'true') {
        return `${prefix}${modifier[0]}`;
      }

      return `${prefix}${modifier[0]}-${modifier[1]}`;
    })
    .join('')
    .replace(/\s/g, '');

  return variantModifiers;
}

function collectProperties(variant, propsMap, modifiers, modifier) {
  const variantData = {
    values: {},
  };

  if (variant.children) {
    variant.children.forEach(child => {
      if (child.type === 'TEXT' && child.name === 'text') {
        Object.entries(FONT_STYLES_MAP).forEach(([css, data]) => {
          const figmaValue = data.collector(child);

          if (figmaValue) {
            const units = data.units ? data.units : '';

            variantData.values[css] = `${figmaValue}${units}`;
          }
        });
      }
    });
  }

  Object.entries(BASE_STYLES_MAP).forEach(([css, data]) => {
    const figmaValue = data.collector(variant);

    if (figmaValue) {
      const units = data.units ? data.units : '';

      variantData.values[css] = `${figmaValue}${units}`;
    }
  });

  variantData.modifier = modifier;

  modifiers.push(modifier);
  propsMap.push(variantData);
}

// Getting all
getFiles(`https://api.figma.com/v1/files/${FIGMA_FILE}`);
