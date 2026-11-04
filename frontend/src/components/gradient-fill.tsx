import { useId } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

type GradientStop = { offset: number; color: string; opacity?: number };

type GradientFillProps =
  | {
      kind: 'radial';
      stops: GradientStop[];
      /** Centre, as fractions of the box (CSS `at 50% 38%` = { x: 0.5, y: 0.38 }). */
      center?: { x: number; y: number };
      /** Radii as fractions of the box (CSS `120% 70%` = { x: 1.2, y: 0.7 }). */
      radius?: { x: number; y: number };
    }
  | { kind: 'linear'; stops: GradientStop[] };

/**
 * Fills its parent (absolutely positioned) with a gradient, drawn with
 * react-native-svg, which the app already uses, rather than adding a
 * gradient package for a handful of backgrounds.
 */
export function GradientFill(props: GradientFillProps) {
  const id = `gradient-${useId().replace(/:/g, '')}`;
  const stops = props.stops.map((stop) => (
    <Stop
      key={stop.offset}
      offset={stop.offset}
      stopColor={stop.color}
      stopOpacity={stop.opacity ?? 1}
    />
  ));
  return (
    <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        {props.kind === 'radial' ? (
          <RadialGradient
            id={id}
            cx={`${(props.center?.x ?? 0.5) * 100}%`}
            cy={`${(props.center?.y ?? 0.5) * 100}%`}
            rx={`${(props.radius?.x ?? 0.5) * 100}%`}
            ry={`${(props.radius?.y ?? 0.5) * 100}%`}
            fx={`${(props.center?.x ?? 0.5) * 100}%`}
            fy={`${(props.center?.y ?? 0.5) * 100}%`}
            gradientUnits="objectBoundingBox"
          >
            {stops}
          </RadialGradient>
        ) : (
          <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            {stops}
          </LinearGradient>
        )}
      </Defs>
      <Rect x={0} y={0} width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}

/** The warm glow behind the splash, analysing and ready screens. */
export function NightGlow({ center = { x: 0.5, y: 0.36 } }: { center?: { x: number; y: number } }) {
  return (
    <GradientFill
      kind="radial"
      center={center}
      radius={{ x: 1.2, y: 0.65 }}
      stops={[
        { offset: 0, color: '#2A2118' },
        { offset: 0.62, color: '#12110F' },
        { offset: 1, color: '#12110F' },
      ]}
    />
  );
}
