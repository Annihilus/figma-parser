import { collectColor } from "./collect.js";
import { FONT_STYLES_MAP } from "./maps.js";

class figmaStylesClass {
  _styles = {};

  set styles(data) {
    this._styles = this._parseStyles(data);
  }

  get styles() {
    return this._styles;
  }

  constructor () {}

  getStylesById(id) {
    return this._styles[id];
  }

  _parseStyles(data) {
    const result = {};

    Object.entries(data.nodes).forEach(([key, value]) => {
      const params = value.document;
      let name = params.name.toLowerCase().split('/').join('-').replace(/\s/g, "");
      const variables = [];

      if (params.type === 'TEXT') {
        Object.entries(FONT_STYLES_MAP).forEach(([css, value]) => {
          variables.push({
            name: `$${name}-${css}`,
            value: `${value.collector(params)}${value.units ? value.units : ''}`,
            prop: css,
          })
        });

        name += '-text';
      } else {
        variables.push({
          name: `$${name}-color`,
          value: collectColor(params),
        });
      }

      result[key] = {
        name,
        variables,
      }
    });

    return result;
  }
}

export const figmaStyles = new figmaStylesClass();
