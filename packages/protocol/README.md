# protocol

This is the protocol package.

## Overview

It's composed as a series of pipelines that work in this order:

Outgoing from UI:
 1. AbstractionEncoderPipeline
 2. CodecPipeline
 3. ReqResPipeline
 4. ProtocolPipeline
 5. FramingPipeline

 Incoming from hardware

 1. FramingPipeline
 2. ProtocolPipeline
 3. ReqResPipeline
 4. CodecPipeline
 5. AbstractionDecoderPipeline
## Caveats

- The Electric UI messageID maps to a unique piece of state on the hardware, so we treat the combination of address and command as the MessageID.
- Replied don't contain the address they were sent from, only the address they were sent to. This is kept track of and mutated on incoming messages.