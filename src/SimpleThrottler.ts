import SimpleDebouncer from './SimpleDebouncer';

export default class SimpleThrottler<TResult = object> {
  private delay: number;
  private isThrottled: boolean;
  private debouncer: SimpleDebouncer<TResult>;

  constructor(delay: number) {
    this.delay = delay;
    this.isThrottled = false;
    this.debouncer = new SimpleDebouncer(delay);
  }

  public throttle(callback: () => Promise<TResult> | void): Promise<TResult> | void {
    if (!this.isThrottled) {
      this.isThrottled = true;

      // Execute the callback using the debouncer, which will introduce the delay
      return this.debouncer.debounceAsync(() => {
        this.isThrottled = false;
        return callback();
      });
    }
  }
}
