import Refrigerator, {fToC} from './index';
import DeviceModel from '../../utils/DeviceModel';
import {lookupEnumIndex, loopupEnum} from '../../constants/helper';

export default class RefrigeratorV1 extends Refrigerator {
  public async setExpressMode(value) {
    const On = this.device.deviceModel.enumValue('IcePlus', '@CP_ON_EN_W');
    const Off = this.device.deviceModel.enumValue('IcePlus', '@CP_OFF_EN_W');

    this.ThinQ.thinq1DeviceControl(this.device, 'IcePlus', value ? On : Off).then(() => {
      this.emit('refState.expressMode', value as boolean ? On : Off);
    });
  }

  public async setExpressFridge(value) {
    const On = this.device.deviceModel.enumValue('ExpressFridge', '@CP_ON_EN_W');
    const Off = this.device.deviceModel.enumValue('ExpressFridge', '@CP_OFF_EN_W');

    this.ThinQ.thinq1DeviceControl(this.device, 'ExpressFridge', value ? On : Off).then(() => {
      this.emit('refState.expressFridge', value as boolean ? On : Off);
    });
  }

  public async setEcoFriendly(value) {
    const On = this.device.deviceModel.enumValue('EcoFriendly', '@CP_ON_EN_W');
    const Off = this.device.deviceModel.enumValue('EcoFriendly', '@CP_OFF_EN_W');

    this.ThinQ.thinq1DeviceControl(this.device, 'EcoFriendly', value ? On : Off).then(() => {
      this.emit('refState.ecoFriendly', value as boolean ? On : Off);
    });
  }

  public async setFridgeTemperature(value) {
   return  await this.setTemperature('TempRefrigerator', value);
  }

  public async setFreezerTemperature(value) {
    return await this.setTemperature('TempFreezer', value);
  }

  protected async setTemperature(key: string, temp: string) {
    const indexValue = this.lookupTemperatureIndexValue(key, temp);
    return await this.ThinQ.thinq1DeviceControl(this.device, key, indexValue);
  }

  public get statusIsExpressModeOn() {
    return this.device.snapshot.refState?.expressMode === this.device.deviceModel.lookupMonitorName('IcePlus', '@CP_ON_EN_W');
  }

  public get statusIsExpressFridgeOn() {
    return this.device.snapshot.refState?.expressFridge === this.device.deviceModel.lookupMonitorName('ExpressFridge', '@CP_ON_EN_W');
  }

  public get statusIsEcoFriendlyOn() {
    return this.device.snapshot.refState?.ecoFriendly === this.device.deviceModel.lookupMonitorName('EcoFriendly', '@CP_ON_EN_W');
  }

  public get freezerTemperature() {
    const freezerTemp = this.device.snapshot.refState.freezerTemp;
    const defaultValue = this.device.deviceModel.lookupMonitorValue( 'TempFreezer', freezerTemp, '0');
    if (this.tempUnit === 'FAHRENHEIT') {
      return fToC(parseInt(this.device.deviceModel.lookupMonitorValue('TempFreezer_F', freezerTemp, defaultValue)));
    }

    return parseInt(this.device.deviceModel.lookupMonitorValue('TempFreezer_C', freezerTemp, defaultValue));
  }

  public get fridgeTemperature() {
    const fridgeTemp = this.device.snapshot.refState.fridgeTemp;
    const defaultValue = this.device.deviceModel.lookupMonitorValue( 'TempRefrigerator', fridgeTemp, '0');
    if (this.tempUnit === 'FAHRENHEIT') {
      return fToC(parseInt(this.device.deviceModel.lookupMonitorValue( 'TempRefrigerator_F', fridgeTemp, defaultValue)));
    }

    return parseInt(this.device.deviceModel.lookupMonitorValue('TempRefrigerator_C', fridgeTemp, defaultValue));
  }
}

export enum DoorOpenState {
  OPEN = 'OPEN',
  CLOSE = 'CLOSE',
}

export function RefState(deviceModel: DeviceModel, decodedMonitor) {
  const snapshot = {
    refState: {
      fridgeTemp: decodedMonitor['TempRefrigerator'] || deviceModel.default('TempRefrigerator') || '0',
      freezerTemp: decodedMonitor['TempFreezer'] || deviceModel.default('TempFreezer') || '0',
      // eslint-disable-next-line max-len
      atLeastOneDoorOpen: lookupEnumIndex(DoorOpenState, loopupEnum(deviceModel, decodedMonitor, 'DoorOpenState') || deviceModel.default('DoorOpenState')),
      tempUnit: parseInt(decodedMonitor['TempUnit'] || deviceModel.default('TempUnit')) ? 'CELSIUS' : 'FAHRENHEIT',
    },
  };

  snapshot.refState.fridgeTemp = parseInt(snapshot.refState.fridgeTemp);
  snapshot.refState.freezerTemp = parseInt(snapshot.refState.freezerTemp);

  if ('IcePlus' in decodedMonitor) {
    snapshot.refState['expressMode'] = decodedMonitor['IcePlus'] || deviceModel.default('IcePlus');
  }

  if ('ExpressFridge' in decodedMonitor) {
    snapshot.refState['expressFridge'] = decodedMonitor['ExpressFridge'] || deviceModel.default('ExpressFridge');
  }

  if ('EcoFriendly' in decodedMonitor) {
    snapshot.refState['ecoFriendly'] = decodedMonitor['EcoFriendly'] || deviceModel.default('EcoFriendly');
  }

  return snapshot;
}
