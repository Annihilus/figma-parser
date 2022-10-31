import fetch from 'node-fetch';
import * as fs from 'fs';
import {
  collectAlign,
  collectBackground,
  collectBorder,
  collectBorderRadius,
  collectColor,
  collectPadding,
  collectShadow,
  collectTransition,
  collectDirection,
  collectWidth,
  collectHeight,
  collectTextTransform,
} from './utils/collect.js';

// const FIGMA_FILE = 'o2EFM7hYM1rHlK4N7Kftdt'; // Testing
const FIGMA_FILE = 'BgEHpami4zAtOXq6UJGoiE'; // My lib
// const FIGMA_FILE = 'HKGl7xfTcxukryFvKIUJJ8'; // IW
const FIGMA_TOKEN = 'figd_WaKB3m_aRA1hUETzvit5GOn7ir9EfEssbH5NT-La'; // MyToken
// const FIGMA_TOKEN = 'figd_ARCGHU5g0FIXtqOTjClda2IqkHmFoWzoCBAAf3GQ';

const STATES = ['hover', 'disabled', 'readonly'];

const HTML_ELEMENTS = ['input'];
const HTML_SUBELEMENTS = ['placeholder'];

const CONFIG = {
  components: {
    Notifications: {
    },
    Button: {
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
    ButtonToggle: {
      children: {
        ignore: true,
      }
    },
    Label: {
      children: {
        required: {
          exclude: ['width', 'height', 'padding', 'background'],
        },
      },
    },
    Radiobutton: {
      statesAsClass: ['disabled'],
      children: {
        icon: {
          include: ['width', 'height', 'color'],
        }
      }
    },
    RadiobuttonGroup: {
      exclude: ['width', 'height'],
      children: {
        Radiobutton: {
          ignore: true,
        },
        RadiobuttonLabel: {
          ignore: true,
        }
      }
    },
    RadiobuttonLabel: {
      exclude: ['width', 'height'],
      children: {
        ignore: true,
      }
    },
    Input: {
      children: {
        placeholder: {
          include: ['color'],
        },
        platformEye: {
          include: ['width', 'height', 'color'],
        },
        platformCross: {
          include: ['width', 'height', 'color'],
        },
        platformKey: {
          include: ['width', 'height', 'color'],
        },
      },
    },
    Checkbox: {
      statesAsClass: ['disabled', 'readonly'],
      children: {
        icon: {
          include: ['color'],
        },
        element: {
          include: ['color'],
        }
      }
    },
    CheckboxLabel: {
      exclude: ['width', 'height'],
      children: {
        ignore: true,
      }
    },
    CheckboxGroup: {
      exclude: ['width', 'height'],
      children: {
        ignore: true,
      },
    },
    HintedElement: {
      exclude: ['width', 'height'],
      children: {
        ignore: true,
      }
    },
    HelperText: {
      exclude: ['width', 'height'],
    },
    Popover: {},
    FormBlock: {
      exclude: ['width', 'height'],
      children: {
        title: {
          exclude: ['width'],
        },
        content: {
          exclude: ['width', 'height'],
        },
        row: {
          ignore: true,
        }
      },
    },
    FormRow: {
      children: {
        HintedElement: {
          ignore: true,
        },
        Input: {
          ignore: true,
        },
      },
    },
    Select: {
      statesAsClass: ['disabled'],
    },
    Dropdown: {
      children: {
        list: {
          ignore: true,
        },
        input: {
          ignore: true,
        }
      },
    },
    DropdownItem: {},
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
  'text-transform': {
    collector: (variant) => collectTextTransform(variant),
  },
  'color': {
    collector: collectColor,
  }
}

const BASE_STYLES_MAP = {
  'width': {
    collector: (variant, parent) => collectWidth(variant, parent),
  },
  'height': {
    collector: (variant, parent) => collectHeight(variant, parent),
  },
  'padding': {
    collector: collectPadding,
  },
  'border': {
    collector: collectBorder,
  },
  'border-radius': {
    collector: collectBorderRadius,
  },
  'background': {
    collector: collectBackground,
  },
  'align-items': {
    collector: (variant) => collectAlign(variant.counterAxisAlignItems, 'vertical'),
  },
  'justify-content': {
    collector: (variant) => collectAlign(variant.primaryAxisAlignItems, 'horizontal'),
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
  },
  'flex-direction': {
    collector: (variant) => collectDirection(variant),
  },
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
      console.log('STYLES:', data.styles);
      stylesPath = getStylesPath(data.styles);
      components = data.document;
    });

  // Parsing components
  collectComponents(components)
    .filter(component => CONFIG.components[component.name.replace(/\s/g, "")])
    .forEach(component => {
      createCssFile(component.name, parseComponent(component));
    });
}

function collectComponents(data, componentSets = []) {
  if (data.children) {
    data.children.forEach(child => {
      if (child.type === 'COMPONENT_SET') {
        componentSets.push(child);
      } else if (child.children) {
        collectComponents(child, componentSets);
      }
    });
  }

  return componentSets;
}

function collectChildren(variant, children, modifier, component) {
  variant.children
    .filter(child => !CONFIG.components[component]?.children || !CONFIG.components[component]?.children[child.name]?.ignore)
    .forEach(child => {
      if (child.name !== 'text' && child.visible !== false) {
        let childName = child.name.startsWith('$') ? child.name.split('-')[0].replace('$', 'iw-') : child.name;
        const isHtmlElement = HTML_ELEMENTS.includes(childName);
        let prefix = !isHtmlElement ? '.' : '';

        // If child is an icon
        if (child.type === 'VECTOR' || child.name.toUpperCase() === 'VECTOR') {
          prefix = '';
          childName = '';
        }

        let childModifier = modifier.length ? `${modifier} ${prefix}${childName}` : `${prefix}${childName}`;

        // if (HTML_SUBELEMENTS.includes(childName)) {
        //   childModifier = `${modifier}::placeholder`;
        // }

        collectProperties(child, children, childModifier, component, childName, variant);

        if (child.children) {
          collectChildren(child, children, childModifier, component);
        }
      }
    });
}

function parseComponent(component) {
  const propsMap = [];

  component.children.forEach(variant => {
    const modifier = getModifier(variant.name, component.name);

    collectProperties(variant, propsMap, modifier, component.name);

    const ignore = CONFIG.components[component.name] && CONFIG.components[component.name].children?.ignore;

    if (variant.children && !ignore) {
      collectChildren(variant, propsMap, modifier, component.name);
    }
  });

  const mixin = createMixin(parse(propsMap), component.name);

  return mixin;
}

function generateVariable(data, prop) {
  const modifierParts = data.modifier.split('.');
  let variable = '';

  data.variables[prop].forEach(item => {
    const part = modifierParts.find(i => i.startsWith(item.toLowerCase()));

    if (part.length) {
      variable += variable.length ? `_${part}` : `$${part}`;
    }
  });

  if (data.component) {
    variable += `__${data.component}`;
  }

  return { [variable]: data.values[prop] };
}

function createModifierProp(result, options) {
  if (!result[options.modifier]) {
    result[options.modifier] = {};
  }

  result[options.modifier][options.key] = options.value;
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

      sortedByProp.forEach((item, index) => {
        //  Generating variable instead of mixin
        if (item.variables && item.variables[key]) {
          const variable = generateVariable(item, key);

          result = { ...result, ...variable };
        }

        const currentValue = item.values[key];
        const nextValue = sortedByProp[index + 1]?.values[key];

        const root = item.element || item.component || '';

        // Optimize
        // Adding only not equal to default values
        if (result[root] && result[root][key] === currentValue) {
          return;
        }

        const isRoot = !item.modifier.length && item.component === null;

        // Root modifier
        // Setting host properties
        if (isRoot) {
          modifier = '';
          createModifierProp(result, { modifier, key, value: currentValue });

          return;
        }

        if (!modifier.length) {
          modifier = item.modifier;
        } else {
          modifier += `,${item.modifier}`;
        }

        if (currentValue !== nextValue) {
          createModifierProp(result, { modifier, key, value: currentValue });

          modifier = '';
        }
      });
    });

  return result;
}

function createCssFile(component, content) {
  fs.writeFile(`./figma-parsed/${component.toLowerCase()}.scss`, content, function (err) {
    if (err) throw err;
    console.log(`${component} scss mixin file is created successfully.`);
  });
}

function getModifier(variantName, componentName) {
  const result = variantName
    .split(', ')
    .map(item => item.split('=').map(i => lowerCaseFirstLetter(i)))
    .filter(([ , value ]) => value !== 'false')
    .map(([ key, value ]) => {
      const prefix = getPrefix(key, componentName);

      return value === 'true' ? prefix + key : `${prefix}${key}-${value}`;
    })
    .join('');

  return result.length ? `&${result}` : '';
}

function getPrefix(key, component) {
  return STATES.includes(key) && !CONFIG?.components[component]?.statesAsClass?.includes(key) ? ':' : '.';
}

function filterByConfig(key, config) {
  if (!config) {
    return true;
  }

  if (config.exclude) {
    return !config.exclude.includes(key);
  }

  if (config.include) {
    return config.include.includes(key);
  }

  return true;
}

function collectBlockProperties(config, variant, parent) {
  const values = {};

  Object.keys(BASE_STYLES_MAP)
    .filter(key => filterByConfig(key, config))
    .forEach((css) => {
      const data = BASE_STYLES_MAP[css];
      const iconInside = variant.children?.find(item => item.type === 'VECTOR' || item.name.toUpperCase() === 'VECTOR');
      let figmaValue = data.collector(variant, parent);

      if (variant.type === 'VECTOR' && css === 'background') {
        figmaValue = 'none';
      }

      if (css === 'color' && iconInside) {
        figmaValue = data.collector(iconInside);
      }

      if (figmaValue || figmaValue === 0) {
        const units = data.units ? data.units : '';

        values[css] = `${figmaValue}${units}`;
      }
    });

  return values;
}

function collectFontProperties(variant) {
  const values = {};

  Object.entries(FONT_STYLES_MAP).forEach(([css, data]) => {
    const figmaValue = data.collector(variant);

    if (figmaValue) {
      const units = data.units ? data.units : '';

      values[css] = `${figmaValue}${units}`;
    }
  });

  return values;
}

function collectProperties(variant, propsMap, modifier, component, child = null, parent) {
  const childName = child?.replace('$', '');
  const config = child && CONFIG.components[component]?.children ? CONFIG.components[component]?.children[childName] : CONFIG.components[component];
  const isHtmlElement = HTML_ELEMENTS.includes(child);

  const variantData = {
    values: {},
    modifier,
    component: !isHtmlElement ? child : null,
    element: isHtmlElement ? child : null,
    variables: config?.variables ? config.variables : null,
  };

  if (variant.type !== 'TEXT') {
    variantData.values = collectBlockProperties(config, variant, parent);

    const textChild = variant.children?.find(item => item.type === 'TEXT' && item.name === 'text');

    // Add font properties if have text inside
    if (textChild) {
      variantData.values = { ...variantData.values, ...collectFontProperties(textChild)};
    }
  } else {
    variantData.values = collectFontProperties(variant);
  }

  const exists = propsMap.find(item => item.modifier === modifier);

  if (!exists) {
    propsMap.push(variantData);
  }
}

// Getting all
getFiles(`https://api.figma.com/v1/files/${FIGMA_FILE}`);

function createMixin(data, component) {
  let result = '';
  let baseStyles = '';
  let variables = '';

  Object.keys(data).forEach(key => {
    // TODO another key for icons
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

      part = part.startsWith('iw-') ? `.${part}` : part;


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
@mixin ${lowerCaseFirstLetter(component)} {
${baseStyles}
${result}
}`
}

function lowerCaseFirstLetter(string) {
  return string.charAt(0).toLowerCase() + string.slice(1);
}