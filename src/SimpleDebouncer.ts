export default class SimpleDebouncer<TResult> {
  private delay: number;

  private timerId: NodeJS.Timeout | null;

  constructor(delay: number) {
    this.delay = delay;
    this.timerId = null;
  }

  public debounceAsync(callback: () => Promise<TResult> | void): Promise<TResult> | void {
    return new Promise((resolve) => {
      if (this.timerId) {
        clearTimeout(this.timerId);
      }

      this.timerId = setTimeout(() => {
        const result = callback();
        if (result instanceof Promise) {
          resolve(result);
        } else {
          resolve(undefined as TResult);
        }
      }, this.delay);
    });
  }
}
