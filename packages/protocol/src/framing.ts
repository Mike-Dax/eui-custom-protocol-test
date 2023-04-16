import { DuplexPipeline, Pipeline, PipelinePromise } from "@electricui/core";
import { CancellationToken } from "@electricui/async-utilities";
import { FRAMING_START, FRAMING_END } from "./common";

import debug from "debug";

const dFraming = debug("protocol:framing");

// A noop, the encoder will always produce correctly framed data
export class FramingEncoderPipeline extends Pipeline {
  receive(packet: Buffer, cancellationToken: CancellationToken) {
    return this.push(packet, cancellationToken);
  }
}

export class FramingDecoderPipeline extends Pipeline {
  buffer = Buffer.alloc(0);

  async receive(packet: Buffer, cancellationToken: CancellationToken) {
    dFraming(`Received data to framing decode`, packet);

    let data = Buffer.concat([this.buffer, packet]);

    const promises: PipelinePromise[] = [];

    // As long as there's 5 or more bytes of data in the buffer, run a pass
    while (data.length >= 5) {
      const potentialFramingStart = data[0] // prettier-ignore
      const potentialAddress =      data[1] // prettier-ignore
      const potentialCommand =      data[2] // prettier-ignore
      const potentialData =         data[3] // prettier-ignore
      const potentialFramingEnd =   data[4] // prettier-ignore

      // Check if it's a valid packet
      if (
        potentialFramingStart === FRAMING_START &&
        potentialAddress !== FRAMING_START &&
        potentialAddress !== FRAMING_END &&
        potentialCommand !== FRAMING_START &&
        potentialCommand !== FRAMING_END &&
        potentialFramingEnd === FRAMING_END
      ) {
        // This packet passes, grab a slice of the buffer, bytes 0 to 4
        const packet = data.slice(0, 5);

        // Send it up the pipeline
        promises.push(this.push(packet, cancellationToken));

        // Wipe the buffer from byte 0 to 4
        data = data.slice(5);
      } else {
        // If this window fails, slice a byte off the front of the buffer and try again
        data = data.slice(1);
      }
    }
    await Promise.all(promises);
  }
}

/**
 * The framing duplex pipeline
 */
export class FramingPipeline extends DuplexPipeline {
  readPipeline: FramingDecoderPipeline;
  writePipeline: FramingEncoderPipeline;

  constructor() {
    super();
    this.readPipeline = new FramingDecoderPipeline();
    this.writePipeline = new FramingEncoderPipeline();
  }
}
