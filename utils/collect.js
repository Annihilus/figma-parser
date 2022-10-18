import { colorToRgba } from './color.js';

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

export function collectWidth(variant) {
  console.log(variant);
  // if (variant.primaryAxisSizingMode === 'FIXED') {
    return `${variant.absoluteBoundingBox.width}px`;
  // }

  return 'auto';
}

export function collectHeight(variant) {
  // if (variant.counterAxisSizingMode === 'FIXED') {
    return `${variant.absoluteBoundingBox.height}px`;
  // }

  return 'auto';
}

export function collectBorder(variant) {
  if (!variant.strokes.length) {
    return 'none';
  }

  const color = colorToRgba(variant.strokes[0].color);
  const type = variant.strokes[0].type.toLowerCase();

  return `${variant.strokeWeight}px ${type} ${color}`;
}

export function collectBorderRadius(variant) {
  if (!variant.cornerRadius && variant.rectangleCornerRadii) {
    return variant.rectangleCornerRadii.map(i => `${i}px`).join(' ');
  }

  const result = variant.cornerRadius ? `${variant.cornerRadius}px` : 0;

  return result;
}

export function collectBackground(variant) {
  if (variant.fills && variant.fills.length) {
    const bg = variant.fills[0];

    if (bg.type === 'SOLID') {
      return colorToRgba(bg.color);
    }
  }

  return 'transparent';
}

export function collectColor(variant) {
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
