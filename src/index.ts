import moduleAlias from 'module-alias';
import handlebars from 'handlebars';

moduleAlias.addAliases({
  src: __dirname,
});

import { compile } from './handlebars';

const template = `
<div class="entry">
  <h1>{{title}}</h1>
  <div class="body">
    {{body}}
  </div>

  {{> userMessage tagName="h1" }}
</div>
s
{{#each comments}}
{{.}}
{{/each}}
xd`;

handlebars.registerPartial(
  'userMessage',
  '<{{tagName}}>By {{author.firstName}} {{author.lastName}}</{{tagName}}>',
);

const handle = handlebars.compile(template);

const templ = compile(template, {
  partials: {
    userMessage: '<{{tagName}}>By {{author.firstName}} {{author.lastName}}</{{tagName}}>',
  },
});

console.time('handlebars');
console.log(
  handle({
    title: 'Title',
    body: 'Body',
    comments: ['comment1', 'comment2'],
    people: [
      { firstName: 'Yehuda', lastName: 'Katz' },
      { firstName: 'Carl', lastName: 'Lerche' },
      { firstName: 'Alan', lastName: 'Johnson' },
    ],
    author: { firstName: 'Alan', lastName: 'Johnson' },
  }),
);
console.timeEnd('handlebars');

console.time('maciej');
console.log(
  templ({
    title: 'Title',
    body: 'Body',
    comments: ['comment1', 'comment2'],
    people: [
      { firstName: 'Yehuda', lastName: 'Katz' },
      { firstName: 'Carl', lastName: 'Lerche' },
      { firstName: 'Alan', lastName: 'Johnson' },
    ],
    author: { firstName: 'Alan', lastName: 'Johnson' },
  }),
);
console.timeEnd('maciej');
