/** The UI is laid out in 1920×1080 px and scaled as a whole to fit the stage. */
export function mountUiScale(stage: HTMLElement, layer: HTMLElement): void {
  const apply = (): void => layer.style.setProperty('--k', String(stage.clientWidth / 1920));
  new ResizeObserver(apply).observe(stage);
  apply();
}
