export default class SimpleThrottler {
  private isThrottled: boolean = false;
  private queuedFunction: (() => void) | null = null;

  constructor(private delay: number) {}

  throttle(func: () => void): void {
    if (this.isThrottled) {
      this.queuedFunction = func;
    } else {
      func();
      this.isThrottled = true;
      setTimeout(() => {
        this.isThrottled = false;
        if (this.queuedFunction) {
          const nextFunction = this.queuedFunction;
          this.queuedFunction = null;
          this.throttle(nextFunction);
        }
      }, this.delay);
    }
  }
}
