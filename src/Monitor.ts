import EventEmitter from 'events';
import BaseDevice from './devices/BaseDevice';
import {PlatformType} from './constants';
import Logger from './utils/Logger';
import ThinQ from './ThinQ';
import Device from './utils/Device';
import {ManualProcessNeeded} from './utils/errors';
import Rsa from './utils/Rsa';

export default class Monitor extends EventEmitter {
  protected log: Logger;

  constructor(
    protected ThinQ: ThinQ,
    protected devices: BaseDevice[],
  ) {
    super();

    this.log = ThinQ.log;
  }

  public async start(refresh_interval = 60) {
    const thinq2devices = this.devices.filter(device => device.device.platform === PlatformType.ThinQ2);
    await this.startThinq2Monitor(thinq2devices);

    if (this.devices.length <= thinq2devices.length) {
      return; // no thinq1 device, stop here
    }

    // polling thinq1 device
    this.log.info('Start polling device data every '+ refresh_interval +' second.');

    const ThinQ = this.ThinQ;
    const interval = setInterval(async () => {
      try {
        for (const accessory of this.devices) {
          const device: Device = accessory.device;
          if (device.platform === PlatformType.ThinQ1) {
            const deviceWithSnapshot = await ThinQ.pollMonitor(accessory);
            if (deviceWithSnapshot.snapshot.raw !== null) {
              this.emit(device.id, deviceWithSnapshot.snapshot);
            }
          }
        }
      } catch (err) {
        if (err instanceof ManualProcessNeeded) {
          this.log.info('Stop polling device data.');
          this.log.warn(err.message);
          clearInterval(interval);
          return; // stop plugin here
        }
      }
    }, refresh_interval);
  }

  protected async startThinq2Monitor(thinq2devices) {
    if (thinq2devices.length) {
      this.log.debug('Found ' + thinq2devices.length + ' thinq v2 devices');
      setInterval(() => {
        this.ThinQ.devices().then((devices) => {
          devices.map(accessory => accessory.device).filter(device => device.platform === PlatformType.ThinQ2).forEach(device => {
            // only emit if device online
            if (device.snapshot.online) {
              this.emit('refresh.'+device.id, device.snapshot);
            }
          });
        });
      }, 600000); // every 10 minute

      const refreshList = {};
      thinq2devices.forEach(dev => {
        const device: Device = dev.device;
        refreshList[device.id] = setTimeout(() => {
          this.once('refresh.'+device.id, (snapshot) => {
            this.emit(device.id, snapshot);
            refreshList[device.id].refresh();
          });
        }, 300000);
      });

      this.log.info('Start MQTT listener for thinq v2 device');
      const keyPair = Rsa.generateKeyPair();
      const CSR = Rsa.generateCSR(keyPair);
      await this.ThinQ.registerMQTTListener(keyPair, CSR, (data) => {
        if ('data' in data && 'deviceId' in data) {
          this.emit(data.deviceId, data.data?.state?.reported);

          if (data.deviceId in refreshList) {
            refreshList[data.deviceId].refresh();
          }
        }
      });
    }
  }
}
