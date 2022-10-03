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
    Button: {
      exclude: ['width'],
      children: {
        spinner: {
          include: ['width', 'height', 'color', 'padding'],
          variables: {
            color: ['type'],
          },
        },
        icon: {
          include: ['width', 'height', 'color'],
        }
      }
    },
    Checkbox: {
      children: {
        icon: {
          include: ['color'],
        },
        element: {
          include: ['color'],
        }
      }
    }
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
  },
  'color': {
    collector: collectColor,
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

  // Parsing components
  findComponents(components)
    .forEach(component => {
      createCssFile(component.name, parseComponent(component));
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

function parseComponent(component) {
  const propsMap = [];
  const children = [];

  component.children.forEach(variant => {
    const modifier = getModifier(variant);

    collectProperties(variant, propsMap, modifier, component.name);

    if (variant.children) {
      variant.children.forEach(child => {

        if (child.type !== 'TEXT' && child.name !== 'name') {
          const childName = child.name.startsWith('$') ? child.name.split('-')[0] : child.name;
          const childModifier = `${modifier} .${childName}`;

          collectProperties(child, children, childModifier, component.name, childName);
        }
      });
    }
  });

  const parsedChildren = parse(children);
  const parsed = parse(propsMap);

  console.log(parsedChildren);

  const mixin = createMixin({...parsedChildren, ...parsed}, component.name);

  return mixin;
}

function generateVariable(data, prop) {
  const modifierParts = data.modifier.split('.');
  let variable = '';

  data.variables[prop].forEach(item => {
    const part = modifierParts.find(i => i.startsWith(item));

    if (part.length) {
      variable += variable.length ? `_${part}` : `$${part}`;
    }
  });

  if (data.component) {
    variable += `__${data.component}`;
  }

  return { [variable]: data.values[prop] };
}

function parse(props) {
  let result = {};

  Object.keys(STYLES)
    .forEach(key => {
      const sortedByProp = props
        .filter(item => item.values[key])
        .sort(function(a, b) {
          return (a.values[key] < b.values[key]) ? -1 : (a.values[key] > b.values[key]) ? 1 : 0;
        });

      let modifier = '';
      let value = null;
      let count = 0;

      // TODO dont works with just one variant
      for (let i = 0; i < sortedByProp.length; i++) {
        if (sortedByProp[i].variables && sortedByProp[i].variables[key]) {
          const variable = generateVariable(sortedByProp[i], key);

          result = { ...result, ...variable };

          continue;
        }

        if (!modifier.length) {
          modifier = sortedByProp[i].modifier;
        }

        // TODO add no value
        if (sortedByProp[i + 1]?.values[key] === sortedByProp[i]?.values[key]) {
          count += 1;

          if (!value) {
            value = sortedByProp[i].values[key];
          }

          // If exists next item with same value, we extends out modifier by new modifier
          if (sortedByProp[i + 1]?.modifier) {
            modifier = `${modifier},${sortedByProp[i + 1].modifier}`;
          }
        } else {
          // TODO this dont work properly
          if (count === sortedByProp.length - 1) {
            modifier =  sortedByProp[i].component ? `.${sortedByProp[i].component}` : '';
          }

          value = value || sortedByProp[i].values[key];

          if (value) {
            if (!result[modifier]) {
              result[modifier] = {};
            }

            result[modifier][key] = value;
          }

          modifier = '';
          count = 0;
          value = null;
        }
      }
    });

  return result;
}

function createCssFile(component, content) {
  fs.writeFile(`${component.toLowerCase()}.scss`, content, function (err) {
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

function collectProperties(variant, propsMap, modifier, component, child = '') {
  const childName = child.replace('$', '');
  const configData = child && CONFIG.components[component]?.children ? CONFIG.components[component]?.children[childName] : CONFIG.components[component];

  const variantData = {
    values: {},
  };

  Object.keys(BASE_STYLES_MAP)
    .filter(key => {
      if (!configData) {
        return true;
      }

      // TODO new method filter
      if (configData.exclude) {
        return !configData.exclude.includes(key);
      }

      if (configData.include) {
        return configData.include.includes(key);
      }

      return true;
    })
    .forEach((css) => {
      const data = BASE_STYLES_MAP[css];
      const iconInside = variant.children?.find(item => item.type === 'VECTOR');
      let figmaValue = data.collector(variant);

      if (css === 'color' && iconInside) {
        figmaValue = data.collector(iconInside);
      }

      if (figmaValue) {
        const units = data.units ? data.units : '';

        variantData.values[css] = `${figmaValue}${units}`;
      }
    });

  const textChild = variant.children?.find(item => item.type === 'TEXT' && item.name === 'text');

  if (textChild) {
    Object.entries(FONT_STYLES_MAP).forEach(([css, data]) => {
      const figmaValue = data.collector(textChild);

      if (figmaValue) {
        const units = data.units ? data.units : '';

        variantData.values[css] = `${figmaValue}${units}`;
      }
    });
  }

  variantData.modifier = modifier;

  if (configData && configData.variables) {
    variantData.variables = configData.variables;
  }

  if (child) {
    variantData.component = child;
  }

  propsMap.push(variantData);
}

// Getting all
getFiles(`https://api.figma.com/v1/files/${FIGMA_FILE}`);

function createMixin(data, component) {
  let result = '';
  let baseStyles = '';
  let variables = '';

  Object.keys(data).forEach(key => {
    if (key.startsWith('$')) {
      variables += `${key}: ${data[key]};\n`;

      return;
    }

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

      console.log(part);
      part = part.startsWith('$') ? `.${part}` : `&${part}`;
      part = part.replace('$', 'iw-');


      keyString += keyParts.length !== index + 1 ? `${spaces}${part},\n` : `${spaces}${part}`;
    });


    if (key !== '') {
    result += `
${keyString} {
${props}
  }\n`
    }
  });

  return `// ${component} // -----------------------------
${variables}
@mixin ${component.toLowerCase()} {
${baseStyles}
${result}
}`
}