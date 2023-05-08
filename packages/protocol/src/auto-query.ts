import { Message, Pipeline, DuplexPipeline } from '@electricui/core'
import {
  COMMAND_NAME,
  COMMAND_NAMES,
  messageIDToAddressAndCommand,
  MessageMetadata,
} from './common'
import { CancellationToken } from '@electricui/async-utilities'

export function isQueryCommand(commandName: COMMAND_NAME) {
  switch (commandName) {
    case COMMAND_NAMES.CMD_PULSE_AMP_RD:
      return true
    case COMMAND_NAMES.CMD_PULSE_AMP_B_RD:
      return true
    case COMMAND_NAMES.CMD_PULSE_AMP_T_RD:
      return true
    case COMMAND_NAMES.CMD_PULSE_AMP_TB_RD:
      return true
    case COMMAND_NAMES.CMD_STRB_PW_RD:
      return true
    case COMMAND_NAMES.CMD_STRB_DELAY_RD:
      return true
    case COMMAND_NAMES.CMD_RD_MODE:
      return true
    case COMMAND_NAMES.CMD_RD_VERSION:
      return true
    case COMMAND_NAMES.CMD_OFFSET_RD:
      return true
    case COMMAND_NAMES.CMD_SCALE_RD:
      return true
    case COMMAND_NAMES.CMD_ENGR_RD:
      return true
    default:
      return false
  }
}

/**
 * This pipeline smoothes over some idiosyncrasies with the protocol
 *
 * It automatically marks any 'read' message as a query, if it is a query, sets the data byte to 0x00,
 * and appends the messageID based commandName and address data to the metadata field.
 */
export class AutoQueryEncoderPipeline extends Pipeline {
  receive(
    message: Message<number, MessageMetadata>,
    cancellationToken: CancellationToken,
  ) {
    const { commandName, address } = messageIDToAddressAndCommand(
      message.messageID,
    )
    const isQuery = isQueryCommand(commandName)
    message.metadata.query = isQuery

    if (isQuery) {
      message.payload = 0x00
    }

    // This is the top level codec, so also set the address and commandName
    // from up here for neatness.
    message.metadata.address = address
    message.metadata.commandName = commandName

    return this.push(message, cancellationToken)
  }
}

export class NoopPipeline extends Pipeline {
  receive(message: Message, cancellationToken: CancellationToken) {
    return this.push(message, cancellationToken)
  }
}

export class AutoQueryPipeline extends DuplexPipeline {
  readPipeline: NoopPipeline
  writePipeline: AutoQueryEncoderPipeline
  constructor() {
    super()

    this.readPipeline = new NoopPipeline()
    this.writePipeline = new AutoQueryEncoderPipeline()
  }
}
