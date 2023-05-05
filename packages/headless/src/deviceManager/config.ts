import {
  Connection,
  Device,
  DeviceManager,
  Hint,
  MessageQueueImmediate,
  MessageRouterLastReceived,
} from '@electricui/core'

import { CancellationToken } from '@electricui/async-utilities'
import {
  buildSerialConsumer,
  buildSerialProducer,
  buildSerialTransportFactory,
  buildUsbProducer,
  buildUsbToSerialTransformer,
} from './serial'
import { HintValidatorFirmwareAddressPoll } from 'protocol'

// Create a device manager
export function deviceManagerFactory() {
  /**
   * Create our device manager!
   */
  const deviceManager = new DeviceManager()

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
      new HintValidatorFirmwareAddressPoll(hint, connection, cancellationToken)
    ]
  }

  function createHandshakes(
    device: Device,
    cancellationToken: CancellationToken,
  ) {
    return []
  }

  const serialProducer = buildSerialProducer()
  const transportFactory = buildSerialTransportFactory()
  const serialConsumer = buildSerialConsumer(transportFactory)
  const usbProducer = buildUsbProducer()
  const usbToSerialTransformer = buildUsbToSerialTransformer(serialProducer)

  deviceManager.setCreateHintValidatorsCallback(hintValidators)
  deviceManager.addHintProducers([serialProducer, usbProducer])
  deviceManager.addHintConsumers([serialConsumer])
  deviceManager.addHintTransformers([usbToSerialTransformer])
  deviceManager.setCreateRouterCallback(createRouter)
  deviceManager.setCreateQueueCallback(createQueue)
  deviceManager.setCreateHandshakesCallback(createHandshakes)

  return deviceManager
}
