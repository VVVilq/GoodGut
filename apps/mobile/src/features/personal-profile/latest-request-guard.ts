export class LatestRequestGuard {
  private generation = 0;

  begin(): () => boolean {
    const requestGeneration = ++this.generation;
    return () => requestGeneration === this.generation;
  }

  invalidate(): void {
    this.generation += 1;
  }
}
