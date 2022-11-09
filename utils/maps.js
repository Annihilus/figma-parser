import {
  collectAlign,
  collectBackground,
  collectBorderStyle,
  collectBorderColor,
  collectBorderWidth,
  collectBorderRadius,
  collectColor,
  collectPadding,
  collectShadow,
  collectTransition,
  collectDirection,
  collectWidth,
  collectHeight,
  collectTextTransform,
} from './collect.js';

export const FONT_STYLES_MAP = {
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
}

export const BASE_STYLES_MAP = {
  'width': {
    collector: (variant, parent) => collectWidth(variant, parent),
  },
  'height': {
    collector: (variant, parent) => collectHeight(variant, parent),
  },
  'padding': {
    collector: collectPadding,
  },
  'border-style': {
    collector: collectBorderStyle,
  },
  'border-color': {
    collector: collectBorderColor,
  },
  'border-width': {
    collector: collectBorderWidth,
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

export const STYLES = {
  ...BASE_STYLES_MAP,
  ...FONT_STYLES_MAP,
  'mixin': {},
}