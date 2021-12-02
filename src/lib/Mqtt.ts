import EventEmitter from 'events';
import axios from 'axios';
import {URL} from 'url';
import {device as awsIotDevice} from 'aws-iot-device-sdk';
import Logger from '../utils/Logger';

export default class Mqtt extends EventEmitter {
  protected options: any = {};

  constructor(
    protected mqttServer,
    protected log: Logger,
    options: any = {},
  ) {
    super();

    Object.assign(this.options, options);
    const urls = new URL(this.mqttServer);
    this.options.host = urls.hostname;
  }

  public async connect(subscriptions) {
    this.options.caCert = Buffer.from(await this.getRootCA(), 'utf-8');
    const device = awsIotDevice(this.options);
    device.on('error', (err) => {
      this.log.error('mqtt err:', err);
    });
    device.on('connect', () => {
      this.log.info('Successfully connected to the MQTT server.');
      this.log.debug('mqtt connected:', this.mqttServer);
      for (const subscription of subscriptions) {
        device.subscribe(subscription);
      }
    });
    device.on('message', (topic, payload) => {
      this.emit('message', JSON.parse(payload.toString()));
      this.log.debug('mqtt message received:', payload.toString());
    });
    device.on('offline', () => {
      device.end();

      this.log.info('MQTT disconnected, retrying in 60 seconds!');
      this.emit('offline', true);
    });
  }

  protected async getRootCA() {
    // get trusted cer root based on hostname
    let rootCAUrl;
    if (this.options.host.match(/^([^.]+)-ats.iot.([^.]+).amazonaws.com$/g)) {
      // ats endpoint
      rootCAUrl = 'https://www.amazontrust.com/repository/AmazonRootCA1.pem';
    } else if (this.options.host.match(/^([^.]+).iot.ruic.lgthinq.com$/g)) {
      // LG owned certificate - Comodo CA
      rootCAUrl = 'http://www.tbs-x509.com/Comodo_AAA_Certificate_Services.crt';
    } else {
      // use legacy VeriSign cert for other endpoint
      // eslint-disable-next-line max-len
      rootCAUrl = 'https://www.websecurity.digicert.com/content/dam/websitesecurity/digitalassets/desktop/pdfs/roots/VeriSign-Class%203-Public-Primary-Certification-Authority-G5.pem';
    }

    return await axios.get(rootCAUrl).then(res => res.data);
  }
}
