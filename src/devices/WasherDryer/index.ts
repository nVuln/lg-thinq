import BaseDevice from '../BaseDevice';

export const NOT_RUNNING_STATUS = ['COOLDOWN', 'POWEROFF', 'POWERFAIL', 'INITIAL', 'PAUSE', 'AUDIBLE_DIAGNOSIS', 'FIRMWARE',
  'COURSE_DOWNLOAD', 'ERROR'];

export default class WasherDryer extends BaseDevice {
  public setup() {
    this.on('washerDryer.state', (value) => {
      this.emit('getActive', this.statusIsPowerOn);
      this.emit('getState', value);
    });

    this.on('washerDryer.doorLock', () => {
      this.emit('getDoorLockStatus', this.statusIsDoorLocked);
    });

    this.on('washerDryer.remainTimeMinute', () => {
      const {
        remainTimeHour = 0,
        remainTimeMinute = 0,
      } = this.device.snapshot.washerDryer;

      let remainingDuration = 0;
      if (this.statusIsRunning) {
        remainingDuration = remainTimeHour * 3600 + remainTimeMinute * 60;
      }

      this.emit('getRemainDuration', remainingDuration);
    });

    this.on('setActive', this.setActive.bind(this));
  }

  async setActive() {
    if (!this.statusIsRemoteStartEnable) {
      return;
    }

    return;
  }

  public get statusIsRemoteStartEnable() {
    return this.device.snapshot.washerDryer.remoteStart === this.device.deviceModel.lookupMonitorName('remoteStart', '@CP_ON_EN_W');
  }

  public get statusIsDoorLocked() {
    return this.device.snapshot.washerDryer?.doorLock === this.device.deviceModel.lookupMonitorName('doorLock', '@CP_ON_EN_W');
  }

  public get statusIsRunning() {
    return this.statusIsPowerOn && !NOT_RUNNING_STATUS.includes(this.device.snapshot.washerDryer?.state);
  }

  public get statusIsPowerOn() {
    return !['POWEROFF', 'POWERFAIL'].includes(this.device.snapshot.washerDryer?.state);
  }
}
