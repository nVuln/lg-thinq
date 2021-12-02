export default class Logger {
  constructor(
    public log: any = console,
    public name: string = '',
  ) {

  }

  info(message, ...args) {
    this.log.info((this.name ? `[${this.name}] ` : '') + message, ...args);
  }

  warn(message, ...args) {
    this.log.warn((this.name ? `[${this.name}] ` : '') + message, ...args);
  }

  debug(message, ...args) {
    this.log.debug((this.name ? `[${this.name}] ` : '') + message, ...args);
  }

  error(message, ...args) {
    this.log.error((this.name ? `[${this.name}] ` : '') + message, ...args);
  }
}
