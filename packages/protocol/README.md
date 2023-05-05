# protocol

This is the protocol package.

## Caveats

- The Electric UI messageID maps to a unique piece of state on the hardware, so we treat the combination of address and command as the MessageID.
- Replied don't contain the address they were sent from, only the address they were sent to. This is kept track of and mutated on incoming messages.