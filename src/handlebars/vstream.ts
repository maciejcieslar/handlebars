export class VStream<T> {
  private index: number = 0;
  public constructor(private collection: T[]) {}

  next() {
    const expression = this.collection[this.index];

    this.index += 1;

    return expression;
  }

  goBack() {
    this.index -= 1;

    return this;
  }

  isFinished() {
    return this.index >= this.collection.length;
  }
}
