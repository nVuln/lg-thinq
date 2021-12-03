import BaseDevice from '../BaseDevice';

export enum RotateSpeed {
  LOW = 2,
  MEDIUM = 4,
  HIGH = 6,
  EXTRA = 7,
}

export default class AirPurifier extends BaseDevice {
  public setup() {
    // getter
    this.on('airState.operation', (value) => {
      this.log.debug('Active status =>', value);
      this.emit('getActive', !!value);
      this.emit('getCurrentAirPurifierState', value ? 'PURIFYING_AIR' : 'INACTIVE');
    });

    this.on('airState.opMode', (value) => {
      this.emit('getTargetAirPurifierState', value === 14 ? 'MANUAL' : 'AUTO');
    });

    this.on('airState.windStrength', (value) => {
      this.log.debug('Rotation speed =>', value);
      this.emit('getRotationSpeed', RotateSpeed[value]);
    });

    this.on('airState.circulate.rotate', (value) => {
      this.log.debug('Swing mode =>', value);
      this.emit('getSwingMode', value);
    });

    this.on('airState.lightingState.signal', (value) => {
      this.log.debug('Light signal =>', value);
      this.emit('getLightSignal', !!value);
    });

    this.on('airState.filterMngStates.useTime', () => {
      const filterMaxTime = this.device.snapshot['airState.filterMngStates.maxTime'] || 0;
      const filterUseTime = this.device.snapshot['airState.filterMngStates.useTime'] || 0;
      let usedTimePercent = 0;
      if (filterMaxTime && filterUseTime) {
        usedTimePercent = Math.round((1 - (filterUseTime / filterMaxTime)) * 100);
      }

      this.emit('getFilterLifeLevel', usedTimePercent);
      this.emit('getFilterChangeIndication', usedTimePercent > 95);
    });

    // air quality sensor
    this.on('airState.quality.overall', (value) => {
      this.emit('getAirQuality', parseInt(value));
    });

    this.on('airState.quality.PM1', (value) => {
      this.emit('getPM1Density', parseInt(value));
    });

    this.on('airState.quality.PM2', (value) => {
      this.emit('getPM2_5Density', parseInt(value));
    });

    this.on('airState.quality.PM10', (value) => {
      this.emit('getPM10Density', parseInt(value));
    });

    // setter
    this.on('setActive', this.setActive.bind(this));
    this.on('setTargetAirPurifierState', this.setTargetAirPurifierState.bind(this));
    this.on('setRotationSpeed', this.setRotationSpeed.bind(this));
    this.on('setSwingMode', this.setSwingMode.bind(this));
    this.on('setLightSignal', this.setLightSignal.bind(this));
  }

  public get statusIsPowerOn() {
    return !!this.device.snapshot['airState.operation'] as boolean;
  }

  public get statusIsNormalMode() {
    return this.device.snapshot['airState.opMode'] === 14;
  }

  public async setActive(value) {
    const onValue = value ? 1 : 0;
    if (this.statusIsPowerOn && onValue) {
      return;
    }

    this.log.debug('Set Active State ->', value);
    return await this.ThinQ.deviceControl(this.device, {
      dataKey: 'airState.operation',
      dataValue: onValue,
    }).then(() => {
      this.emit('airState.operation', onValue);
    });
  }

  public async setTargetAirPurifierState(value: 'MANUAL' | 'AUTO') {
    if (!this.statusIsPowerOn || (this.statusIsNormalMode && value === 'MANUAL')) {
      return;
    }

    await this.ThinQ.deviceControl(this.device, {
      dataKey: 'airState.opMode',
      dataValue: value === 'AUTO' ? 16 : 14,
    });
  }

  public async setRotationSpeed(value: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTRA') {
    if (!this.statusIsPowerOn || !this.statusIsNormalMode) {
      return;
    }

    const windStrength = RotateSpeed[value] || RotateSpeed.EXTRA;
    this.ThinQ.deviceControl(this.device, {
      dataKey: 'airState.windStrength',
      dataValue: windStrength,
    }).then(() => {
      this.emit('airState.windStrength', windStrength);
    });
  }

  public async setSwingMode(value) {
    if (!this.statusIsPowerOn || !this.statusIsNormalMode) {
      return;
    }

    this.ThinQ.deviceControl(this.device, {
      dataKey: 'airState.circulate.rotate',
      dataValue: value ? 1 : 0,
    }).then(() => {
      this.emit('airState.circulate.rotate', value);
    });
  }

  public async setLightSignal(value) {
    if (!this.statusIsPowerOn) {
      return;
    }

    this.ThinQ.deviceControl(this.device, {
      dataKey: 'airState.lightingState.signal',
      dataValue: value ? 1 : 0,
    }).then(() => {
      this.emit('airState.lightingState.signal', value);
    });
  }
}
