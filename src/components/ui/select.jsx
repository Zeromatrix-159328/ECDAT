import React, { forwardRef, createContext, useContext } from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import './select.css';

const SelectContext = createContext({ placeholder: '' });

export const Select = ({ value, onValueChange, items, placeholder = '', className = '', children, ...props }) => {
  const handleValueChange = (val) => {
    if (onValueChange) {
      onValueChange(val === '__empty__' ? (items?.some(i => i.value === null) ? null : '') : val);
    }
  };
  const safeValue = value === null || value === '' ? '__empty__' : (value !== undefined ? String(value) : undefined);

  return (
    <SelectContext.Provider value={{ placeholder, className }}>
      <SelectPrimitive.Root
        value={safeValue}
        onValueChange={handleValueChange}
        {...props}
      >
        {children}
      </SelectPrimitive.Root>
    </SelectContext.Provider>
  );
};

export const SelectGroup = SelectPrimitive.Group;

export const SelectValue = forwardRef(({ placeholder, ...props }, ref) => {
  const ctx = useContext(SelectContext);
  return (
    <SelectPrimitive.Value
      ref={ref}
      placeholder={placeholder || ctx.placeholder}
      {...props}
    />
  );
});
SelectValue.displayName = 'SelectValue';

export const SelectTrigger = forwardRef(({ className = '', children, ...props }, ref) => {
  const ctx = useContext(SelectContext);
  const combinedClass = [ctx.className, className].filter(Boolean).join(' ');
  return (
    <SelectPrimitive.Trigger
      ref={ref}
      className={`select-trigger ${combinedClass}`}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown size={14} className="select-trigger-icon" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
});
SelectTrigger.displayName = 'SelectTrigger';

export const SelectScrollUpButton = forwardRef(({ className = '', ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={`select-scroll-button ${className}`}
    {...props}
  >
    <ChevronUp size={14} />
  </SelectPrimitive.ScrollUpButton>
));
SelectScrollUpButton.displayName = 'SelectScrollUpButton';

export const SelectScrollDownButton = forwardRef(({ className = '', ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={`select-scroll-button ${className}`}
    {...props}
  >
    <ChevronDown size={14} />
  </SelectPrimitive.ScrollDownButton>
));
SelectScrollDownButton.displayName = 'SelectScrollDownButton';

export const SelectContent = forwardRef(({ className = '', children, position = 'popper', ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      position={position}
      sideOffset={4}
      className={`select-content ${className}`}
      {...props}
    >
      <SelectScrollUpButton />
      <SelectPrimitive.Viewport className="select-viewport">
        {children}
      </SelectPrimitive.Viewport>
      <SelectScrollDownButton />
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = 'SelectContent';

export const SelectLabel = forwardRef(({ className = '', ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={`select-label ${className}`}
    {...props}
  />
));
SelectLabel.displayName = 'SelectLabel';

export const SelectItem = forwardRef(({ className = '', children, value, id, ...props }, ref) => {
  const rawVal = value !== undefined ? value : id;
  const safeValue = rawVal === null || rawVal === undefined ? '__empty__' : String(rawVal);
  return (
    <SelectPrimitive.Item
      ref={ref}
      value={safeValue}
      className={`select-item ${className}`}
      {...props}
    >
      <span className="select-item-indicator">
        <SelectPrimitive.ItemIndicator>
          <Check size={14} strokeWidth={2.5} />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
});
SelectItem.displayName = 'SelectItem';

export const SelectSeparator = forwardRef(({ className = '', ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={`select-separator ${className}`}
    {...props}
  />
));
SelectSeparator.displayName = 'SelectSeparator';

const demoItems = [
  { label: "Apple", value: "apple" },
  { label: "Banana", value: "banana" },
  { label: "Blueberry", value: "blueberry" },
  { label: "Grapes", value: "grapes" },
  { label: "Pineapple", value: "pineapple" },
];

export function SelectDemo() {
  return (
    <Select placeholder="Select a fruit" className="w-full max-w-48">
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Fruits</SelectLabel>
          {demoItems.map((item) => (
            <SelectItem key={item.value} id={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
