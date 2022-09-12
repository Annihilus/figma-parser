import { colorToRgba } from './color.js';

function convertToDegree(matrix) {
    console.log(matrix);
  const values = [...matrix[0], ...matrix[1]];
  const a = values[0];
  const b = values[1];
  const angle = Number(((Math.atan2(b, a) * (180 / Math.PI)) + 90).toFixed(2));

  return angle <= 0 ? angle + 360 : angle;
}

function getDegreeForMatrix(matrix) {
  const degrees = convertToDegree(matrix) || 0;
  return `${degrees}deg`;
}

function getGradientStopByAlpha(color) {
//   if (color.a == 1) {
    // return rgbToHex(color.r, color.g, color.b);
//   } else {
    return colorToRgba(color, color.a);
//   }
}

function getGradientStop(stops) {
  const colors = stops.map( stop => {
    const position = Math.round(stop.position * 100 * 100) / 100
    const color = getGradientStopByAlpha(stop.color);
    return color + ' ' + position + '%';
  }).join(',\n');
  return colors
}

export function cssGradient(paint) {
  const { gradientHandlePositions, gradientStops } = paint;

  const matrix = [
    [
      gradientHandlePositions[0].x,
      gradientHandlePositions[1].x,
      gradientHandlePositions[2].x,
    ],
    [
      gradientHandlePositions[0].y,
      gradientHandlePositions[1].y,
      gradientHandlePositions[2].y,
    ]
  ]

  const gradientTransformString = getDegreeForMatrix(matrix);
  const gradientStopString = getGradientStop(gradientStops)

  return `linear-gradient( ${gradientTransformString},\n${gradientStopString})`;
}
