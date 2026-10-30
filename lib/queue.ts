import { QueueClient } from "@vercel/queue";

// The Vercel project currently deploys Functions in iad1. Pin the queue region
// so producer and push consumer share a predictable regional queue.
const queue = new QueueClient({ region: "iad1" });

export const { send, handleCallback } = queue;
