import type { AbiEvent, PublicClient } from "viem";

/** BSC caps eth_getLogs ranges, so read in chunks (2,000 blocks each). */
const CHUNK_BLOCKS = 2000n;

interface GetLogsChunkedArgs {
  address: `0x${string}`;
  event: AbiEvent;
  args?: Record<string, unknown>;
  fromBlock: bigint;
  toBlock: bigint;
  onProgress?: (doneBlocks: bigint, totalBlocks: bigint) => void;
}

/**
 * getLogs over [fromBlock, toBlock] in CHUNK_BLOCKS-sized calls.
 * Returns logs in ascending block order (callers sort as they need).
 */
export async function getLogsChunked(
  client: PublicClient,
  { address, event, args, fromBlock, toBlock, onProgress }: GetLogsChunkedArgs,
): Promise<unknown[]> {
  const total = toBlock >= fromBlock ? toBlock - fromBlock + 1n : 0n;
  const out: unknown[] = [];
  let from = fromBlock;
  while (from <= toBlock) {
    const to = from + CHUNK_BLOCKS - 1n > toBlock ? toBlock : from + CHUNK_BLOCKS - 1n;
    const logs = await client.getLogs({ address, event, args, fromBlock: from, toBlock: to });
    out.push(...(logs as unknown[]));
    onProgress?.(to - fromBlock + 1n, total);
    from = to + 1n;
  }
  return out;
}
