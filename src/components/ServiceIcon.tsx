"use client";

import {
  WashingMachine,
  Refrigerator,
  Wine,
  CupSoda,
  Flame,
  CookingPot,
  Coffee,
  Blend,
  ChefHat,
  Zap,
  Scissors,
  Wind,
  Sparkles,
  Hammer,
  Construction,
  Droplet,
  Fan,
  Radio,
  Bike,
  Cpu,
  Sun,
} from "lucide-react";

const iconMap: Record<string, React.ElementType> = {
  WashingMachine,
  Refrigerator,
  Wine,
  CupSoda,
  Flame,
  CookingPot,
  Coffee,
  Blender: Blend,
  ChefHat,
  Zap,
  Scissors,
  Wind,
  Sparkles,
  Hammer,
  Construction,
  Droplet,
  Fan,
  Radio,
  Bike,
  Cpu,
  Sun,
};

interface ServiceIconProps {
  iconName: string;
  className?: string;
  style?: React.CSSProperties;
}

export function ServiceIcon({ iconName, className = "h-6 w-6", style }: ServiceIconProps) {
  const Icon = iconMap[iconName] || Zap;
  return <Icon className={className} style={style} />;
}
