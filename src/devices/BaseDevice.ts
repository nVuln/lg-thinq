import {EventEmitter} from 'events';
import Device from '../utils/Device';
import Logger from '../utils/Logger';
import ThinQ from '../ThinQ';
import {mergeDeep, objectDotNotation} from '../constants/helper';

export default class BaseDevice extends EventEmitter {
  constructor(
    protected ThinQ: ThinQ,
    protected log: Logger,
    public device: Device,
  ) {
    super();

    this.setup();
  }

  public get id() {
    return this.device.id;
  }

  public get name() {
    return this.device.name;
  }

  public toString() {
    return `${this.id}: ${this.name} (${this.device.type} ${this.device.model})`;
  }

  public update(snapshot) {
    this.device.snapshot = mergeDeep({}, this.device.snapshot, snapshot);
    const obj = objectDotNotation(snapshot);

    this.emit('update', snapshot);

    for (const [key, value] of Object.entries(obj)) {
      this.emit(key, value);
    }
  }

  public setup() {
    // setup listener
  }
}
