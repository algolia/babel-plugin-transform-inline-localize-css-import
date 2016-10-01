/* eslint-env jest */
import {join} from 'path';
import {transform} from 'babel-core';
import babelPlugin from './index.js';
import {__setFiles} from 'fs';

jest.mock('fs');

const babelOptions = {
  babelrc: false,
  plugins: [
    [babelPlugin, {
      localize: ({token, jsFileName}) => `ais-${jsFileName}__${token}`,
    }],
  ],
};

beforeEach(() => __setFiles({}));

const testCases = [{
  name: 'basic',
  code: 'import theme from "./style.css";',
  filename: join(__dirname, 'SearchBox.js'),
  files: {
    [join(__dirname, 'style.css')]: '.className {}',
  },
}, {
  name: 'different filename',
  code: 'import theme from "./style.css";',
  filename: join(__dirname, 'yo.js'),
  files: {
    [join(__dirname, 'style.css')]: '.className {}',
  },
}, {
  name: 'different JavaScript code',
  code: 'import theme from "./style.css"; a + a; import "module"',
  filename: join(__dirname, 'SearchBox.js'),
  files: {
    [join(__dirname, 'style.css')]: '.className {}',
  },
}, {
  name: 'multiple class names',
  code: 'import theme from "./style.css";',
  filename: join(__dirname, 'SearchBox.js'),
  files: {
    [join(__dirname, 'style.css')]: '.a .b, .c ~ .d, .d > .e {color:blue}',
  },
}, {
  name: 'keyframes rule',
  code: 'import theme from "./style.css";',
  filename: join(__dirname, 'SearchBox.js'),
  files: {
    [join(__dirname, 'style.css')]: '.className{animation-name: hide;color:blue}@keyframes hide {0%{opacity:0}};',
  },
}];

testCases.forEach(({filename, code, files, name, only}) => {
  const test = only ? fit : it;
  test(name, () => {
    __setFiles(files);

    expect(
      transform(
        code,
        {...babelOptions, filename}
      ).code
    ).toMatchSnapshot();
  });
});
