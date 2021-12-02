import BaseDevice from '../BaseDevice';

export default class Dishwasher extends BaseDevice {
  public setup() {
    this.on('dishwasher.state', (state) => {
      this.emit('getActive', this.statusIsPowerOn);
      this.emit('getState', state);
    });

    this.on('dishwasher.remainTimeMinute', () => {
      const {
        remainTimeHour = 0,
        remainTimeMinute = 0,
      } = this.device.snapshot.dishwasher;

      let remainingDuration = 0;
      if (this.statusIsRunning) {
        remainingDuration = remainTimeHour * 3600 + remainTimeMinute * 60;
      }

      this.emit('getRemainDuration', remainingDuration);
    });
  }

  public get statusIsRunning() {
    return this.device.snapshot.dishwasher?.state === 'RUNNING';
  }

  public get statusIsPowerOn() {
    return !['POWEROFF', 'POWERFAIL'].includes(this.device.snapshot.dishwasher?.state);
  }
}
