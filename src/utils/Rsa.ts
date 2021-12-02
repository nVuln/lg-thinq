import * as forge from 'node-forge';

export default class Rsa {
  public static generateKeyPair() {
    const keys = forge.pki.rsa.generateKeyPair(2048);

    return {
      privateKey: forge.pki.privateKeyToPem(keys.privateKey),
      publicKey: forge.pki.publicKeyToPem(keys.publicKey),
    };
  }

  public static generateCSR(keyPair) {
    const csr = forge.pki.createCertificationRequest();
    csr.publicKey = forge.pki.publicKeyFromPem(keyPair.publicKey);
    csr.setSubject([
      {
        shortName: 'CN',
        value: 'AWS IoT Certificate',
      },
      {
        shortName: 'O',
        value: 'Amazon',
      },
    ]);
    csr.sign(forge.pki.privateKeyFromPem(keyPair.privateKey), forge.md.sha256.create());

    return forge.pki.certificationRequestToPem(csr);
  }
}
