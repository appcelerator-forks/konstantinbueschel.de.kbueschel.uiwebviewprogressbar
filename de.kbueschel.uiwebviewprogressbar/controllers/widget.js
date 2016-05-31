var LTAG = '[UIWebViewProgressbarWidget]',
	DEVICE_DPI = Ti.Platform.displayCaps.dpi,

	ANIMATION_DURATION_SHORT = 250,
	ANIMATION_DURATION_MEDIUM = 400,
	ANIMATION_DURATION_LONG = 600,

	POP = OS_IOS && require('guy.mcdooooo.tipop'),
	Promise = require(WPATH('/vendor/q'));


/**
 * self-executing function to organize otherwise inline constructor code
 * @param  {Object} args arguments passed to the controller
 */
(function constructor(args) {

	// use strict mode for this function scope
	'use strict';


	// variable declaration
	$._progressBar = null;
	$._progressTimer = null;

	$._loading = false;
	$._isHidden = false;

	$._threshold = _.random(0.85, 0.95);
	$._currentProgress = 0.0;

	$._interval = null;

	var isPercentageWidth, widthPercentage;


	// defaults arguments
	_.defaults(args, {

		color: '#4169E1',
		width: '100%',
		height: 4,
		progress: 0
	});


	// set progress interval
	$._interval = _.isNumber(args.interval) ? args.interval : _calculateRecommendedInterval();


	// set transparent background color
	$.container.applyProperties(_.omit(args, 'color', 'progress'));

	(!_.isString(args.backgroundColor) || _.isEmpty(args.backgroundColor)) && $.container.setBackgroundColor('#66'.concat(args.color.slice(1)));


	// because bezier paths do not support percentage widths use top level view
	// post layout event to calculate width in system unit
	isPercentageWidth = !!(_.isString(args.width) && args.width.trim().slice(-1) === '%');


	if (isPercentageWidth) {

		$.addListener($.container, 'postlayout', function _afterLayout(event) {

			$.removeListener(event.source, event.type, _afterLayout);

			try {

				widthPercentage = Number(args.width.trim().slice(0, -1)) / 100;
			}
			catch (exception) {

				Ti.API.warn(LTAG, 'Could not calculate percentage width, use fallback');

				widthPercentage = 1;
			}


			args.width = Math.ceil(event.source.size.width * widthPercentage);

			_createAndAddProgressBar(args);


			return;
		});
	}
	// for all other width values create and add progressbar directly
	else {

		args.width = Math.ceil(args.width);

		_createAndAddProgressBar(args);
	}


	// define controller properties
	Object.defineProperties($, {

		isLoading: {

			configurable: false,
			set: _.noop,

			get: function () {

				return $._loading;
			}
		},

		progress: {

			configurable: false,
			set: _.noop,

			get: function () {

				return $._currentProgress;
			}
		}
	});


	return;

	// execute constructor with optional arguments passed to controller
})($.args);


/**
 * Cleans up the controller and view
 *
 * @public
 * @method cleanup
 * @returns void
 */
$.cleanup = function () {

	Ti.API.debug(LTAG, 'Cleaning up ...');


	// let Alloy clean up listeners to global collections for data-binding
	// always call it since it'll just be empty if there are none
	$.removeListener();
	$.destroy();
	$.off();

	_stopTimer();


	return;

}; // END cleanup()


/**
 * Creates and adds progressbar to top level view
 *
 * @private
 * @param {Dictionary} properties
 * @returns void
 */
function _createAndAddProgressBar(properties) {

	'use strict';


	$._width = properties.width;


	if (OS_IOS) {

		var Drawer = require('guy.mcdooooo.tibezier');

		$._progressBar = Drawer.createView({

			width: properties.width,
			height: properties.height,
			left: 0,

			backgroundColor: 'transparent',
			touchEnabled: false,

			bezier: {

				lineWidth: (properties.height * DEVICE_DPI),
				miterLimit: 4,

				strokeColor: properties.color,
				strokeEnd: properties.progress,

				fill: true,
				fillColor: properties.color,

				paths: [
					{

						draw: 'moveToPoint',
						point: [0, 0]

					}, {

						draw: 'addLineToPoint',
						point: [properties.width, 0]
					}
				]
			}
		});


		// add progressbar to top level view
		$.container.add($._progressBar);
	}
	else {

		$.updateViews({

			'#progressBar': {

				width: $._width * properties.progress,
				height: properties.height,

				backgroundColor: properties.color
			}
		});
	}

} // END _createProgressBar()


/**
 * Calculates timer interval base on network type
 *
 * @private
 * @returns {Number} interval in ms
 */
function _calculateRecommendedInterval() {

	'use strict';


	var interval;

	switch (Ti.Network.getNetworkType()) {

		case Ti.Network.NETWORK_LAN:

			interval = 500;
			break;


		case Ti.Network.NETWORK_MOBILE:

			interval = 800;
			break;


		default:

			interval = 1000;
			break;
	}

	return interval;

} // END _calculateRecommendedInterval()


/**
 * Starts interval timer
 *
 * @private
 * @returns void
 */
function _startTimer() {

	if (!$._progressTimer) {

		$._progressTimer = setInterval(_updateProgress, $._interval);
	}

} // END _startTimer()


/**
 * Stops interval timer
 *
 * @private
 * @returns void
 */
function _stopTimer() {

	if ($._progressTimer) {

		clearInterval($._progressTimer);

		$._progressTimer = null;
	}

} // END _stopTimer()


/**
 * Updates progressbar value
 *
 * @private
 * @returns void
 */
function _updateProgress() {

	'use strict';


	if ($._currentProgress < $._threshold) {

		$._currentProgress += (_.random(0.3, 0.7) / 10);

		if ($._currentProgress > $._threshold) {

			$._currentProgress = $._threshold;
		}


		if (OS_IOS) {

			POP.basic($._progressBar, {

				duration: ANIMATION_DURATION_MEDIUM,
				strokeEnd: $._currentProgress

			}, function () {

				$.trigger('progessUpdate', {

					progress: $._currentProgress
				});
			});
		}
		else {

			$.progressBar.animate({

				width: $._width * $._currentProgress,
				duration: ANIMATION_DURATION_MEDIUM

			}, function () {

				$.trigger('progessUpdate', {

					progress: $._currentProgress
				});
			});
		}

	}
	else {

		_stopTimer();
	}

} // END _updateProgress()


/**
 * Resets progress and progressbar to 0
 *
 * @private
 * @returns void
 */
function _resetProgressBar() {

	'use strict';


	$._currentProgress = 0.0;

	if (OS_IOS) {

		POP.basic($._progressBar, {

			duration: 0,
			strokeEnd: $._currentProgress

		}, function () {

			$.trigger('progressUpdate', {

				progress: $._currentProgress
			});
		});
	}
	else {

		$.progressBar.width = 0;

		$.trigger('progressUpdate', {

			progress: $._currentProgress
		});
	}

} // END _resetProgressBar()


/**
 * Starts animation
 *
 * @public
 * @returns void
 */
exports.start = function () {

	'use strict';


	// if already loading, exit
	if ($._loading) {

		return;
	}


	// update state
	$._loading = true;


	// show if hidden
	$._isHidden && exports.show();


	_startTimer();

}; // END start()


/**
 * Completes animation and optionally hides
 * progressbar
 *
 * @public
 * @param {Bool} hideOnFinish
 * @param {Bool} resetOnHide
 * @returns {Promise}
 */
exports.finish = function (hideOnFinish, resetOnHide) {

	'use strict';


	var deferred = Promise.defer();


	$._currentProgress = 1.0;

	hideOnFinish = !!hideOnFinish;
	resetOnHide = !!resetOnHide;


	if (OS_IOS) {

		POP.basic($._progressBar, {

			duration: ANIMATION_DURATION_MEDIUM,
			strokeEnd: $._currentProgress

		}, function () {

			$._loading = false;

			_stopTimer();

			hideOnFinish && exports.hide(resetOnHide);

			deferred.resolve();

			return;
		});
	}
	else {

		$.progressBar.animate({

			width: $._width,
			duration: ANIMATION_DURATION_MEDIUM

		}, function () {

			$._loading = false;

			_stopTimer();

			hideOnFinish && exports.hide(resetOnHide);

			deferred.resolve();

			return;
		});
	}

	return deferred.promise;

}; // END finish()


/**
 * Shows progressbar animated
 *
 * @public
 * @returns {Promise}
 */
exports.show = function () {

	'use strict';


	var deferred = Promise.defer();


	if (OS_IOS) {

		POP.basic($.container, {

			duration: ANIMATION_DURATION_MEDIUM,
			opacity: 1.0

		}, function () {

			$._isHidden = false;

			deferred.resolve();

			return;
		});
	}
	else {

		$.container.animate({

			duration: ANIMATION_DURATION_MEDIUM,
			opacity: 1.0

		}, function () {

			$._isHidden = false;

			deferred.resolve();

			return;
		});
	}


	return deferred.promise;

}; // END show()


/**
 * Hides progressbar animated
 *
 * @public
 * @param {Bool} resetAfterHide
 * @returns {Promise}
 */
exports.hide = function (resetAfterHide) {

	'use strict';


	var deferred = Promise.defer();

	resetAfterHide = !!resetAfterHide;


	if (OS_IOS) {

		POP.basic($.container, {

			duration: ANIMATION_DURATION_MEDIUM,
			opacity: 0.0

		}, function () {

			$._isHidden = true;

			resetAfterHide && _resetProgressBar();

			deferred.resolve();

			return;
		});
	}
	else {

		$.container.animate({

			duration: ANIMATION_DURATION_MEDIUM,
			opacity: 0.0

		}, function () {

			$._isHidden = true;

			resetAfterHide && _resetProgressBar();

			deferred.resolve();
		});
	}


	return deferred.promise;

}; // END hide()


/**
 * Resets progressbar state
 *
 * @public
 * @returns void
 */
exports.reset = _resetProgressBar;
