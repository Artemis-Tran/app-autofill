let scriptedChangeDepth = 0;

export function runWithScriptedChange<T>(fn: () => T): T {
  scriptedChangeDepth += 1;
  try {
    return fn();
  } finally {
    scriptedChangeDepth -= 1;
  }
}

export function isScriptedChangeInProgress(): boolean {
  return scriptedChangeDepth > 0;
}
