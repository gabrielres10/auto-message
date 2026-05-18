// Replaced by the split-queue architecture.
// This re-export keeps any old import paths working during the transition.
export { senderQueue as messageQueue } from "./sender.queue";
export { QUEUE_NAMES } from "./names";
