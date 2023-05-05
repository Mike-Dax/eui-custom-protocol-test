import {
  Connection,
  DeviceCandidate,
  DeviceID,
  DiscoveryHintValidator,
  Hint,
  Message,
  Transport,
} from '@electricui/core'
import { CancellationToken } from '@electricui/async-utilities'

import debug from 'debug'
import {
  addressAndCommandToMessageID,
  COMMAND_NAMES,
  MessageMetadata,
} from './common'

import crypto from 'crypto'

const debugLog = debug('protocol:hint-validator')

interface HintValidatorOptions {
  /**
   * How long to wait before giving up on a query for an address
   */
  perAddressTimeout?: number // ms
}

export class HintValidatorFirmwareAddressPoll extends DiscoveryHintValidator {
  private hasReceivedFirmwareVersion = false
  private perAddressTimeout: number
  constructor(
    hint: Hint,
    connection: Connection,
    cancellationToken: CancellationToken,
    options: HintValidatorOptions = {},
  ) {
    super(hint, connection, cancellationToken)

    this.perAddressTimeout = options.perAddressTimeout ?? 10 // Wait 10 ms
  }

  canValidate(hint: Hint): boolean {
    // we only have this one validator for this protocol, so always validate
    return true
  }

  private sendRequest = async (
    address: number,
    cancellationToken: CancellationToken,
  ) => {
    const waitForReply = this.connection
      .waitForReply<number>((replyMessage: Message) => {
        return (
          replyMessage.messageID ===
          addressAndCommandToMessageID(address, COMMAND_NAMES.CMD_RD_VERSION)
        )
      }, cancellationToken)
      .then(res => {
        console.log(`received response`)
        this.receivedResponse(res.payload, address)
      })

      .catch(e => {})

    // Request the board identifier
    const request = new Message<number, MessageMetadata>(
      addressAndCommandToMessageID(address, COMMAND_NAMES.CMD_RD_VERSION),
      0x00,
    )
    request.metadata.query = true
    request.metadata.address = address
    request.metadata.commandName = COMMAND_NAMES.CMD_RD_VERSION

    await this.connection.write(request, cancellationToken).catch(e => {})

    return waitForReply
  }

  private receivedResponse = (firmwareVersion: number, address: number) => {
    if (this.hasReceivedFirmwareVersion) {
      // bail, only succeed once
      return
    }

    // We've succeeded, stop sending messages
    this.hasReceivedFirmwareVersion = true

    const md5 = crypto.createHash('md5')
    md5.update(this.connection.getHash())
    
    // There aren't actual board IDs, so just mix the firmware version with the connection hash, we need to get the md5 hash
    // of it because boardIDs can't contain slashes
    let boardID = `${String(firmwareVersion)}-${md5.digest().toString('hex')}`

    const candidate = new DeviceCandidate(boardID as DeviceID, this.connection)

    this.pushDeviceCandidate(candidate, this.cancellationToken)

    this.complete()
  }

  public async startValidation() {
    // Loop from 0x01 to 0xfe

    for (let attempt = 0; attempt < 3; attempt++) {
      // Do 3 attempts
      for (let address = 0x01; address <= 0xfe; address++) {
        // Halt if the higher level token has been cancelled
        this.cancellationToken.haltIfCancelled()

        // If we've received it in the meantime, bail
        if (this.hasReceivedFirmwareVersion) {
          debugLog(
            'hasReceivedFirmwareVersion went true while waiting to send next search packet',
          )
          return
        }

        const cancellationToken = new CancellationToken(
          'validation attempt',
        ).deadline(this.perAddressTimeout)

        // If the root cancellation token cancels, trickle it down to this one.
        this.cancellationToken.subscribe(cancellationToken.cancel)

        try {
          await this.sendRequest(address, cancellationToken)
        } catch (e) {
          // If this wasn't a timeout, rethrow the error
          if (cancellationToken.caused(e) || this.cancellationToken.caused(e)) {
            // no problem
          } else {
            console.error(`write failure due to e`, e)

            throw e
          }
        } finally {
          this.cancellationToken.unsubscribe(cancellationToken.cancel)
        }
      }
    }

    if (!this.hasReceivedFirmwareVersion) {
      debugLog('Exhausted validator attempts, giving up.')
    }
    this.complete()
  }
}
