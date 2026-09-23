import React, { forwardRef } from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';
import './slider.css';

export const Slider = forwardRef(({
  className = '',
  value,
  defaultValue = [0],
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  ...props
}, ref) => {
  const normalizedValue = Array.isArray(value)
    ? value
    : (typeof value === 'number' ? [value] : undefined);

  const normalizedDefault = Array.isArray(defaultValue)
    ? defaultValue
    : (typeof defaultValue === 'number' ? [defaultValue] : [0]);

  const thumbsCount = normalizedValue ? normalizedValue.length : normalizedDefault.length;

  const handleValueChange = (vals) => {
    if (onValueChange) {
      onValueChange(vals);
    }
  };

  return (
    <SliderPrimitive.Root
      ref={ref}
      value={normalizedValue}
      defaultValue={normalizedDefault}
      onValueChange={handleValueChange}
      min={min}
      max={max}
      step={step}
      className={`slider-root ${className}`}
      {...props}
    >
      <SliderPrimitive.Track className="slider-track">
        <SliderPrimitive.Range className="slider-range" />
      </SliderPrimitive.Track>
      {Array.from({ length: Math.max(1, thumbsCount) }).map((_, index) => (
        <SliderPrimitive.Thumb key={index} className="slider-thumb" />
      ))}
    </SliderPrimitive.Root>
  );
});
Slider.displayName = 'Slider';

export function SliderDemo() {
  return (
    <Slider
      defaultValue={[75]}
      max={100}
      step={1}
      className="mx-auto w-full max-w-xs"
    />
  );
}
