// what this Babel plugins does:
// turns import theme from './theme.css';
// into
// var theme = {
//   code: '.css {code with class names and animation names transformed}',
//   classNames: {mapOfTransformedClassNames}
// }

/* eslint-disable new-cap */

import {readFileSync} from 'fs';
import {join, dirname, basename, extname} from 'path';
import {parse as parseCSS, CSSRule} from 'cssom';
import {parse as parseSelector} from 'css-selector-tokenizer';

// turns {some: 'object'} to AST
const objectToObjectProperties =
  (object, t) =>
  Object
    .entries(object)
    .map(
      ([name, val]) =>
      t.ObjectProperty(t.identifier(name), t.stringLiteral(val))
    );

const extractClassNames = node => {
  const classNames = [];

  if (node.type === 'selectors' || node.nodes !== undefined) {
    classNames.push(...extractClassNames(node.nodes));
  } else if (Array.isArray(node)) {
    node.forEach(subNode => {
      classNames.push(...extractClassNames(subNode));
    });
  } else if (node.type === 'class') {
    classNames.push(node.name);
  }

  return classNames;
};

export default function({types: t}) {
  return {
    visitor: {
      ImportDeclaration(path, state) {
        if (!(/\.css$/).test(path.node.source.value)) {
          return;
        }

        const jsFilePath = state.file.log.filename;
        const jsFileName = basename(jsFilePath, extname(jsFilePath));

        let fileContent = readFileSync(
          join(
            dirname(jsFilePath),
            path.node.source.value
          )
        ).toString();

        const classNames = parseCSS(fileContent).cssRules.reduce(
          (res, rule) => {
            if (rule.type !== CSSRule.STYLE_RULE) return res;

            if (rule.style['animation-name'] !== undefined) {
              const animationName = rule.style['animation-name'];
              const newAnimationName = state.opts.localize({token: rule.style['animation-name'], jsFileName});
              fileContent = fileContent.replace(
                new RegExp(`animation-name: ${animationName}\\b`, 'g'),
                `animation-name: ${newAnimationName}`
              );

              fileContent = fileContent.replace(
                new RegExp(`@keyframes ${animationName}\\b`, 'g'),
                `@keyframes ${newAnimationName}`
              );
            }

            const classNamesFromSelector = extractClassNames(parseSelector(rule.selectorText));
            const newClassNames = classNamesFromSelector.reduce((_res, className) => {
              if (res.hasOwnProperty(className)) return _res;
              const newClassName = state.opts.localize({token: className, jsFileName});
              const search = new RegExp(`\\.${className}\\b`, 'g');
              fileContent = fileContent.replace(search, `.${newClassName}`);
              return {
                ..._res,
                [className]: newClassName,
              };
            }, {});

            return {
              ...res,
              ...newClassNames,
            };
          },
          {}
        );

        path.replaceWith(
          t.variableDeclaration(
            'var',
            [
              t.variableDeclarator(
                t.identifier(path.node.specifiers[0].local.name),
                t.objectExpression([
                  t.ObjectProperty(
                    t.identifier('code'),
                    t.stringLiteral(fileContent)
                  ),
                  t.ObjectProperty(
                    t.identifier('classNames'),
                    t.objectExpression(objectToObjectProperties(classNames, t))
                  ),
                ])
              ),
            ]
          )
        );
      },
    },
  };
}
