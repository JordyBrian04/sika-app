/**
 * CircularProgressBar — implémentation SVG (react-native-svg).
 *
 * Remplace l'ancienne version Skia qui nécessitait NitroModules (dev build uniquement).
 * react-native-svg fonctionne en Expo Go et en dev build.
 */

import { FONT_FAMILY } from "@/src/theme/fonts";
import { useAppTextColor } from "@/src/utils/colos";
import { useMemo } from "react";
import { Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { COLORS } from "./ui/color";

type Props = {
  radius: number;
  strokeWidth: number;
  /** Valeur affichée en texte (0-100) */
  percentage: number;
  /** Fraction de l'arc coloré (0-1) */
  end: number;
};

const CircularProgressBar = ({ radius, strokeWidth, percentage, end }: Props) => {
  const color = useAppTextColor();
  const size = radius * 2;

  // Rayon du cercle SVG (centré dans le viewBox, réduit du stroke pour ne pas dépasser)
  const innerRadius = radius - strokeWidth / 2;
  const circumference = useMemo(() => 2 * Math.PI * innerRadius, [innerRadius]);

  // Sécurisation des valeurs pour éviter NaN / Infinity (division par zéro dans les stats)
  const safeEnd = Number.isFinite(end) ? Math.max(0, Math.min(1, end)) : 0;
  const safePercentage = Number.isFinite(percentage)
    ? Math.max(0, Math.min(100, percentage))
    : 0;

  // dashoffset : 0 = arc complet, circumference = arc vide
  const strokeDashoffset = circumference * (1 - safeEnd);

  // Taille du texte central selon le rayon (correspond à l'ancienne logique)
  const fontSize = radius === 70 ? 28 : radius === 80 ? 32 : 20;
  const textTop = radius === 70 ? 50 : radius === 80 ? 60 : 30;
  const textLeft = radius === 70 ? 40 : radius === 80 ? 45 : 30;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        {/* Arc de fond (gris foncé) */}
        <Circle
          cx={radius}
          cy={radius}
          r={innerRadius}
          stroke="#333438"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Arc de progression (vert) — rotation -90° pour partir du haut */}
        <Circle
          cx={radius}
          cy={radius}
          r={innerRadius}
          stroke={COLORS.green}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${radius}, ${radius}`}
        />
      </Svg>

      {/* Texte central en position absolue */}
      <View
        style={{
          position: "absolute",
          top: textTop,
          left: textLeft,
        }}
      >
        <Text
          style={{
            color,
            fontSize,
            fontFamily: FONT_FAMILY.bold,
          }}
        >
          {Math.round(safePercentage)}%
        </Text>
      </View>
    </View>
  );
};

export default CircularProgressBar;
