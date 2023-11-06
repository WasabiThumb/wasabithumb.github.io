const path = require("path");
const webpack = require("webpack");
const CopyPlugin = require("copy-webpack-plugin");
const version = require("./buildSrc/versioning");
const csso = require("csso");
const babel = require("@babel/core");


const dist = path.resolve(__dirname, "dist");
module.exports = (async () => {
    const vd = await version();
    return {
        entry: './src/index.ts',
        mode: vd.mode,
        devtool: vd.devtool,
        module: {
            rules: [
                {
                    test: /\.tsx?$/,
                    use: 'ts-loader',
                    exclude: /node_modules|static|dist|private/
                }
            ]
        },
        plugins: [
            new CopyPlugin({
                patterns: [
                    "static/index.html",
                    "static/key.private",
                    {
                        from: "static/assets",
                        to: path.resolve(__dirname, 'dist', 'assets'),
                        transform: ((content, path) => {
                            if (vd.mode === "development") return content;
                            if (/\.css$/.test(path)) {
                                return csso.minify(content.toString('utf8')).css;
                            } else if (/\.jsx?$/.test(path)) {
                                return babel.transformAsync(content.toString('utf8'), {
                                    presets: ["@babel/preset-env"],
                                    targets: "> 0.25%, not dead",
                                    filename: path,
                                    configFile: false
                                }).then((d) => {
                                    return d.code;
                                });
                            }
                            return content;
                        })
                    },
                    {
                        from: `node_modules/coi-serviceworker/coi-serviceworker${vd.mode === "production" ? ".min.js" : ".js"}`,
                        to: path.resolve(__dirname, 'dist', 'assets', 'javascript', 'coi-serviceworker.js')
                    }
                ]
            }),
            new webpack.BannerPlugin({
                banner: `Portfolio v. ${vd.version}\nWith <3 By Wasabi`
            })
        ],
        resolve: {
            extensions: ['.tsx', '.ts', '.js'],
            fallback: {
                buffer: require.resolve("buffer/")
            }
        },
        output: {
            filename: 'bundle.js',
            path: dist
        }
    };
});
