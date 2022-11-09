import { colorToRgba } from './color.js';
import { figmaStyles } from './styles.js';

const TEXT_TRANSFORM = {
  UPPER: 'uppercase',
  LOWER: 'lowercase',
}

const POSITIONS_VERTICAL = {
  MAX: 'flex-end',
  CENTER: 'center',
  default: 'flex-start',
}

const POSITIONS_HORIZONTAL = {
  MAX: 'flex-end',
  CENTER: 'center',
  default: 'flex-start',
}

const DIRECTION = {
  VERTICAL: 'column',
  HORIZONTAL: 'row',
}

export function collectWidth(variant, parent) {
  const source = variant.layoutAlign === 'INHERIT' ? parent ? parent : variant : variant;
  let axis = '';

  if (source.layoutMode === 'VERTICAL') {
    axis = source.counterAxisSizingMode || variant.counterAxisSizingMode;
  } else {
    axis = source.primaryAxisSizingMode || variant.primaryAxisSizingMode;
  }

  if (source.layoutAlign === 'STRETCH') {
    return '100%';
  }

  if (axis === 'FIXED') {
    return `${variant.absoluteBoundingBox.width}px`;
  }

  return 'auto';
}

export function collectHeight(variant, parent) {
  const source = variant.layoutAlign === 'INHERIT' ? parent ? parent : variant : variant;

  let axis = '';

  if (source.layoutMode === 'VERTICAL') {
    axis = source.primaryAxisSizingMode || variant.primaryAxisSizingMode;
  } else {
    axis = source.counterAxisSizingMode || variant.counterAxisSizingMode;
  }

  if (axis === 'FIXED') {
    return `${variant.absoluteBoundingBox.height}px`;
  }

  return 'auto';
}

export function collectBorderColor(variant) {
  if (!variant.strokes.length) {
    return 'none';
  }

  let color = colorToRgba(variant.strokes[0].color);

  if (variant.styles?.strokes) {
    color = figmaStyles.getStylesById(variant.styles.strokes).variables[0].name;
  }

  return color;
}

export function collectBorderStyle(variant) {
  if (!variant.strokes.length) {
    return 'none';
  }

  return variant.strokes[0].type.toLowerCase();
}

export function collectBorderWidth(variant) {
  if (!variant.strokes.length) {
    return '0';
  }

  if (variant.individualStrokeWeights) {
    return Object.values(variant.individualStrokeWeights).join('px ');
  }

  return `${variant.strokeWeight || 0}px`;
}

export function collectBorderRadius(variant) {
  if (!variant.cornerRadius && variant.rectangleCornerRadii) {
    return variant.rectangleCornerRadii.map(i => `${i}px`).join(' ');
  }

  const result = variant.cornerRadius ? `${variant.cornerRadius}px` : 0;

  return result;
}

export function collectBackground(variant) {
  if (variant.styles?.fills) {
    const variable = figmaStyles.getStylesById(variant.styles.fills).variables[0].name;

    return variable;
  }

  if (variant.fills && variant.fills.length) {
    const bg = variant.fills[0];

    if (bg.type === 'SOLID') {
      return colorToRgba(bg.color);
    }
  }

  return 'transparent';
}

export function collectColor(variant) {
  if (variant.styles?.fill) {
    const variable = figmaStyles.getStylesById(variant.styles.fill).variables[0].name;

    return variable || null;
  }

  if (variant.fills && variant.fills.length) {
    const color = variant.fills[0].color;

    return colorToRgba(color);
  }

  return null;
}

export function collectShadow(variant) {
  if (!variant.effects.length) {
    return 'none';
  }

  const shadow = variant.effects[0];
  const type = shadow.type === 'INNER_SHADOW' ? 'inset' : '';

  return `${shadow.offset.x}px ${shadow.offset.y}px ${shadow.radius}px ${type} ${colorToRgba(shadow.color)}`;
}

export function collectPadding(variant) {
  return `${variant.paddingTop || 0}px ${variant.paddingRight || 0}px ${variant.paddingBottom || 0}px ${variant.paddingLeft || 0}px`;
}

export function collectTransition(variant) {
  if (!variant.transitionDuration) {
    return null;
  }

  return `all ${variant.transitionDuration}ms ${variant.transitionEasing.toLowerCase().replace('_', '-')}`;
}

export function collectAlign(value, direction) {
  if (direction === 'vertical') {
    return POSITIONS_VERTICAL[value] || POSITIONS_VERTICAL.default;
  }

  return POSITIONS_HORIZONTAL[value] || POSITIONS_HORIZONTAL.default;
}

export function collectDirection(value) {
  return DIRECTION[value.layoutMode];
}

export function collectTextTransform(variant) {
  const value = variant.style?.textCase;

  if (value) {
    return TEXT_TRANSFORM[value] || null;
  }

  return null;
}
