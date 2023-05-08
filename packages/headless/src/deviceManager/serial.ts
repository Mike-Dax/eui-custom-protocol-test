import {
  ConnectionInterface,
  ConnectionStaticMetadataReporter,
  DeliverabilityManagerOneShot,
  DiscoveryHintConsumer,
  Hint,
  QueryManagerNone,
  TransportFactory,
} from '@electricui/core'
import {
  SERIAL_TRANSPORT_KEY,
  SerialPortHintProducer,
  SerialPortUSBHintTransformer,
  SerialTransport,
  SerialTransportOptions,
  SerialPortHintConfiguration,
  SerialPortHintIdentification,
} from '@electricui/transport-node-serial'
import { SerialPort } from 'serialport'

import { usb } from 'usb'
import { USBHintProducer } from '@electricui/transport-node-usb-discovery'

import { TypeCache } from '@electricui/core'

import {
  FramingPipeline,
  ProtocolPipeline,
  ReqResQueuePipeline,
  CodecPipeline,
  AbstractionPipeline,
} from 'protocol'

export const typeCache = new TypeCache()

export function buildSerialProducer() {
  const serialProducer = new SerialPortHintProducer({
    SerialPort,
    baudRate: 115200,
  })

  return serialProducer
}

export function buildUsbProducer() {
  const usbProducer = new USBHintProducer({
    usb,
  })

  return usbProducer
}

export function buildSerialTransportFactory() {
  // Serial Ports
  const serialTransportFactory = new TransportFactory(
    (options: SerialTransportOptions) => {
      const connectionInterface = new ConnectionInterface()

      const transport = new SerialTransport(options)

      const deliverabilityManager = new DeliverabilityManagerOneShot(
        connectionInterface,
      )

      const queryManager = new QueryManagerNone(connectionInterface)

      const framingPipeline = new FramingPipeline()
      const protocolPipeline = new ProtocolPipeline()
      const reqresPipeline = new ReqResQueuePipeline()
      const codecPipeline = new CodecPipeline()
      const abstractionPipeline = new AbstractionPipeline()
  
      const connectionStaticMetadata = new ConnectionStaticMetadataReporter({
        name: 'Serial',
        baudRate: options.baudRate,
      })

      connectionInterface.setTransport(transport)
      connectionInterface.setQueryManager(queryManager)
      connectionInterface.setDeliverabilityManager(deliverabilityManager)
      connectionInterface.setPipelines([
        framingPipeline,
        protocolPipeline,
        reqresPipeline,
        codecPipeline,
        abstractionPipeline,
      ])
      connectionInterface.addMetadataReporters([connectionStaticMetadata])

      return connectionInterface.finalise()
    },
  )

  return serialTransportFactory
}

export function buildSerialConsumer(serialTransportFactory: TransportFactory) {
  const serialConsumer = new DiscoveryHintConsumer({
    factory: serialTransportFactory,
    canConsume: (
      hint: Hint<SerialPortHintIdentification, SerialPortHintConfiguration>,
    ) => {
      if (hint.getTransportKey() === SERIAL_TRANSPORT_KEY) {
        // If you wanted to filter for specific serial devices, you would modify this section, removing the
        // return statement below and uncommenting the block below it, modifying it to your needs.
        const identification = hint.getIdentification()

        // Don't use the bluetooth device on MacOS
        if (identification.path.includes('Bluetooth')) {
          return false
        }

        return true
      }
      return false
    },
    configure: (
      hint: Hint<SerialPortHintIdentification, SerialPortHintConfiguration>,
    ) => {
      const identification = hint.getIdentification()
      const configuration = hint.getConfiguration()

      const options: SerialTransportOptions = {
        SerialPort,
        path: identification.path,
        baudRate: configuration.baudRate,
        attachmentDelay: 500, // if you have an arduino that resets on connection, set this to 2000.
      }
      return options
    },
  })
  return serialConsumer
}

export function buildUsbToSerialTransformer(
  serialProducer: SerialPortHintProducer,
) {
  const usbToSerialTransformer = new SerialPortUSBHintTransformer({
    producer: serialProducer,
  })

  return usbToSerialTransformer
}
