import {
  CancellationToken,
  Connection,
  Device,
  DeviceManager,
  Hint,
  hotReloadDeviceManager,
  MessageRouterLastReceived,
  MessageQueueImmediate,
} from '@electricui/core'
import {
  serialConsumer,
  serialProducer,
  usbProducer,
  usbToSerialTransformer,
} from './serial'

import { HintValidatorFirmwareAddressPoll } from 'protocol'

/**
 * Create our device manager!
 */
export const deviceManager = new DeviceManager()

function createRouter(device: Device) {
  const router = new MessageRouterLastReceived(device)

  return router
}

function createQueue(device: Device) {
  return new MessageQueueImmediate(device)
}

function hintValidators(
  hint: Hint,
  connection: Connection,
  cancellationToken: CancellationToken,
) {
  return [
    new HintValidatorFirmwareAddressPoll(hint, connection, cancellationToken),
  ]
}

function createHandshakes(
  device: Device,
  cancellationToken: CancellationToken,
) {
  return []
}

deviceManager.setCreateHintValidatorsCallback(hintValidators)
deviceManager.addHintProducers([serialProducer, usbProducer])
deviceManager.addHintConsumers([serialConsumer])
deviceManager.addHintTransformers([usbToSerialTransformer])
deviceManager.setCreateRouterCallback(createRouter)
deviceManager.setCreateQueueCallback(createQueue)
deviceManager.setCreateHandshakesCallback(createHandshakes)

// start polling immediately, poll for 10 seconds
const cancellationToken = new CancellationToken('inital poll').deadline(10_000)
deviceManager.poll(cancellationToken).catch(err => {
  if (cancellationToken.caused(err)) {
    console.log("Didn't find any devices on initial poll")
  }
})

const [dispose, refresh] = hotReloadDeviceManager(deviceManager)

if (module.hot) {
  module.hot.dispose(dispose)
  refresh(module.hot.data)
}
