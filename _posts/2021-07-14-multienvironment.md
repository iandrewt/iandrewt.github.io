---
layout: post
title:  "Building a module with support for node and the browser"
date:   2021-07-14 18:04:21 +1000
categories: typescript
features: syntax
---

Solving a (niche) dependency hell

Continuing on from my [punycode-article], I needed a way to use both methods in my library, since the library is useful both on the client and server side. Initially I had implemented option 2 here, but I don't recommend it since you'll be left with unused code on either the client or server side. I've included it anyway, since there's other use cases for that feature.

## Option 1 - Typescript and Rollup

Tools like Webpack and Rollup can interpret which module to import based on a `tsconfig.json` file. We can create the folders `/helpers/{node,browser}` and put environment specific code in here, and have two configs to build our package twice with the different dependencies.

Create the functions in seperate files, and let the Typescript compiler pick the right one to import

```ts
// helpers/node/toASCII.ts
import { domainToASCII } from 'url';

export const toASCII = (domain: string): string => {
  return domainToASCII(domain);
};

// helpers/browser/toASCII.ts
export const toASCII = (domain: string): string => {
  const a = document.createElement('a');
  a.href = 'http://' + domain;
  return a.hostname;
};
```

In both folders, create an `index.ts` file

```ts
// helpers/{node,browser}/index.ts
export { toASCII } from './toASCII';
```

Now in your `tsconfig.json`, add the following to your `compilerOptions`. This will tell Typescript where to find the `helpers` module, and exclude the browser version from the build

```json
// tsconfig.json
{
  "compilerOptions": {
    "declaration": true,
    "declarationDir": "./tsc/types",
    "outDir": "./tsc/node",
    "paths": {
      "helpers": ["./helpers/node"]
    }
  },
  "exclude": [
    "helpers/browser/**/*"
  ]
}
```

Since we're now building for two enviornments, we need a second `tsconfig`. We can use our main `tsconfig.json` as a base. I'd advise disabling declaration output (`.d.ts` files) for the browser version since theoretically they'll be identical

```json
// tsconfig.browser.json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "declaration": false,
    "declarationDir": null,
    "outDir": "./tsc/browser",
    "paths": {
      "helpers": ["./helpers/browser"]
    }
  },
  "exclude": [
    "helpers/node/**/*"
  ]
}
```

Now for the magic! Wherever you need to use a `toASCII` function, simply import as follows

```ts
import { toASCII } from 'helpers';
```

One thing to note is that while Typescript doesn't do the actual module resolution in this case. You'll need to use a bundler like Webpack or Rollup. I used Rollup in my project

Create two configurations in your `rollup.config.ts` file

```ts
// rollup.config.ts
import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';
// this will rollup your declaration file and put it in your /dist folder

export default [
  {
    input: './tsc/node/index.js',
    output: [
      file: './dist/index.js',
      format: 'es'
    ],
    plugins: [typescript()],
    external: ['url']
    // we can't bundle this with our package, it's built into node
  },
  {
    input: './tsc/browser/index.js',
    output: [
      file: './dist/index.browser.js',
      format: 'es'
    ],
    plugins: [typescript({ tsconfig: './tsconfig.browser.json' })]
    // override the default tsconfig input
  },
  {
    input: './tsc/types/index.d.ts',
    output: [
      {
        file: './dist/index.d.ts'
        format: 'es',
      }
    ],
    plugins: [dts()]
  }
]
```

Now that the configuration is done, we can build our module. You'll need to run `tsc` twice

```shell
tsc && tsc -p tsconfig.browser.json && rollup -c
```

Now in `/dist`, you'll have 3 files

```shell
dist
├── index.browser.js
├── index.d.ts
└── index.js
```

You can now update your package.json with the new distributible

```json
// package.json
{
  "main": "./dist/index.js",
  "browser": {
    "./dist/index.js": "./dist/index.browser.js"
  },
  "types": "./dist/index.d.ts",
  "files": [
    "/dist"
  ]
}
```

Now when you use your package in a node environment, it'll use the `main` input, but if you bundle for the browser, it'll replace the node version with the browser version.
You can use the `browser` option to override any file for use in a browser environment, so if you wanted to build for CommonJS, you could override the node output for that too.
The files option will keep your package size nice and tiny, only including what the dependant package needs (plus the `LICENSE`, `package.json` and `README` files)

## Option 2 - Dynamic Imports

*This was originally going to be in my [You (might) not need the punycode library](puycode-article) article*

If you don't want to bundle or have multiple `tsconfig` configurations, there's a new option in town. Cue dynamic imports! This asyncronous operation introduced in ES11 allows you to import modules whenever you please. Try this on for size

Create a file that contains both your browser method and your node method, and a way to differentiate between browser and node

```ts
// helpers/toASCII.ts
const browserToASCII = async (domain: string): Promise<string> => {
  const a = document.createElement('a');
  a.href = 'http://' + domain;
  return a.hostname;
};

const domainToASCII = async (domain: string): Promise<string> => {
  const url = await import('url'); // the secret sauce
  return url.domainToASCII(domain);
};

const toASCII = async (domain: string): Promise<string> => {
  if (typeof window !== 'undefined' && typeof window.document !== 'undefined') {
    return await browserToASCII(domain);
  } else {
    return await domainToASCII(domain);
  }
};

export default toASCII;

// index.ts
import toASCII from './helpers/toASCII';

(async () => { toASCII('\u00FC.com').then(console.log); })();
// => xn--tda.com
```

When you want to convert a url to punycode, call `await toASCII()`. If you're running the code in the browser, you'll have a `window.document` object, so `browserToASCII()` will be used and the `await import` that would be fired if you're in a Node enviornment never gets called, so there will be no warnings in the browser console.

I'd still prefer option 1, but it's a good option for delaying imports until they're needed.

[punycode-article]: {% post_url 2021-07-10-punycode %}
