/* eslint-env jest */
import {join} from 'path';
import {transform} from 'babel-core';
import babelPlugin from './index.js';
import {__setFiles} from 'fs';

jest.mock('fs');

const babelOptions = {
  babelrc: false,
  plugins: [babelPlugin],
};

beforeEach(() => __setFiles({}));

const testCases = [{
  name: 'basic',
  code: 'import theme from "./Component.css";',
  filename: join(__dirname, 'Component.js'),
  files: {
    [join(__dirname, 'Component.css')]: '.className {}',
  },
}, {
  name: 'different cssFilename',
  code: 'import theme from "./CustomComponent.css";',
  filename: join(__dirname, 'Component.js'),
  files: {
    [join(__dirname, 'CustomComponent.css')]: '.className {}',
  },
}, {
  name: 'different JavaScript code',
  code: 'import theme from "./Component.css"; a + a; import "module"',
  filename: join(__dirname, 'Component.js'),
  files: {
    [join(__dirname, 'Component.css')]: '.className {}',
  },
}, {
  name: 'multiple class names',
  code: 'import theme from "./Component.css";',
  filename: join(__dirname, 'Component.js'),
  files: {
    [join(__dirname, 'Component.css')]: '.a .b, .c ~ .d, .d > .e {color:blue}',
  },
}, {
  name: 'keyframes rule',
  code: 'import theme from "./Component.css";',
  filename: join(__dirname, 'Component.js'),
  files: {
    [join(__dirname, 'Component.css')]: '.className{animation-name: hide;color:blue}@keyframes hide {0%{opacity:0}};',
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
