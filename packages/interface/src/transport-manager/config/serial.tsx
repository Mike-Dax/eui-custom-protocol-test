import {
  BinaryPipeline,
  BinaryTypeCachePipeline,
  DeliverabilityManagerBinaryProtocol,
  QueryManagerBinaryProtocol,
  UndefinedMessageIDGuardPipeline,
} from '@electricui/protocol-binary'
import {
  ConnectionInterface,
  ConnectionStaticMetadataReporter,
  DeliverabilityManagerOneShot,
  DiscoveryHintConsumer,
  Hint,
  QueryManagerNone,
  TransportFactory,
  TypeCache,
} from '@electricui/core'
import {
  SerialPortHintConfiguration,
  SerialPortHintIdentification,
  SerialPortHintProducer,
  SerialPortUSBHintTransformer,
  SerialTransport,
  SerialTransportOptions,
} from '@electricui/transport-node-serial'

import { BinaryLargePacketHandlerPipeline } from '@electricui/protocol-binary-large-packet-handler'
import { COBSPipeline } from '@electricui/protocol-binary-cobs'
import { HeartbeatConnectionMetadataReporter } from '@electricui/protocol-binary-heartbeats'
import { SerialPort } from 'serialport'
import { usb } from 'usb'
import { USBHintProducer } from '@electricui/transport-node-usb-discovery'
import { LEDCodec } from './codecs'
import { CodecDuplexPipelineWithDefaults } from '@electricui/protocol-binary-codecs'

import {
  FramingPipeline,
  ProtocolPipeline,
  COMMAND_NAMES,
  MessageMetadata,
  decode,
  byteToHexString,
} from 'protocol'

const typeCache = new TypeCache()

const serialProducer = new SerialPortHintProducer({
  SerialPort,
  baudRate: 115200,
})

const usbProducer = new USBHintProducer({
  usb,
})

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

    // const codecPipeline = new CodecDuplexPipelineWithDefaults({
    //   passthroughNoMatch: true,
    // })

    // // Add custom codecs.
    // codecPipeline.addCodecs(customCodecs)

    const connectionStaticMetadata = new ConnectionStaticMetadataReporter({
      name: 'Serial',
      baudRate: options.baudRate,
    })

    connectionInterface.setTransport(transport)
    connectionInterface.setQueryManager(queryManager)
    connectionInterface.setDeliverabilityManager(deliverabilityManager)
    connectionInterface.setPipelines([framingPipeline, protocolPipeline])
    connectionInterface.addMetadataReporters([connectionStaticMetadata])

    return connectionInterface.finalise()
  },
)

const serialConsumer = new DiscoveryHintConsumer({
  factory: serialTransportFactory,
  canConsume: (
    hint: Hint<SerialPortHintIdentification, SerialPortHintConfiguration>,
  ) => {
    if (hint.getTransportKey() === 'serial') {
      // If you wanted to filter for specific serial devices, you would modify this section, removing the
      // return statement below and uncommenting the block below it, modifying it to your needs.

      const identification = hint.getIdentification()

      // Filter out any /dev/ttyS____ comPaths since they're almost certainly terminals
      if (identification.path.startsWith('/dev/ttyS')) {
        return false
      }

      // An example of filtering devices with Arduino or Silicon in the manufacturers
      /*
      return (
        identification.manufacturer && (
          identification.manufacturer.includes('Arduino') ||
          identification.manufacturer.includes('Silicon'))
      )
      */

      // Try any device that isn't filtered out by this stage
      return true
    }
    return false
  },
  configure: (hint: Hint) => {
    const identification = hint.getIdentification()
    const configuration = hint.getConfiguration()

    const options: SerialTransportOptions = {
      SerialPort,
      path: identification.path,
      baudRate: configuration.baudRate,
      // if you have an Arduino that resets on connection, uncomment this line to delay the connection
      attachmentDelay: 2500,
    }

    return options
  },
})

const usbToSerialTransformer = new SerialPortUSBHintTransformer({
  producer: serialProducer,
})

export { serialConsumer, serialProducer, usbProducer, usbToSerialTransformer }
