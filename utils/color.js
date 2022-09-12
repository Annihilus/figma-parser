export function colorToRgba(color) {
  if (!color) {
    return 'transparent';
  }

  return `rgba(${parseInt(color.r * 255, 0)}, ${parseInt(color.g * 255, 0)}, ${parseInt(color.b * 255, 0)}, ${color.a})`;
}