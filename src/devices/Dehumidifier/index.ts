import BaseDevice from '../BaseDevice';

enum RotateSpeed {
  LOW = 2,
  HIGH = 6,
}

export default class Dehumidifier extends BaseDevice {
  public setup() {
    this.on('airState.operation', () => {
      this.emit('getActive', this.statusIsPowerOn);

      if (!this.statusIsPowerOn) {
        this.emit('getCurrentHumidifierDehumidifierState', 'INACTIVE');
      }
    });

    this.on('airState.opMode', (value) => {
      const opMode = parseInt(value);
      const isDehumidifying = [17, 18, 19, 21].includes(opMode) && this.humidityCurrent >= this.humidityTarget;

      if (this.statusIsPowerOn) {
        this.emit('getCurrentHumidifierDehumidifierState', isDehumidifying ? 'DEHUMIDIFYING' : 'IDLE');
      } else {
        this.emit('getCurrentHumidifierDehumidifierState', 'INACTIVE');
      }
    });

    this.on('airState.humidity.current', () => {
      this.emit('getCurrentRelativeHumidity', this.humidityCurrent);
    });

    this.on('airState.humidity.desired', () => {
      this.emit('getDesiredRelativeHumidity', this.humidityTarget);
    });

    this.on('airState.notificationExt', (value) => {
      this.emit('getWaterLevel', value ? 100 : 0);
    });

    this.on('airState.windStrength', (value) => {
      this.emit('getRotationSpeed', RotateSpeed[parseInt(value)] || 'HIGH');
    });

    this.on('setActive', this.setActive.bind(this));
    this.on('setRotationSpeed', this.setRotationSpeed.bind(this));
    this.on('setDesiredHumidity', this.setDesiredHumidity.bind(this));
  }

  public async setActive(value) {
    const isOn = !!value as boolean;
    if (this.statusIsPowerOn && isOn) {
      return; // don't send same status
    }

    return await this.ThinQ.deviceControl(this.device, {
      dataKey: 'airState.operation',
      dataValue: isOn,
    }).then(() => {
      this.emit('airState.operation', isOn ? 1 : 0);
    });
  }

  public async setRotationSpeed(value) {
    if (!this.statusIsPowerOn) {
      return;
    }

    const windStrength = RotateSpeed[value] || RotateSpeed.HIGH;
    return await this.ThinQ.deviceControl(this.device, {
      dataKey: 'airState.windStrength',
      dataValue: windStrength,
    }).then(() => {
      this.emit('airState.windStrength', windStrength);
    });
  }

  public async setDesiredHumidity(value) {
    if (!this.statusIsPowerOn) {
      return;
    }

    return await this.ThinQ.deviceControl(this.device, {
      dataKey: 'airState.humidity.desired',
      dataValue: parseInt(value),
    }).then(() => {
      this.emit('airState.humidity.desired', value);
    });
  }

  public get statusIsPowerOn() {
    return !!this.device.snapshot['airState.operation'] as boolean;
  }

  public get humidityCurrent() {
    return this.device.snapshot['airState.humidity.current'] || 0;
  }

  public get humidityTarget() {
    return this.device.snapshot['airState.humidity.desired'] || 0;
  }
}
