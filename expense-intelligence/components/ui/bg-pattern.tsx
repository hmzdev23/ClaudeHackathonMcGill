"use client"

import React from 'react';
import { cn } from '@/lib/utils';

type BGVariantType = 'dots' | 'diagonal-stripes' | 'grid' | 'horizontal-lines' | 'vertical-lines' | 'checkerboard';
type BGMaskType =
  | 'fade-center'
  | 'fade-edges'
  | 'fade-top'
  | 'fade-bottom'
  | 'fade-left'
  | 'fade-right'
  | 'fade-x'
  | 'fade-y'
  | 'fade-three-sides'
  | 'none';

type BGPatternProps = React.ComponentProps<'div'> & {
  variant?: BGVariantType;
  mask?: BGMaskType;
  size?: number;
  fill?: string;
};

// Single-gradient masks — use `black` (opaque, alpha=1) so mask-image alpha channel works correctly
const maskClasses: Partial<Record<BGMaskType, string>> = {
  'fade-center': '[mask-image:radial-gradient(ellipse_at_center,transparent,black)]',
  'fade-edges':  '[mask-image:radial-gradient(ellipse_at_center,black,transparent)]',
  'fade-top':    '[mask-image:linear-gradient(to_bottom,transparent,black)]',
  'fade-bottom': '[mask-image:linear-gradient(to_bottom,black,transparent)]',
  'fade-left':   '[mask-image:linear-gradient(to_right,transparent,black)]',
  'fade-right':  '[mask-image:linear-gradient(to_right,black,transparent)]',
  'fade-x':      '[mask-image:linear-gradient(to_right,transparent,black,transparent)]',
  'fade-y':      '[mask-image:linear-gradient(to_bottom,transparent,black,transparent)]',
  none: '',
};

function getBgImage(variant: BGVariantType, fill: string, size: number) {
  switch (variant) {
    case 'dots':
      return `radial-gradient(${fill} 1px, transparent 1px)`;
    case 'grid':
      return `linear-gradient(to right, ${fill} 1px, transparent 1px), linear-gradient(to bottom, ${fill} 1px, transparent 1px)`;
    case 'diagonal-stripes':
      return `repeating-linear-gradient(45deg, ${fill}, ${fill} 1px, transparent 1px, transparent ${size}px)`;
    case 'horizontal-lines':
      return `linear-gradient(to bottom, ${fill} 1px, transparent 1px)`;
    case 'vertical-lines':
      return `linear-gradient(to right, ${fill} 1px, transparent 1px)`;
    case 'checkerboard':
      return `linear-gradient(45deg, ${fill} 25%, transparent 25%), linear-gradient(-45deg, ${fill} 25%, transparent 25%), linear-gradient(45deg, transparent 75%, ${fill} 75%), linear-gradient(-45deg, transparent 75%, ${fill} 75%)`;
    default:
      return undefined;
  }
}

const BGPattern = ({
  variant = 'grid',
  mask = 'none',
  size = 24,
  fill = '#1a1a1a',
  className,
  style,
  ...props
}: BGPatternProps) => {
  const bgSize = `${size}px ${size}px`;
  const backgroundImage = getBgImage(variant, fill, size);

  // fade-three-sides: fades left edge, right edge, and bottom — top stays sharp
  // Requires two-layer mask-image with mask-composite:intersect
  if (mask === 'fade-three-sides') {
    return (
      <div
        className={cn('absolute inset-0 z-[-10] size-full', className)}
        style={{
          backgroundImage,
          backgroundSize: bgSize,
          maskImage:
            'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%), linear-gradient(to bottom, black 55%, transparent 100%)',
          WebkitMaskImage:
            'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%), linear-gradient(to bottom, black 55%, transparent 100%)',
          maskComposite: 'intersect',
          WebkitMaskComposite: 'source-in',
          ...style,
        }}
        {...props}
      />
    );
  }

  return (
    <div
      className={cn('absolute inset-0 z-[-10] size-full', maskClasses[mask] ?? '', className)}
      style={{
        backgroundImage,
        backgroundSize: bgSize,
        ...style,
      }}
      {...props}
    />
  );
};

BGPattern.displayName = 'BGPattern';
export { BGPattern };
