import { CancellationToken } from "@electricui/async-utilities";
import { describe, expect, it } from "@jest/globals";

import { FramingDecoderPipeline } from "../src/framing";
import * as sinon from "sinon";

function generateDecoderEqualityTest(
  testCase: Buffer,
  reference: Buffer | Buffer[]
) {
  return async () => {
    const spy = sinon.spy();

    const pipeline = new FramingDecoderPipeline();

    pipeline.push = async (
      packet: Buffer,
      cancellationToken: CancellationToken
    ) => {
      spy(packet);
    };

    await pipeline.receive(testCase, new CancellationToken().deadline(1000));

    const calls = Array.isArray(reference) ? reference : [reference];

    for (let index = 0; index < calls.length; index++) {
      const referenceCall = calls[index];

      // Validate every packet is valid
      expect(spy.getCall(index).args[0]).toEqual(referenceCall);
    }

    // The decoder should be called as many times as there are reference calls
    expect(spy.getCalls().length).toBe(calls.length);
  };
}

describe("Framing Decoder", () => {
  it(
    "handles a golden packet",
    generateDecoderEqualityTest(
      Buffer.from([0xfe, 0x02, 0x83, 0x88, 0xfd]),
      Buffer.from([0xfe, 0x02, 0x83, 0x88, 0xfd])
    )
  );
  it(
    "handles a packet with some garbage before it",
    generateDecoderEqualityTest(
      Buffer.from([0x01, 0x02, 0x03, 0xfe, 0x02, 0x83, 0x88, 0xfd]),
      Buffer.from([0xfe, 0x02, 0x83, 0x88, 0xfd])
    )
  );
  it(
    "handles a packet with redundant framing bytes before it",
    generateDecoderEqualityTest(
      Buffer.from([0xfe, 0xfe, 0xfe, 0xfe, 0x02, 0x83, 0x88, 0xfd]),
      Buffer.from([0xfe, 0x02, 0x83, 0x88, 0xfd])
    )
  );
  it(
    "handles a packet with redundant framing bytes after it",
    generateDecoderEqualityTest(
      Buffer.from([0xfe, 0x02, 0x83, 0x88, 0xfd, 0xfd, 0xfd]),
      Buffer.from([0xfe, 0x02, 0x83, 0x88, 0xfd])
    )
  );
  it("doesn't cause a memory leak if there's lots of garbage", async () => {
    const pipeline = new FramingDecoderPipeline();

    await pipeline.receive(
      Buffer.from([
        0x02, 0x02, 0x02, 0x02, 0x02, 0x02, 0x02, 0x02, 0x02, 0x02, 0x02, 0x02,
        0x02, 0x02, 0x02, 0x02, 0x02, 0x02, 0x02,
      ]),
      new CancellationToken().deadline(1000)
    );

    expect(pipeline.buffer.length).toBeLessThan(5);
  });
});
