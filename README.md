# Portfolio
**New Version (Winter 2023)**

## Building
Output is in the ``dist`` directory
```shell
npm install
npm run build
```

## Components
- **Binary** <br> The build script combines the completed outputs of Source and Static into here.
    - ``dist`` **:** Site can be viewed at `dist/index.html`
- **Build Source** <br> Facilitates building & deployment of the project. This provides the functionality for ``npm build``.
  - ``package.json``
  - ``webpack.config.js``
  - ``tsconfig.json``
  - ``buildSrc``
    - ``private.js`` **:** Provides functionality for ``private``. See [below](#static-private-desc).
    - ``versioning.js`` **:** Incorporates the current version data into Source before building so that the built site can reference it.
      Also switches ``webpack`` into development mode when checked out to a non-master branch, allowing faster but larger builds.
- **Source** <br> Site dynamic functionality made in TypeScript. Must be compiled using the build script to run.
  - ``src``
- **Static** <br> Site textual content, metadata & styling.
  - ``static`` **:** CSS will be minified with ``csso``, JS will be transpiled with ``babel`` and minified with ``webpack``, HTML is copied as-is.
    - ``static/assets/javascript/loader.js`` **:** The Webpack bundle from Source can be fairly large, so this small file made in pure JS
      helps the site load quickly and smoothly while the bundle is prepared.
  - <a name="static-private-desc"></a> ``private`` **:** Files here are not included in this repo, making it in a way the only "closed source" component.
      The purpose of the "private" directory is to hold project data pertaining to my real identity,
      which can be unencrypted in the browser by supplying my personal e-mail as a password. The private
      contents are automatically encrypted and copied into the ``static`` directory suffixed with ``.private``,
      thus making the unencrypted contents of the ``private`` directory unnecessary for building & viewing the site.
    - ``private/key`` **:** The encryption password (e.g. my personal e-mail). Presence of this file indicates that
      you own and wish to pack private files, otherwise this is skipped during commits.
- **Documentation** <br> You're looking at it!
  - ``README.md``
  - ``LICENSE.txt``
