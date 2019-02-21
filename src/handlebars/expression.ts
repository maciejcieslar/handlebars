export const types = {
  embed: Symbol('embed'),
  helper: Symbol('helper'),
};

export class Expression {
  public constructor(public type: symbol, public children: Expression[] = []) {}
}

export class Embed {
  public constructor(public path: string) {}

  private getter(context: any) {
    if (this.path === '.') {
      return context;
    }

    const p = this.path.split('.').filter(Boolean);

    return p.reduce((result, pa) => {
      return result[pa];
    }, context);
  }

  public render({ context }) {
    return `${this.getter(context)}`;
  }
}

export class Helper {
  public constructor(
    public name: string,
    public context: string,
    public args: any[],
    public children: any[] = [],
  ) {}

  public render({ context, helpers }) {
    return helpers[this.name]({
      context: context[this.context],
      render: (newContext: object) => {
        return this.children.reduce((result, child) => {
          return `${result}${child.render({ helpers, context: newContext })}`;
        }, '');
      },
    });
  }
}

export class Comment {
  public constructor(public content: string) {}

  public render() {
    return '';
  }
}

export class Partial {
  public constructor(public name: string, public args: object) {}

  public render({ context, partials }) {
    return partials[this.name]({ ...context, ...this.args });
  }
}

export class CloseExpression {
  public constructor(public name: string) {}
}

export class Text {
  public constructor(public content: string) {}

  public render() {
    return this.content;
  }
}
