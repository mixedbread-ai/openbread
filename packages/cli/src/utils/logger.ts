import {
  log as clackLog,
  spinner as clackSpinner,
  type SpinnerOptions,
} from "@clack/prompts";

const stderrOpts = { output: process.stderr } as const;

export const log = {
  message: (message?: string, opts = {}) =>
    clackLog.message(message, { ...stderrOpts, ...opts }),
  info: (message: string) => clackLog.info(message, stderrOpts),
  success: (message: string) => clackLog.success(message, stderrOpts),
  warn: (message: string) => clackLog.warn(message, stderrOpts),
  error: (message: string) => clackLog.error(message, stderrOpts),
  step: (message: string) => clackLog.step(message, stderrOpts),
};

export function spinner(opts: Omit<SpinnerOptions, "output"> = {}) {
  return clackSpinner({ ...opts, ...stderrOpts });
}
