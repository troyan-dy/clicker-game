import type { CardOption } from '../card/card';

export function canChoose(options: readonly CardOption[], index: number): boolean {
  const option = options[index];
  return !!option && !option.off;
}

export function initialChoice(options: readonly CardOption[], preferred?: number): number {
  if (preferred !== undefined && canChoose(options, preferred)) return preferred;
  return Math.max(0, options.findIndex(option => !option.off));
}

export function moveChoice(options: readonly CardOption[], selected: number, step: number): number {
  const size = options.length;
  for (let distance = 1; distance <= size; distance++) {
    const index = (selected + step * distance + size * distance) % size;
    if (canChoose(options, index)) return index;
  }
  return selected;
}
