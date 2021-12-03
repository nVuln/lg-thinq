import BaseDevice from '../BaseDevice';

export enum FanSpeed {
  LOW = 2,
  LOW_MEDIUM = 3,
  MEDIUM = 4,
  MEDIUM_HIGH = 5,
  HIGH = 6,
}

export default class AirConditioner extends BaseDevice {
  public setup() {
    // getter
    this.on('airState.operation', (value) => {
      this.log.debug('Active status =>', value);
      this.emit('getActive', !!value);
      if (!value) {
        this.emit('getCurrentHeaterCoolerState', 'INACTIVE');
      }
    });

    this.on('airState.opMode', (value) => {
      const intValue = parseInt(value);
      if (!this.statusIsPowerOn) {
        this.emit('getCurrentHeaterCoolerState', 'INACTIVE');
      } else if ([0].includes(intValue)) {
        this.emit('getCurrentHeaterCoolerState', 'COOLING');
      } else if ([1, 4].includes(intValue)) {
        this.emit('getCurrentHeaterCoolerState', 'HEATING');
      } else if ([2, 8].includes(intValue)) {
        this.emit('getCurrentHeaterCoolerState', 'IDLE');
      } else if ([6, -1].includes(intValue)) {
        // auto mode
        if (this.currentTemperature < this.targetTemperature) {
          this.emit('getCurrentHeaterCoolerState', 'HEATING');
        } else {
          this.emit('getCurrentHeaterCoolerState', 'COOLING');
        }
      } else {
        this.log.warn('Unsupported value opMode =', value);
      }

      if (intValue === 0) {
        this.emit('getTargetHeaterCoolerState', 'COOL');
      } else if ([1, 4].includes(intValue)) {
        this.emit('getTargetHeaterCoolerState', 'HEAT');
      } else if ([6, -1].includes(intValue)) {
        if (this.currentTemperature < this.targetTemperature) {
          this.emit('getTargetHeaterCoolerState', 'HEAT');
        } else {
          this.emit('getTargetHeaterCoolerState', 'COOL');
        }
      }
    });

    this.on('airState.windStrength', (value) => {
      this.log.debug('Rotation speed =>', value);
      this.emit('getRotationSpeed', FanSpeed[value] || 'AUTO');
    });

    this.on('airState.wDir.vStep', () => {
      this.emit('getSwingMode', this.statusIsSwingOn);
    });

    this.on('airState.wDir.hStep', () => {
      this.emit('getSwingMode', this.statusIsSwingOn);
    });

    this.on('airState.lightingState.displayControl', (value) => {
      this.log.debug('Light signal =>', value);
      this.emit('getLightSignal', !!value);
    });

    this.on('airState.tempState.target', (value) => {
      this.emit('getTargetTemperature', value);
    });

    this.on('airState.quality.PM2', (value) => {
      this.emit('getPM2_5Density', parseInt(value));
    });

    this.on('airState.quality.PM10', (value) => {
      this.emit('getPM10Density', parseInt(value));
    });

    this.on('airState.quality.PM1', (value) => {
      this.emit('getPM1Density', parseInt(value));
    });

    this.on('airState.quality.overall', (value) => {
      this.emit('getAirQuality', parseInt(value));
    });

    // setter
    this.on('setActive', this.setActive.bind(this));
    this.on('setTargetHeaterCoolerState', this.setTargetHeaterCoolerState.bind(this));
    this.on('setFanSpeed', this.setFanSpeed.bind(this));
    // this.on('setSwingMode', this.setSwingMode.bind(this));
    this.on('setLightDisplay', this.setLightDisplay.bind(this));
    this.on('setTargetTemperature', this.setTargetTemperature.bind(this));
  }

  public async setActive(value) {
    const isOn = value ? 1 : 0;
    if (this.statusIsPowerOn && isOn) {
      return; // don't send same status
    }

    return await this.ThinQ.deviceControl(this.device, {
      dataKey: 'airState.operation',
      dataValue: isOn as number,
    }, 'Operation').then(() => {
      this.emit('airState.operation', isOn);
    });
  }

  public async setTargetTemperature(value) {
    if (!this.statusIsPowerOn) {
      return;
    }

    const temperature = value as number;
    if (temperature === this.targetTemperature) {
      return;
    }

    return await this.ThinQ.deviceControl(this.device, {
      dataKey: 'airState.tempState.target',
      dataValue: temperature,
    }).then(() => {
      this.emit('airState.tempState.target', temperature);
    });
  }

  public async setFanSpeed(value: 'LOW' | 'LOW_MEDIUM' | 'MEDIUM' | 'MEDIUM_HIGH' | 'HIGH' | 'AUTO') {
    if (!this.statusIsPowerOn) {
      return;
    }

    const windStrength = FanSpeed[value] || /* AUTO */ 8;
    return await this.ThinQ.deviceControl(this.device, {
      dataKey: 'airState.windStrength',
      dataValue: windStrength,
    }).then(() => {
      this.emit('airState.windStrength', windStrength);
    });
  }

  public async setLightDisplay(value) {
    if (!this.statusIsPowerOn) {
      return;
    }

    return await this.ThinQ.deviceControl(this.device, {
      dataKey: 'airState.lightingState.displayControl',
      dataValue: value ? 1 : 0,
    }).then(() => {
      this.emit('airState.lightingState.displayControl', value ? 1 : 0);
    });
  }

  public async setTargetHeaterCoolerState(value: 'COOL' | 'HEAT') {
    const opMode = parseInt(this.device.snapshot['opMode'] || -1);
    if (this.device.snapshot['opMode'] === 6) {
      return;
    }

    if (value === 'HEAT' && ![1, 4].includes(opMode)) {
      return await this.setOpMode(4);
    } else if (value === 'COOL' && ![0].includes(opMode)) {
      return await this.setOpMode(0);
    }
  }

  public async setOpMode(opMode) {
    return await this.ThinQ.deviceControl(this.device, {
      dataKey: 'airState.opMode',
      dataValue: opMode,
    }).then(() => {
      this.emit('airState.opMode', opMode);
    });
  }

  public get statusIsSwingOn() {
    const vStep = Math.floor((this.device.snapshot['airState.wDir.vStep'] || 0) / 100),
      hStep = Math.floor((this.device.snapshot['airState.wDir.hStep'] || 0) / 100);
    return !!(vStep + hStep);
  }

  public get statusIsPowerOn() {
    return !!this.device.snapshot['airState.operation'];
  }

  public get currentTemperature() {
    return this.device.snapshot['airState.tempState.current'] as number;
  }

  public get targetTemperature() {
    return this.device.snapshot['airState.tempState.target'] as number;
  }
}
