import { Text, Embed, Helper, Comment, CloseExpression, Partial } from './expression';
import { VStream } from './vstream';

type Expression = Embed | Helper | Comment | CloseExpression | Partial;

function parseArgumentsValue(value: string) {
  if (!value) {
    return undefined;
  }

  if (value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1).slice(0, -1);
  }

  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  if (value === 'null') {
    return null;
  }

  const numb = Number(value);

  if (!Number.isNaN(numb)) {
    return numb;
  }

  throw new Error(`Unknown value ${value}`);
}

function parseArguments(args: string[]) {
  return args.map((pair) => {
    const [key, value] = pair.split('=').map((v) => v.trim());

    if (!value) {
      return {
        key,
        value: true,
      };
    }

    return {
      key,
      value: parseArgumentsValue(value),
    };
  });
}

const expressionParsers = {
  '#': (content: string) => {
    const parts = content.trim().split(' ');

    const helperName = parts[0];
    const context = parts[1];
    const args = parseArguments(parts.slice(2));

    return new Helper(helperName, context, args, []);
  },
  '!': (content: string) => {
    return new Comment(content);
  },
  '>': (content: string) => {
    const parts = content.trim().split(' ');

    const partialName = parts[0];
    const args = parseArguments(parts.slice(1)).reduce((result, arg) => {
      return {
        ...result,
        [arg.key]: arg.value,
      };
    }, {});

    return new Partial(partialName, args);
  },
  '/': (content: string) => {
    return new CloseExpression(content);
  },
};

function parseExpression(content: string): Expression {
  const startChar = content[0];

  const parser = expressionParsers[startChar];

  if (!parser) {
    return new Embed(content);
  }

  return parser(content.slice(1));
}

export function parse(template: string) {
  const regExp = /\{\{(.*?)\}\}/g;

  let match = null;
  const parsed: Expression[] = [];
  let index = 0;

  while ((match = regExp.exec(template))) {
    const content = template.slice(index, match.index);

    if (content) {
      parsed.push(new Text(content));
    }

    parsed.push(parseExpression(match[1].trim()));

    index = match.index + match[0].length;
  }

  if (index <= template.length) {
    parsed.push(new Text(template.slice(index)));
  }

  return parsed;
}

function canHaveChildren(obj: any) {
  return obj instanceof Helper;
}

function findMatchFor(expr: any, stream: VStream<Expression>) {
  const children = [];

  while (!stream.isFinished()) {
    const nextExpr = stream.next();

    if (nextExpr instanceof CloseExpression) {
      if (expr.name !== nextExpr.name) {
        throw new Error(`Invalid closing tag for ${expr.name}: ${nextExpr.name}.`);
      }

      break;
    }

    if (canHaveChildren(nextExpr)) {
      children.push(findMatchFor(nextExpr, stream));

      continue;
    }

    children.push(nextExpr);
  }

  let i = 0;

  while (true && i < children.length) {
    if (!(children[i] instanceof Text)) {
      break;
    }

    children[i] = undefined;
    i += 1;
  }

  i = children.length - 1;

  while (true && i >= 0) {
    if (!(children[i] instanceof Text)) {
      break;
    }

    children[i] = undefined;
    i -= 1;
  }

  // TODO: return new expr
  expr.children = children.filter(Boolean);

  return expr;
}

export function createParsedTemplate(template: string) {
  const parsedExpressions = parse(template);
  const results = [];

  const stream = new VStream(parsedExpressions);

  while (!stream.isFinished()) {
    const expr = stream.next();

    if (canHaveChildren(expr)) {
      results.push(findMatchFor(expr, stream));

      continue;
    }

    results.push(expr);
  }

  return results;
}

export function createRenderer(
  template: string,
  { helpers: userHelpers = {}, partials: userPartials = {} } = {},
) {
  const parsedTemplate = createParsedTemplate(template);

  const helpers = Object.assign(
    {},
    {
      each: ({ context, render }) => {
        return context.map((value: any) => render(value)).join('\n');
      },
      if: ({ context, render }) => {
        if (!context) {
          return '';
        }

        return render(context);
      },
    },
    userHelpers,
  );

  const partials = Object.keys(userPartials).reduce((p, key) => {
    const partial = userPartials[key];

    return {
      ...p,
      [key]: createRenderer(partial, { helpers }),
    };
  }, {});

  // { context, helpers }
  return (context: any) => {
    return parsedTemplate.reduce((result, expr) => {
      return `${result}${expr.render({ context, helpers, partials })}`;
    }, '');
  };
}
