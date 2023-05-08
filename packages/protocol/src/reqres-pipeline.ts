import { DuplexPipeline, Message, Pipeline } from '@electricui/core'
import { CancellationToken, Deferred } from '@electricui/async-utilities'

import { timing } from '@electricui/timing'

import { Mutex } from 'async-mutex'
import {
  addressAndCommandToMessageID,
  COMMAND_NAME,
  COMMAND_NAMES,
  COMMAND_NAME_TO_BYTE,
  messageIDToAddressAndCommand,
  MessageMetadata,
} from './common'

/**
 *  Request Response Queue pipeline
 *
 *  - Restrict messages to one at a time
 *  - If they're not queries, they complete immediately
 *  - If they're queries, wait until they time out or receive a reply.
 *  - If any reply is received before the timeout, complete the promise, mutate the address and messageID with who we sent it to
 */

export class RequestResponseEncoderPipeline extends Pipeline {
  constructor(private mutexWithMetadata: MutexWithMetadata) {
    super()
  }

  async receive(message: Message, cancellationToken: CancellationToken) {
    // Non query packets are passed straight through, immediately resolving, without taking a mutex
    if (!message.metadata.query) {
      return this.push(message, cancellationToken)
    }

    // Extract the command name and address and annotate the mutex with it
    const { commandName, address } = messageIDToAddressAndCommand(
      message.messageID,
    )

    // Broadcast packets will never be replied to, send the command but don't bother with the mutex.
    if (address === 0xff) {
      return this.push(message, cancellationToken)
    }

    // Queries need to grab a lock, then send the packet
    await this.mutexWithMetadata.mutex.runExclusive(() => {
      // This will be resolved by the other pipeline
      this.mutexWithMetadata.deferred = new Deferred()

      // If the cancellationToken fires, reject the deferred
      cancellationToken.subscribe(this.mutexWithMetadata.deferred.reject)

      // If it has already timed out, immediately reject, don't send the message
      cancellationToken.haltIfCancelled()

      this.mutexWithMetadata.commandName = commandName
      this.mutexWithMetadata.address = address

      // Send the query packet, wait for the response from the other pipeline
      const write = this.push(message, cancellationToken)

      // Wait for both to succeed before resolving
      return Promise.all([write, this.mutexWithMetadata.deferred.promise]).then(
        () => void 0,
      )
    }) // Queries are a lower weight than writes, and therefore happen after during a race
  }

  // Wipe all mutexes on disconnect
  onDisconnecting() {
    this.mutexWithMetadata.mutex.cancel()
  }
}

export class RequestResponseDecoderPipeline extends Pipeline {
  constructor(private mutexWithMetadata: MutexWithMetadata) {
    super()
  }

  receive(
    message: Message<number, MessageMetadata>,
    cancellationToken: CancellationToken,
  ) {
    // Check if this is a reply to something we're waiting for
    if (this.mutexWithMetadata.mutex.isLocked()) {
      if (this.mutexWithMetadata.commandName === message.metadata.commandName) {
        // Annotate the incoming packet with the address it was from,
        // since it's current address is 0x00, the master
        // and also annotate the messageID to include the new address
        message.metadata.address = this.mutexWithMetadata.address
        message.messageID = addressAndCommandToMessageID(
          this.mutexWithMetadata.address,
          this.mutexWithMetadata.commandName,
        )

        // release the lock
        this.mutexWithMetadata.deferred.resolve()
      } else {
        throw new Error(
          `received a packet from hardware that wasn't a response to our outgoing query`,
        )
      }
    }

    return this.push(message, cancellationToken)
  }
}

type MutexWithMetadata = {
  mutex: Mutex
  deferred: Deferred<void>
  commandName: COMMAND_NAME
  address: number
}

export class ReqResQueuePipeline extends DuplexPipeline {
  readPipeline: RequestResponseDecoderPipeline
  writePipeline: RequestResponseEncoderPipeline
  constructor() {
    super()

    const mutexWithMetadata: MutexWithMetadata = {
      mutex: new Mutex(),
      deferred: new Deferred(),
      commandName: COMMAND_NAMES.CMD_RD_VERSION, // just needs to be set to a valid one initially
      address: 0xff,
    }

    this.readPipeline = new RequestResponseDecoderPipeline(mutexWithMetadata)
    this.writePipeline = new RequestResponseEncoderPipeline(mutexWithMetadata)
  }
}
