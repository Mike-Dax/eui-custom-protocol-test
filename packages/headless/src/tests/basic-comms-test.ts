import {
  CancellationToken,
  Connection,
  Device,
  DeviceManager,
  Hint,
  MANAGER_EVENTS,
  Message,
  MessageID,
  Pipeline,
  PipelinePromise,
  UsageRequest,
} from '@electricui/core'
import inquirer from 'inquirer'
import type { KeyDescriptor } from 'inquirer-press-to-continue'

import {
  StreamReport,
  sleep,
  findAnyDevice,
  startDeviceSession,
} from '@electricui/script-utilities'
import { LogMessageName } from '../LogMessageName'

import { deviceManagerFactory } from '../deviceManager/config'
import {
  SerialPortHintConfiguration,
  SerialPortHintIdentification,
  SerialTransport,
  SerialTransportOptions,
} from '@electricui/transport-node-serial'
import {
  buildSerialConsumer,
  buildSerialProducer,
  buildSerialTransportFactory,
} from '../deviceManager/serial'

import {
  FramingPipeline,
  ProtocolPipeline,
  COMMAND_CHANNELS,
  MessageMetadata,
  decode,
  byteToHexString,
  addressAndChannelToMessageID,
} from 'protocol'

async function keypress(message: string) {
  await inquirer.prompt<{ key: KeyDescriptor }>({
    name: 'key',
    type: 'press-to-continue',
    anyKey: true,
    pressToContinueMessage: message,
  })

  // The StreamReport doesn't play well with the spinner
  console.log('')
}

/**
 * collect hints directly from the serial producer
 */
async function collectHints(deadline: number = 1_000) {
  const serialProducer = buildSerialProducer()

  const cancellationToken = new CancellationToken(
    'initial hint collection',
  ).deadline(deadline)

  const list: Hint<
    SerialPortHintIdentification,
    SerialPortHintConfiguration
  >[] = []

  serialProducer.setFoundHintCallback(
    async (
      hint: Hint<SerialPortHintIdentification, SerialPortHintConfiguration>,
    ) => {
      if (hint.isAvailabilityHint()) {
        list.push(hint)
      }
    },
  )

  await serialProducer.poll(cancellationToken)

  return list
}

export const handshake = async (report: StreamReport) => {
  /*  await keypress(
    `This tool will execute some initial commands step by step. Please disconnect your device, then press any key to continue...`,
  )

  const initialHintsList = await collectHints()
  const initialHintHashesList = initialHintsList.map(hint => hint.getHash())

  await keypress(
    `Please connect your device, then press any key to continue...`,
  )
*/
  const initialHintHashesList: string[] = []
  const subsequentHintsList = await collectHints()

  // Produce our diff of hints
  const newHints: Hint<
    SerialPortHintIdentification,
    SerialPortHintConfiguration
  >[] = []

  for (const newHint of subsequentHintsList) {
    if (!initialHintHashesList.includes(newHint.getHash())) {
      newHints.push(newHint)
    }
  }

  let chosenHint = newHints[0]

  if (newHints.length === 0) {
    report.reportError(
      LogMessageName.EXCEPTION,
      `Could not find any serial devices...`,
    )
    return
  } else if (newHints.length > 1) {
    // More than one device found, pick one
    const { hint } = await inquirer.prompt({
      name: 'hint',
      type: 'list',
      message: 'Which serial port is your device? More than one was detected.',
      choices: newHints.map(hint => {
        const { path, manufacturer, productId, vendorId, serialNumber } =
          hint.getIdentification()

        let name = `${path},`

        if (manufacturer) {
          name += ` Manufacturer: ${manufacturer},`
        }

        if (productId) {
          name += ` PID: ${productId},`
        }

        if (vendorId) {
          name += ` VID: ${vendorId},`
        }

        if (serialNumber) {
          name += ` SN: ${serialNumber},`
        }

        // Remove the last comma
        name = name.slice(0, -1)

        return {
          name,
          value: hint,
        }
      }),
    })

    chosenHint = hint
  }

  // Build a connection manually
  const transportFactory = buildSerialTransportFactory()

  const overallConnectionCancellationToken = new CancellationToken()
  const usageRequest = 'handshake-test' as UsageRequest

  report.reportInfo(LogMessageName.TRANSIENT, `Building transport factory`)

  const hintConsumer = buildSerialConsumer(transportFactory)
  const connectionInterface = hintConsumer.getConnectionInterface(chosenHint)
  const connection = new Connection(connectionInterface)

  report.reportInfo(LogMessageName.TRANSIENT, `Connecting...`)
  await connection.addUsageRequest(
    usageRequest,
    overallConnectionCancellationToken,
  )
  report.reportInfo(LogMessageName.TRANSIENT, `Connected.`)

  await keypress(`Press any key to send a CMD_RD_VERSION request...`)

  {
    // Try a board ID packet
    const readAllVersions = new Message<number, MessageMetadata>(
      addressAndChannelToMessageID(0x01, COMMAND_CHANNELS.LAMP_FIRMWARE_VERSION), // read 0x01 first
      0x00,
    )

    const boardIDCancellationToken = new CancellationToken(
      `CMD_RD_VERSION request`,
    ).deadline(1000)

    const response = await sendMessageWaitForResponse<
      Message<number, MessageMetadata>
    >(
      report,
      connection,
      readAllVersions,
      message => message.metadata.channel === COMMAND_CHANNELS.LAMP_FIRMWARE_VERSION,
      boardIDCancellationToken,
      `Sending CMD_RD_VERSION request packet`,
    )

    report.reportInfo(
      LogMessageName.UNNAMED,
      `Successfully received ${response.messageID}: ${response.payload}`,
    )
  }

  report.reportInfo(LogMessageName.UNNAMED, 'Initial test completed')
}

async function sendMessageWaitForResponse<M extends Message>(
  report: StreamReport,
  connection: Connection,
  message: M,
  criteria: (message: M) => boolean,
  cancellationToken: CancellationToken,
  startMessage: string,
) {
  // At the absolute lowest level, override the transport data callback to collect data
  const transport = connection.connectionInterface.transport! as SerialTransport

  const framingDecoder = new FramingPipeline()

  framingDecoder.readPipeline.push = (
    chunk: Buffer,
    cancellationToken: CancellationToken,
  ) => {
    report.reportInfo(
      LogMessageName.TRANSIENT,
      ` framing decoded: ${bufferToHexString(chunk)}`,
    )

    try {
      const decoded = decode(chunk)

      report.reportInfo(
        LogMessageName.TRANSIENT,
        `  protocol decoded: ${
          decoded.metadata.commandName
        } command to address ${decoded.metadata.address}: ${
          decoded.payload === null
            ? 'null payload'
            : byteToHexString(decoded.payload)
        }`,
      )
    } catch (e) {
      report.reportError(
        LogMessageName.EXCEPTION,
        `failed to decode packet: ${e}`,
      )
    }

    return Promise.resolve()
  }

  const originalPush = transport.readPipeline.push
  transport.readPipeline.push = (
    chunk: Buffer,
    cancellationToken: CancellationToken,
  ) => {
    report.reportInfo(
      LogMessageName.TRANSIENT,
      `received raw: ${bufferToHexString(chunk)}`,
    )

    // Pass it up to COBS to decode
    framingDecoder.readPipeline.receive(chunk, cancellationToken)

    return originalPush(chunk, cancellationToken)
  }

  let res: M

  try {
    await report.startTimerPromise(
      startMessage,
      {
        wipeForgettableOnComplete: true,
      },
      async () => {
        const waitForReply = connection.waitForReply(
          criteria,
          cancellationToken,
        )

        try {
          await connection.write(message, cancellationToken)
        } catch (e) {
          if (cancellationToken.caused(e)) {
            // timed out sending
            report.reportError(
              LogMessageName.EXCEPTION,
              `failed to send: ${message.messageID}, timed out`,
            )
          } else {
            report.reportError(
              LogMessageName.EXCEPTION,
              `failed to send: ${message.messageID}`,
            )
            throw e
          }
        }

        try {
          await waitForReply
        } catch (e) {
          if (cancellationToken.caused(e)) {
            // timed out waiting
            report.reportError(
              LogMessageName.EXCEPTION,
              `failed to receive reply in time`,
            )
            throw new Error(`timed out`)
          } else {
            report.reportError(
              LogMessageName.EXCEPTION,
              `failed to receive reply`,
            )
            throw e
          }
        }

        res = (await waitForReply) as M

        await keypress(`Step successful, press any key to continue...`)
      },
    )
  } catch (e) {
    if (cancellationToken.caused(e)) {
      report.reportError(LogMessageName.EXCEPTION, `timed out`)
      throw new Error(`timed out`)
    } else {
      report.reportError(
        LogMessageName.EXCEPTION,
        `failed to handle packet ${e}`,
      )
      throw e
    }
  } finally {
    // Reset the transport pipe
    transport.readPipeline.push = originalPush
  }

  return res!
}

function bufferToHexString(buffer: Buffer): string {
  return Array.from(buffer)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join(' ')
}
