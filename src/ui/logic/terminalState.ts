import type { TerminalView } from '../terminal/terminal';

export function terminalState({ noAsk, ready, backlog }: Pick<TerminalView, 'noAsk' | 'ready' | 'backlog'>) {
  if (noAsk) return 'noask';
  if (ready > 0) return 'asking';
  return backlog >= 1 ? 'working' : 'empty';
}
