import { runBenchmark } from '../lib/benchmarkEngine';
import type { Deposit } from '../data/seed';

self.onmessage = (e: MessageEvent<{ deposits: Deposit[]; simulatedDate: string }>) => {
  const { deposits, simulatedDate } = e.data;
  try {
    const report = runBenchmark(deposits, simulatedDate);
    self.postMessage({ success: true, report });
  } catch (error: any) {
    self.postMessage({ success: false, error: error.message || 'Worker benchmark execution failed' });
  }
};
