import { Message, Pipeline, DuplexPipeline } from '@electricui/core'
import {
  COMMAND_NAME,
  COMMAND_NAMES,
  messageIDToAddressAndChannel,
  MessageMetadata,
  COMMAND_CHANNELS,
  COMMAND_CHANNEL,
} from './common'
import { CancellationToken } from '@electricui/async-utilities'

export const commandChannelToReadCommand = {
  [COMMAND_CHANNELS.LAMP_ADDRESS]: null,
  [COMMAND_CHANNELS.PULSE_INTENSITY_BOTTOM_IR]:
    COMMAND_NAMES.CMD_PULSE_AMP_B_RD,
  [COMMAND_CHANNELS.PULSE_INTENSITY_TOP_WHITE]:
    COMMAND_NAMES.CMD_PULSE_AMP_T_RD,
  [COMMAND_CHANNELS.STROBE_PULSE_WIDTH]: COMMAND_NAMES.CMD_STRB_PW_RD,
  [COMMAND_CHANNELS.STROBE_PULSE_DELAY]: COMMAND_NAMES.CMD_STRB_DELAY_RD,
  [COMMAND_CHANNELS.HEALTH_STATUS]: COMMAND_NAMES.CMD_READ_ERRORS,
  [COMMAND_CHANNELS.TRIGGER_STROBE]: null,
  [COMMAND_CHANNELS.LAMP_FIRMWARE_VERSION]: COMMAND_NAMES.CMD_RD_VERSION,
  [COMMAND_CHANNELS.JUMP_TO_BOOTLOADER]: null,
  [COMMAND_CHANNELS.JUMP_TO_APPLICATION]: null,
  [COMMAND_CHANNELS.CALIBRATION_OFFSET]: COMMAND_NAMES.CMD_OFFSET_RD,
  [COMMAND_CHANNELS.CALIBRATION_SCALE]: COMMAND_NAMES.CMD_SCALE_RD,
  [COMMAND_CHANNELS.ENGINEERING_DATA]: COMMAND_NAMES.CMD_ENGR_RD,
  [COMMAND_CHANNELS.OPTIONS]: null,
} as const

export const commandChannelToWriteCommand = {
  [COMMAND_CHANNELS.LAMP_ADDRESS]: COMMAND_NAMES.CMD_SET_ADDRESS,
  [COMMAND_CHANNELS.PULSE_INTENSITY_BOTTOM_IR]:
    COMMAND_NAMES.CMD_PULSE_AMP_B_SET,
  [COMMAND_CHANNELS.PULSE_INTENSITY_TOP_WHITE]:
    COMMAND_NAMES.CMD_PULSE_AMP_T_SET,
  [COMMAND_CHANNELS.STROBE_PULSE_WIDTH]: COMMAND_NAMES.CMD_STRB_PW_SET,
  [COMMAND_CHANNELS.STROBE_PULSE_DELAY]: COMMAND_NAMES.CMD_STRB_DELAY_SET,
  [COMMAND_CHANNELS.HEALTH_STATUS]: null,
  [COMMAND_CHANNELS.TRIGGER_STROBE]: COMMAND_NAMES.CMD_TRIGGER_NOW,
  [COMMAND_CHANNELS.LAMP_FIRMWARE_VERSION]: null,
  [COMMAND_CHANNELS.JUMP_TO_BOOTLOADER]: COMMAND_NAMES.CMD_JMP_BOOT,
  [COMMAND_CHANNELS.JUMP_TO_APPLICATION]: COMMAND_NAMES.CMD_JMP_APP,
  [COMMAND_CHANNELS.CALIBRATION_OFFSET]: null,
  [COMMAND_CHANNELS.CALIBRATION_SCALE]: null,
  [COMMAND_CHANNELS.ENGINEERING_DATA]: null,
  [COMMAND_CHANNELS.OPTIONS]: COMMAND_NAMES.CMD_SET_MODE,
} as const

export class AbstractionEncoderPipeline extends Pipeline {
  constructor() {
    super()
  }

  sendDownstream(
    message: Message<number, MessageMetadata>,
    cancellationToken: CancellationToken,
  ) {
    const { channel, address } = messageIDToAddressAndChannel(message.messageID)

    let commandName = null

    // Different commands for read and write
    if (message.metadata.query) {
      commandName =
        commandChannelToReadCommand[
          channel as keyof typeof commandChannelToReadCommand
        ]
    } else {
      commandName =
        commandChannelToWriteCommand[
          channel as keyof typeof commandChannelToReadCommand
        ]
    }

    if (!commandName) {
      // If the commandName is null, it's an invalid command, throw a warning then resolve
      console.warn(
        `No valid command found for channel ${channel} on ${
          message.metadata.query ? 'read' : 'write'
        }`,
      )

      return Promise.resolve()
    }

    // Set the address and command name metadata for the lower layers
    message.metadata.address = address
    message.metadata.commandName = commandName
    message.metadata.channel = channel

    return this.push(message, cancellationToken)
  }

  async receive(
    message: Message<number, MessageMetadata>,
    cancellationToken: CancellationToken,
  ) {
    const { channel, address } = messageIDToAddressAndChannel(message.messageID)

    if (message.metadata.query) {
      // Send queries directly
      return this.sendDownstream(message, cancellationToken)
    } else if (address === 0xff) {
      // It's a broadcast, just forward the message
      return this.sendDownstream(message, cancellationToken)
    } else {
      // Writes, send both the write and then a query if possible to validate it
      const queryMessage = new Message<number, MessageMetadata>(
        message.messageID,
        0x00,
      )
      queryMessage.metadata.query = true

      // First send the set message
      await this.sendDownstream(message, cancellationToken)

      // Then send a query to validate the changes
      return this.sendDownstream(queryMessage, cancellationToken)
    }
  }
}

export class AbstractionDecoderPipeline extends Pipeline {
  receive(
    message: Message<number, MessageMetadata>,
    cancellationToken: CancellationToken,
  ) {
    // The protocol pipeline has already set everything, pass it on up unmodified

    return this.push(message, cancellationToken)
  }
}

/**
 * This pipeline converts the application layer channels into commands
 */
export class AbstractionPipeline extends DuplexPipeline {
  readPipeline: AbstractionDecoderPipeline
  writePipeline: AbstractionEncoderPipeline
  constructor() {
    super()

    this.readPipeline = new AbstractionDecoderPipeline()
    this.writePipeline = new AbstractionEncoderPipeline()
  }
}
