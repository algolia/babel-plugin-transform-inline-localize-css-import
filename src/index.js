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

const localize = ({localFormat = '$cssFilename__$token', jsFilename, cssFilename, token}) =>
  localFormat
    .replace(new RegExp('\\$jsFilename', 'g'), jsFilename)
    .replace(new RegExp('\\$cssFilename', 'g'), cssFilename)
    .replace(new RegExp('\\$token', 'g'), token);

export default function({types: t}) {
  return {
    visitor: {
      ImportDeclaration(path, state) {
        if (!(/\.css$/).test(path.node.source.value)) {
          return;
        }

        const localFormat = state.opts.localFormat;
        const jsFilePath = state.file.log.filename;
        const cssFilePath = join(dirname(jsFilePath), path.node.source.value);
        const jsFilename = basename(jsFilePath, extname(jsFilePath));
        const cssFilename = basename(cssFilePath, extname(cssFilePath));

        let fileContent = readFileSync(cssFilePath).toString();

        const classNames = parseCSS(fileContent).cssRules.reduce(
          (res, rule) => {
            if (rule.type !== CSSRule.STYLE_RULE) return res;

            if (rule.style['animation-name'] !== undefined) {
              const token = rule.style['animation-name'];
              const newToken = localize({localFormat, token, jsFilename, cssFilename});
              fileContent = fileContent.replace(
                new RegExp(`animation-name: ${token}\\b`, 'g'),
                `animation-name: ${newToken}`
              );

              fileContent = fileContent.replace(
                new RegExp(`@keyframes ${token}\\b`, 'g'),
                `@keyframes ${newToken}`
              );
            }

            const classNamesFromSelector = extractClassNames(parseSelector(rule.selectorText));
            const newClassNames = classNamesFromSelector.reduce((_res, token) => {
              if (res.hasOwnProperty(token)) return _res;
              const newClassName = localize({localFormat, token, jsFilename, cssFilename});
              const search = new RegExp(`\\.${token}\\b`, 'g');
              fileContent = fileContent.replace(search, `.${newClassName}`);
              return {
                ..._res,
                [token]: newClassName,
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
