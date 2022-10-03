import { colorToRgba } from './color.js';

const POSITIONS = {
  MAX: 'bottom',
  CENTER: 'center',
}

export function collectBorder(variant) {
  if (!variant.strokes.length) {
    return 'none';
  }

  const color = colorToRgba(variant.strokes[0].color);
  const type = variant.strokes[0].type.toLowerCase();

  return `${variant.strokeWeight}px ${type} ${color}`;
}

export function collectBackground(variant) {
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

export function collectColor(variant) {
  // const icon = variant.children?.find(i => i.type === 'INSTANCE' && i.name.startsWith('$icon'));

  // if (icon) {
  //   const color = icon.children[0].fills[0].color;

  //   return colorToRgba(color);
  // }



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

export function collectAlign(value, defaultValue) {
  return POSITIONS[value] ? POSITIONS[value] : defaultValue;
}