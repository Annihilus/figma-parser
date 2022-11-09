import fetch from 'node-fetch';
import * as fs from 'fs';
import {
  collectColor,
} from './utils/collect.js';
import {
  FONT_STYLES_MAP,
  BASE_STYLES_MAP,
  STYLES,
} from './utils/maps.js';
import { figmaStyles } from './utils/styles.js';
import { colorToRgba } from './utils/color.js';

// const FIGMA_FILE = 'o2EFM7hYM1rHlK4N7Kftdt'; // Testing
// const FIGMA_FILE = 'BgEHpami4zAtOXq6UJGoiE'; // My lib
const FIGMA_FILE = 'HKGl7xfTcxukryFvKIUJJ8'; // IW
// const FIGMA_TOKEN = 'figd_WaKB3m_aRA1hUETzvit5GOn7ir9EfEssbH5NT-La'; // MyToken
const FIGMA_TOKEN = 'figd_ARCGHU5g0FIXtqOTjClda2IqkHmFoWzoCBAAf3GQ'; // IW TOKEN

const STATES = ['hover', 'disabled', 'readonly'];

const HTML_ELEMENTS = ['input'];
const HTML_SUBELEMENTS = ['placeholder'];

const CONFIG = {
  components: {
    // Notifications: {},
    // NotificationsSet: {},
    // Button: {
    //   children: {
    //     spinner: {
    //       include: ['width', 'height', 'color', 'padding'],
    //       variables: {
    //         color: ['type'],
    //       },
    //     },
    //     icon: {
    //       include: ['width', 'height', 'color'],
    //     }
    //   }
    // },
    // ButtonToggle: {
    //   children: {
    //     ignore: true,
    //   }
    // },
    // Label: {
    //   children: {
    //     required: {
    //       exclude: ['width', 'height', 'padding', 'background'],
    //     },
    //   },
    // },
    // Radiobutton: {
    //   statesAsClass: ['disabled'],
    //   children: {
    //     icon: {
    //       include: ['width', 'height', 'color'],
    //     }
    //   }
    // },
    // RadiobuttonGroup: {
    //   exclude: ['width', 'height'],
    //   children: {
    //     Radiobutton: {
    //       ignore: true,
    //     },
    //     RadiobuttonLabel: {
    //       ignore: true,
    //     }
    //   }
    // },
    // RadiobuttonLabel: {
    //   exclude: ['width', 'height'],
    //   children: {
    //     ignore: true,
    //   }
    // },
    // Input: {
    //   children: {
    //     placeholder: {
    //       include: ['color'],
    //     },
    //     platformEye: {
    //       include: ['width', 'height', 'color'],
    //     },
    //     platformCross: {
    //       include: ['width', 'height', 'color'],
    //     },
    //     platformKey: {
    //       include: ['width', 'height', 'color'],
    //     },
    //   },
    // },
    // Checkbox: {
    //   statesAsClass: ['disabled', 'readonly'],
    //   children: {
    //     icon: {
    //       include: ['color'],
    //     },
    //     element: {
    //       include: ['color'],
    //     }
    //   }
    // },
    // CheckboxLabel: {
    //   exclude: ['width', 'height'],
    //   children: {
    //     ignore: true,
    //   }
    // },
    // CheckboxGroup: {
    //   exclude: ['width', 'height'],
    //   children: {
    //     ignore: true,
    //   },
    // },
    // HintedElement: {
    //   exclude: ['width', 'height'],
    //   children: {
    //     ignore: true,
    //   }
    // },
    // HelperText: {
    //   exclude: ['width', 'height'],
    // },
    // Popover: {},
    // FormBlock: {
    //   exclude: ['width', 'height'],
    //   children: {
    //     title: {
    //       exclude: ['width'],
    //     },
    //     content: {
    //       exclude: ['width', 'height'],
    //     },
    //     row: {
    //       ignore: true,
    //     }
    //   },
    // },
    // FormRow: {
    //   children: {
    //     HintedElement: {
    //       ignore: true,
    //     },
    //     Input: {
    //       ignore: true,
    //     },
    //   },
    // },
    Select: {
      statesAsClass: ['disabled'],
      children: {
        MultiselectItem: {
          ignore: true,
        }
      }
    },
    SelectDropdown: {
      children: {
        list: {
          children: {
            ignore: true,
          },
        },
        input: {
          ignore: true,
        }
      },
    },
    SelectItem: {},
    // MultiselectItem: {},
    // Modal: {
    //   variables: {
    //     gap: [''],
    //   },
    //   children: {
    //     ignore: true,
    //   },
    // },
    // ModalHeader: {},
    // ModalFooter: {
    //   children: {
    //     ignore: true,
    //   }
    // },
    // Toggle: {
    //   statesAsClass: ['disabled'],
    // },
  },
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

  return `https://api.figma.com/v1/files/${FIGMA_FILE}/nodes?ids=${ids}`;
}

async function getFiles(path) {
  let stylesPath = [];
  let components;

  // Collecting all data from firma file
  await fetchFigma(path)
    .then(data => {
      stylesPath.push(getStylesPath(data.styles));
      components = data.document;
    });

  await fetchFigma(stylesPath)
    .then(data => {
      figmaStyles.styles = data;
      createCssFile('styles', generateStylesFile(figmaStyles.styles));
    });

  // Parsing components
  collectComponents(components)
    .filter(component => CONFIG.components[component.name.replace(/\s/g, "")])
    .forEach(component => {
      createCssFile(component.name, parseComponent(component));
    });
}

function generateStylesFile(data) {
  let string = '';

  Object.values(data)
    .sort(function(a, b) {
      return (a.variables.length > b.variables.length) ? 1 : ((b.variables.length > a.variables.length) ? -1 : 0)
    })
    .forEach(params => {
      if (params.variables.length === 1) {
        const value = params.variables[0];
        string += `${value.name}: ${value.value};\n`;
      } else if (params.variables.length > 1) {
        let props = '';
        const postfix = !string.length ? '\n' : '';

        if (string.length) {
          string += '\n';
        }

        params.variables.forEach((item, index) => {
          const postfix = params.variables.length - 1 === index ? '' : '\n';
          props += `  ${item.prop}: ${item.value};${postfix}`
        });

        string += `@mixin ${params.name} {
${props}
}\n${postfix}`
      }
    });

  return string;
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

  // console.log(propsMap);

  const mixin = createMixin(parse(propsMap, component.name), component.name);

  return mixin;
}

function generateVariable(data, prop, component) {
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

  if (!variable) {
    variable = `$${component.toLowerCase()}`;
  }

  variable += `_${prop}`;

  return { [variable]: data.values[prop] };
}

function createModifierProp(result, options) {
  if (!result[options.modifier]) {
    result[options.modifier] = {};
  }

  result[options.modifier][options.key] = options.value;
}

function parse(props, component) {
  let result = {};

  Object.keys(STYLES)
    .forEach(key => {
      const sortedByProp = props
        .filter(item => item.values[key])
        .sort(function(a, b) {
          return (a.values[key] < b.values[key]) ? -1 : (a.values[key] > b.values[key]) ? 1 : 0;
        });

      let modifier = '';

      let count = 0;

      sortedByProp.forEach((item, index) => {
        //  Generating variable instead of mixin
        if (item.variables && item.variables[key]) {
          const variable = generateVariable(item, key, component);

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
          // If property a same in all variants set value to default modifier
          // if (count === sortedByProp.length - 1) {
          //   modifier = '';
          // }

          createModifierProp(result, { modifier, key, value: currentValue });

          modifier = '';
          count = 0;
        } else {
          count += 1;
        }
      });
    });

  return result;
}

function createCssFile(component, content) {
  const importStyles = '@import "./styles.scss";\n\n';
  const result = component === 'styles' ? content : importStyles + content;

  fs.writeFile(`./figma-parsed/${component.toLowerCase()}.scss`, result, function (err) {
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

      let figmaValue = data.collector(variant, parent, variant.styles);

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

  Object.entries(FONT_STYLES_MAP)
    .forEach(([css, data]) => {
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
      if (textChild.styles?.text) {
        const styleId = textChild.styles?.text;
        const variableName = styleId ? figmaStyles.getStylesById(styleId).name : null;

        if (variableName !== null) {
          variantData.values['mixin'] = figmaStyles.getStylesById(styleId).name;
        }
      } else {
        variantData.values = { ...variantData.values, ...collectFontProperties(textChild)};
      }
      // Getting text color
      variantData.values.color = BASE_STYLES_MAP.color.collector(textChild);
    }
  } else {
    const styleId = variant.styles.text;
    const textStyles = styleId ? figmaStyles.getStylesById(styleId) : null;

    if (textStyles !== null) {
      variantData.values['mixin'] = figmaStyles.getStylesById(styleId).name;
    } else {
      variantData.values = collectFontProperties(variant);
    }
  }

  const exists = propsMap.find(item => item.modifier === modifier);

  if (!exists) {
    propsMap.push(variantData);
  }
}

// Getting all
getFiles(`https://api.figma.com/v1/files/${FIGMA_FILE}`);

function createFontMixin() {

}

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
      let result = '';

      if (prop === 'mixin') {
        result = `${spaces}@include ${value};${postfix}`;
      } else {
        result = `${spaces}${prop}: ${value};${postfix}`;
      }


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

  return `${variables}
// ${component} // -----------------------------
@mixin ${lowerCaseFirstLetter(component)} {
${baseStyles}
${result}
}`
}

function lowerCaseFirstLetter(string) {
  return string.charAt(0).toLowerCase() + string.slice(1);
}