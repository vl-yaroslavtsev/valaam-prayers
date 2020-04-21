const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const TerserJSPlugin = require('terser-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const OfflinePlugin = require('offline-plugin');

module.exports = (env = {}) => {
	const devMode = !env.production;
	return {
		mode: devMode ? 'development' : 'production',
		entry: {
			app: './src/js/app.js'
		},
		plugins: [
			new CleanWebpackPlugin({
				cleanStaleWebpackAssets: false,
				cleanOnceBeforeBuildPatterns: ['**/*', '!sw.js'],
			}),
			new HtmlWebpackPlugin({
				template: './src/index.html'
			}),
			new MiniCssExtractPlugin({
				// Options similar to the same options in webpackOptions.output
				// all options are optional
				//filename: devMode ? '[name].css' : '[name].[contenthash].css',
				filename: '[name].css',
				//chunkFilename: devMode ? '[name].css' : '[name].[contenthash].css',
				chunkFilename: '[name].css',
			}),
			new CopyPlugin([
	      {
					from: 'src/images',
					to: 'images'
				},
				/*'src/manifest.webmanifest',*/
				'src/cordova.js',
				'src/framework7.phonegap.js',
	    ]),
			new OfflinePlugin({
				ServiceWorker: null,
				// {
	      //   events: true,
				// 	entry: './src/js/sw-template.js'
	      // },
	      AppCache: {
	        events: true
	      },
        externals: [
					'./src/images/ideograph-1.png',
          './src/images/ideograph-2.png',
					'./src/images/ideograph-3.png',
					'./src/images/ideograph-4.png',
					'./src/images/ideograph-5.png'
				],
				excludes: [
					'**/.*',
					'**/*.map',
					'**/*.gz',
					'images/[67]*.jpg',
				]
			})
		],
		module: {
			rules: [
				{
					test: /\.css$/,
					use: [
						{
							loader: MiniCssExtractPlugin.loader,
							options: {
								hmr: devMode,
							},
						},
						{
							loader: 'css-loader'
						}
					]
				},
				{
					test: /\.m?js$/,
					exclude: [
						/node_modules\/(?!(framework7|template7|dom7|lodash-es|date-fns|idb)\/).*///,
						// /\/js\/sw-template\.js$/,
						// /\/js\/download\/bg-fetch\.wkr\.js$/
					],
					//include: path.resolve(__dirname, 'src'),
					use: {
						loader: 'babel-loader'
					}
				},
				{
					test: /\.f7\.html$/,
					use: [
						'babel-loader',
						{
							loader: 'framework7-component-loader',
							options: {
							 	helpersPath: './src/template7-helpers-list.js',
								partialsPath: './src/pages/',
              	partialsExt: '.f7p.html'
							},
						},
					],
				},
				{
					test: /\.(png|jpg|jpeg|gif)$/,
					loader: 'file-loader',
	        options: {
						outputPath: 'images',
	          //name: devMode ? '[name].[ext]' : '[name].[contenthash].[ext]'
						name: '[name].[ext]'
					}
				},
				{
					test: /\.(woff|woff2|eot|ttf|otf|svg)$/,
					loader: 'file-loader',
					options: {
						outputPath: 'fonts',
						//name: devMode ? '[name].[ext]' : '[name].[contenthash].[ext]'
						name: '[name].[ext]'
					}
				},
				{
        	test: /\.wkr\.js$/,
        	use: [
						//'babel-loader',
						{
							loader: 'worker-loader',
							options: {
								// name: devMode ? '[name].js' :
								// 								'[name].[contenthash].js'
								name: '[name].js'
							}
						},
						'babel-loader',
					]
      	}
			]
		},
		devtool: devMode ? 'source-map' : false,
		output: {
			//filename: devMode ? '[name].js' : '[name].[contenthash].js',
			filename: '[name].js',
			//chunkFilename: devMode ? '[name].js': '[name].[contenthash].js',
			chunkFilename: '[name].js',
			path: path.resolve(__dirname, devMode ? 'dev' : 'dist')//,
			//publicPath: path.resolve('/test/prayers.f7/',  devMode ? 'dev' : 'dist')
		},
		optimization: {
			moduleIds: 'hashed',
			runtimeChunk: 'single',
			splitChunks: {
				cacheGroups: {
					vendorJs: {
						test: /[\\/]node_modules[\\/].*\.m?js$/,
						name: 'vendors',
						chunks: 'all'
					},
					vendorCss: {
						test: /[\\/]node_modules[\\/].*\.css$/,
						name: 'vendors',
						chunks: 'all'
					}
				}
			},
			minimizer: [
				new TerserJSPlugin({
					terserOptions: {
	          safari10: true,
						mangle: { safari10: true },
						output: { safari10: true },
	        },
				}),
				new OptimizeCSSAssetsPlugin({})
			],
		},
		watchOptions: {
			ignored: ['src/images', 'node_modules']
		}
	};
};
