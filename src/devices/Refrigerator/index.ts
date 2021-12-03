import BaseDevice from '../BaseDevice';

export default class Refrigerator extends BaseDevice {
  public setup() {
    this.on('refState.freezerTemp', () => {
      this.emit('getFreezerTemperature', this.freezerTemperature);
    });

    this.on('refState.fridgeTemp', () => {
      this.emit('getFridgeTemperature', this.fridgeTemperature);
    });

    this.on('refState.atLeastOneDoorOpen', (value) => {
      this.emit('getDoorOpenStatus', value !== 'CLOSE');
    });

    this.on('refState.expressMode', () => {
      this.emit('getExpressMode', this.statusIsExpressModeOn);
    });

    this.on('refState.expressFridge', () => {
      this.emit('getExpressFridge', this.statusIsExpressFridgeOn);
    });

    this.on('refState.ecoFriendly', () => {
      this.emit('getEcoFriendly', this.statusIsEcoFriendlyOn);
    });

    this.on('refState.tempUnit', (value) => {
      this.emit('getTemperatureDisplayUnits', value);
    });

    // setter
    this.on('setFreezerTemperature', this.setFreezerTemperature.bind(this));
    this.on('setFridgeTemperature', this.setFridgeTemperature.bind(this));
    this.on('setExpressMode', this.setExpressMode.bind(this));
    this.on('setExpressFridge', this.setExpressFridge.bind(this));
    this.on('setEcoFriendly', this.setEcoFriendly.bind(this));
  }

  public async setExpressMode(value) {
    const On = this.device.deviceModel.lookupMonitorName('expressMode', '@CP_ON_EN_W');
    const Off = this.device.deviceModel.lookupMonitorName('expressMode', '@CP_OFF_EN_W');
    return await this.ThinQ.deviceControl(this.device, {
      dataKey: null,
      dataValue: null,
      dataSetList: {
        refState: {
          expressMode: value as boolean ? On : Off,
          tempUnit: this.tempUnit,
        },
      },
      dataGetList: null,
    }).then(() => {
      this.emit('refState.expressMode', value as boolean ? On : Off);
    });
  }

  public async setExpressFridge(value) {
    const On = this.device.deviceModel.lookupMonitorName('expressFridge', '@CP_ON_EN_W');
    const Off = this.device.deviceModel.lookupMonitorName('expressFridge', '@CP_OFF_EN_W');
    return await this.ThinQ.deviceControl(this.device, {
      dataKey: null,
      dataValue: null,
      dataSetList: {
        refState: {
          expressFridge: value as boolean ? On : Off,
          tempUnit: this.tempUnit,
        },
      },
      dataGetList: null,
    }).then(() => {
      this.emit('refState.expressFridge', value as boolean ? On : Off);
    });
  }

  public async setEcoFriendly(value) {
    const On = this.device.deviceModel.lookupMonitorName('ecoFriendly', '@CP_ON_EN_W');
    const Off = this.device.deviceModel.lookupMonitorName('ecoFriendly', '@CP_OFF_EN_W');
    return await this.ThinQ.deviceControl(this.device, {
      dataKey: null,
      dataValue: null,
      dataSetList: {
        refState: {
          ecoFriendly: value as boolean ? On : Off,
          tempUnit: this.tempUnit,
        },
      },
      dataGetList: null,
    }).then(() => {
      this.emit('refState.ecoFriendly', value as boolean ? On : Off);
    });
  }

  protected lookupTemperatureIndexValue(key, value) {
    let indexValue;
    if (this.tempUnit === 'FAHRENHEIT') {
      indexValue = this.device.deviceModel.lookupMonitorName(key + '_F', cToF(value as number).toString())
        || this.device.deviceModel.lookupMonitorName(key, cToF(value as number).toString());
    } else {
      indexValue = this.device.deviceModel.lookupMonitorName(key + '_C', value.toString())
        || this.device.deviceModel.lookupMonitorName(key, value.toString());
    }

    return indexValue;
  }

  public async setFridgeTemperature(value) {
    return await this.setTemperature('fridgeTemp', value);
  }

  public async setFreezerTemperature(value) {
    return await this.setTemperature('freezerTemp', value);
  }

  protected async setTemperature(key: string, temp: string) {
    const indexValue = this.lookupTemperatureIndexValue(key, temp);
    return await this.ThinQ.deviceControl(this.device, {
      dataKey: null,
      dataValue: null,
      dataSetList: {
        refState: {
          [key]: parseInt(indexValue),
          tempUnit: this.tempUnit,
        },
      },
      dataGetList: null,
    }).then(() => {
      this.emit('refState.' + key, temp);
    });
  }

  public get statusIsExpressModeOn() {
    return this.device.snapshot.refState?.expressMode === this.device.deviceModel.lookupMonitorName('expressMode', '@CP_ON_EN_W');
  }

  public get statusIsExpressFridgeOn() {
    return this.device.snapshot.refState?.expressFridge === this.device.deviceModel.lookupMonitorName('expressFridge', '@CP_ON_EN_W');
  }

  public get statusIsEcoFriendlyOn() {
    return this.device.snapshot.refState?.ecoFriendly === this.device.deviceModel.lookupMonitorName('ecoFriendly', '@CP_ON_EN_W');
  }

  public get freezerTemperature() {
    const freezerTemp = this.device.snapshot.refState.freezerTemp;
    if (this.tempUnit === 'FAHRENHEIT') {
      return fToC(parseInt(this.device.deviceModel.lookupMonitorValue('freezerTemp_F', freezerTemp, '0')));
    }

    return parseInt(this.device.deviceModel.lookupMonitorValue('freezerTemp_C', freezerTemp, '0'));
  }

  public get fridgeTemperature() {
    const fridgeTemp = this.device.snapshot.refState.fridgeTemp;
    if (this.tempUnit === 'FAHRENHEIT') {
      return fToC(parseInt(this.device.deviceModel.lookupMonitorValue( 'fridgeTemp_F', fridgeTemp, '0')));
    }

    return parseInt(this.device.deviceModel.lookupMonitorValue('fridgeTemp_C', fridgeTemp, '0'));
  }

  public get tempUnit() {
    return this.device.snapshot.refState.tempUnit || 'CELSIUS';
  }
}

export function fToC(fahrenheit) {
  return parseFloat(((fahrenheit - 32) * 5 / 9).toFixed(1));
}

export function cToF(celsius) {
  return Math.round(celsius * 9 / 5 + 32);
}
