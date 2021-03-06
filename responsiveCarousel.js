/*jslint nomen: true, browser: true */
/*global Modernizr, Hammer, jQuery */
/*properties
    Widget, _animate, _clearInterval, _create, _doArrowBeingClicked, _dragEvents,
    _getPrefix, _setArrowEvents, _setArrowVisibility, _setTargetWidth,
    _setUnitWidth, abs, animate, arrowLeft, arrowLeftVisible, arrowRight,
    arrowRightVisible, attr, call, charAt, clearInterval, clearTimeout,
    computeAdjust, createElement, css, cssAnimations, csstransitions,
    currentSlide, data, 'data-slide', destroy, direction, distance, drag,
    dragEvents, drag_horizontal, drag_min_distance, drag_vertical, each, element,
    eq, find, firstMouseClick, floor, get, getCurrentSlide, getTime, goToSlide,
    hasOwnProperty, height, hide, hold, innerWidth, internal,
    isArrowBeingClicked, isFunction, left, length, mask, nudgeDirection,
    nudgeThreshold, on, onRedraw, onShift, ondrag, ondragend, ondragstart,
    options, outerHeight, outerWidth, parent, parents, position, prefix,
    preventDefault, prototype, redraw, responsiveStep, responsiveUnitSize,
    setInterval, setTimeout, show, slice, slideBumped, slideShowActive,
    slideSpeed, slideTimer, speed, step, stop, style, tap, tap_double, target,
    targetBackupCopy, targetLeft, targetOuterHeight, targetOuterWidth,
    targetParentInnerWidth, targetParentMarginLeft, targetParentOuterHeight,
    targetParentOuterWidth, targetWidth, thenDo, time, timer, toLowerCase,
    toUpperCase, toggleSlideShow, top, transform, unbind, unitElement, unitWidth,
    wait, widget, width
*/
/*!
 * responsiveCarousel
 * A responsive carousel that works in desktop browsers, ipad, iphone, and even
 * most Androids.  It uses css3 animations with a jquery animation fallback for
 * greater speed.  The code was optimized to minimize page reflows to further
 * enhance the overall speed.
 *
 * This is a jQuery UI Widget
 *
 * @version 0.3.0
 * @releaseDate 9/6/2012
 * @author Matthew Toledo
 * @url https://github.com/mrbinky3000/responsive_carousel
 * @requires jQuery, jQuery UI (only the Core and Widget Factory), modernizr (only css3 transitions test, touch test optional), hammer.js
 */
(function ($, window, document) {
    "use strict";
    var busy = false;



    $.widget("ri.responsiveCarousel", {

        //Options to be used as defaults
        options: {
            arrowLeft: '.arrow-left a',
            arrowRight: '.arrow-right a',
            target: '.slider-target',
            mask: '.slider-mask',
            unitElement: 'li',
            unitWidth: 'inherit',
            responsiveUnitSize: null,
            onRedraw: null,
            dragEvents: false,
			speed: 400,
			slideSpeed: 2500,
			step: -1,
			responsiveStep: null,
		    onShift: null,
            cssAnimations: Modernizr.csstransitions,
            nudgeThreshold: 10
        },

        // a place to store internal vars used only by this instance of the widget
        internal: {
			currentSlide: 0,
            left: 0,
            targetWidth: 0,
            unitWidth: 0,
            targetOuterWidth: 0,
            targetOuterHeight: 0,
            targetParentOuterWidth: 0,
            targetParentInnerWidth: 0,
            targetParentOuterHeight: 0,
            targetParentMarginLeft: 0,
            targetBackupCopy: null,
            isArrowBeingClicked: false,
            arrowLeftVisible: true,  // when page first loads, both arrows are visible until _setArrowVisibility() called
            arrowRightVisible: true,
            targetLeft: 0,
            timer: null,
            firstMouseClick: false,
            prefix: null,
			slideShowActive: false,
			slideTimer: null,
			slideBumped: false,
            nudgeDirection: null
        },

        // Execute a callback only after a series of events are done being triggered.
        // prevents runaway conditions (like during a window resize)
        wait: function () {
            var t, _d = function (callback, ms) {
                if ('undefined' !== typeof t) {
                    window.clearTimeout(t);
                }
                t = window.setTimeout(callback, ms);
            };
            return {
                thenDo : function (callback, ms) {
                    _d(callback, ms);
                }
            };
        },

        _getPrefix: function (prop) {
            var prefixes = ['Moz', 'Webkit', 'Khtml', '0', 'ms'],
                elem = document.createElement('div'),
                upper = prop.charAt(0).toUpperCase() + prop.slice(1),
                pref = "",
                len = prefixes.length;

            while (len > -1) {
                if (elem.style.hasOwnProperty(prefixes[len] + upper)) {
                    pref = (prefixes[len]);
                }
                len = len - 1;
            }

            if (elem.style.hasOwnProperty(prop)) {
                pref = (prop);
            }

            return '-' + pref.toLowerCase() + '-';

        },



        /**
         * A proxy function that should be called to animate stuff instead of using jQuery's $.animate() function.
         * If the user's browser supports CSS3 Transitions, we use them since they are faster.  If they don't support
         * Transitions, we jQuery's default $.animate() method which is fast on newer computers, but slower on some
         * under-powered mobile devices.  $.animate() also causes page reflows, which we are trying to avoid.
         *
         * TODO:  make this support more than one type of easing.
         *
         * @param $target
         * @param props object The css attributes to animate
         * @param speed integer Speed in milliseconds
         * @param callback function A function to call after the animateion is done
         * @return {*} This is chainable.
         * @private
         */
        _animate: function ($target, props, speed, callback) {
            var options = this.options,
                internal = this.internal;



            return $target.each(function () {
                var $this = $(this),
                    prefix = (internal.prefix);

                if (options.cssAnimations) {
                    $this.css(prefix + 'transition', 'all ' + speed / 1000 + 's ease-in-out').css(props);
                    window.setTimeout(function () {
                        $this.css(prefix + 'transition', '');
                        if ($.isFunction(callback)) {
                            callback();
                        }
                    }, speed);
                } else {
                    $this.animate(props, speed, function () {
                        if ($.isFunction(callback)) {
                            callback();
                        }
                    });
                }
            });
        },



        /**
         * Compute the new width for the target element (the element that holds all the things
         * that slide). Store the new width in our internal object.  Finally, assign the target
         * the new width.
         *
         * @param string caller Optional string used for debugging.
         * @return void
         * @private
         */
        _setTargetWidth: function (caller) {
            var internal = this.internal,
                options = this.options,
                $el = $(this.element),
                $target = $(this.element).find(options.target);

            caller = ' ' + caller; // shut up jsLint

            internal.targetWidth =  $target.find(options.unitElement).length * internal.unitWidth;
            $el.find(options.target).width(internal.targetWidth);
            internal.targetOuterWidth = $target.outerWidth();
            internal.targetOuterHeight = $target.outerHeight();
            internal.targetParentOuterWidth = $target.parent().outerWidth();
            internal.targetParentInnerWidth = $target.parent().innerWidth();
            internal.targetParentOuterHeight = $target.parent().outerHeight();
            internal.targetParentMarginLeft = parseInt($target.parents().css('marginLeft'), 10);
            if (isNaN(internal.targetParentMarginLeft)) {
                internal.targetParentMarginLeft = 0;
            }
        },

        /**
         * Set the visibility of the left and right scroll arrows.  Also computes the number of
		 * the left-most visible slide.
         * @private
         * @return void
         */
        _setArrowVisibility: function () {

            var options = this.options,
                internal = this.internal,
                $target = $(this.element).find(options.target),
                currentLeft  = $target.position().left,
                currentRight = internal.targetOuterWidth + currentLeft,
                $arrowLeft = $(this.element).find(options.arrowLeft),
                $arrowRight = $(this.element).find(options.arrowRight),
                maskLeft = 0,
                maskRight = internal.targetParentOuterWidth;

			// right arrow
            if (currentRight <= maskRight) {
                $arrowRight.hide();
                if (internal.isArrowBeingClicked === true) {
                    this._clearInterval();
                }
                internal.arrowRightVisible = internal.isArrowBeingClicked = false;
            } else {
                if (false === internal.arrowRightVisible) {
                    $arrowRight.show();
                    internal.arrowRightVisible = true;
                }
            }

			// left arrow
            if (currentLeft >= maskLeft) {
                $arrowLeft.hide();
                if (internal.isArrowBeingClicked === true) {
                    this._clearInterval();
                }
                internal.arrowLeftVisible = internal.isArrowBeingClicked  = false;
            } else {
                if (false === internal.arrowLeftVisible) {
                    $arrowLeft.show();
                    internal.arrowLeftVisible = true;
                }
            }


			// determine number of left-most visible slide
			internal.currentSlide = $($target.find(options.unitElement)[Math.abs(currentLeft / internal.unitWidth)]).data('slide');
			if ($.isFunction(options.onShift)) {
				options.onShift(internal.currentSlide);
			}

        },


        _clearInterval : function () {
            var internal = this.internal,
                options = this.options,
                $target = $(this.element).find(options.target);

            if ('number' === typeof internal.timer) {
                internal.isArrowBeingClicked  = false;
                window.clearInterval(internal.timer);
            }
            if (false === busy) {
                busy = true;
                this._animate($target, {left: this.computeAdjust($target) }, options.speed, function () {
                    busy = false;
                });
            }
        },

		/**
		 * Handles when one of navigation arrows is being pressed with a finger or the mouse.
		 * @private
		 * @return void
		 */
		_doArrowBeingClicked: function (direction) {

            var that = this,
                internal = this.internal,
                options = this.options,
                $target = $(this.element).find(options.target),
                currLeft = $target.position().left,
                parentLeftOffset = internal.targetParentMarginLeft,
                newLeft;

            if (busy === true) {
                return;
            }



            if (direction === "left") {
                newLeft =  currLeft - parentLeftOffset + internal.unitWidth;
            } else if (direction === "right") {
                newLeft =  currLeft - parentLeftOffset - internal.unitWidth;
            } else {
                throw new Error("unknown direction");
            }


            // do the animation here
            busy = true;
            this._animate($target, {left: newLeft}, options.speed, function () {
                that._setArrowVisibility();
                busy = false;
            });

        },

        /**
         * Initialize the left and right arrow events.
         * @private
         * @return void
         */
        _setArrowEvents: function () {

            var that = this,
                options = this.options,
                internal = this.internal,
                $arrowLeft = $(this.element).find(options.arrowLeft),
                $arrowRight = $(this.element).find(options.arrowRight),
                eventStringDown = "",
                eventStringUp = "";


            // discard click on left arrow
            $arrowLeft.on('click.responsiveCarousel', function (ev) {
                ev.preventDefault();
            });

            // discard click on right arrow
            $arrowRight.on('click.responsiveCarousel', function (ev) {
                ev.preventDefault();
            });

            // type of events depend on touch or not.
            if (options.dragEvents === true) {
                eventStringDown = 'mousedown.responsiveCarousel touchstart.responsiveCarousel';
                eventStringUp = 'mouseup.responsiveCarousel touchend.responsiveCarousel';
            } else {
                eventStringDown = 'mousedown.responsiveCarousel';
                eventStringUp = 'mouseup.responsiveCarousel';
            }

            // left arrow, move left
            $arrowLeft.on(eventStringDown, function (ev) {
                ev.preventDefault();
                if (busy === false) {
                    internal.isArrowBeingClicked = internal.firstMouseClick = true;
                    internal.timer = window.setInterval(function () {that._doArrowBeingClicked('left'); }, 10);
                    if (internal.slideTimer) {
                        window.clearInterval(internal.slideTimer);
                        internal.slideShowActive = false;
                    }
                }
            });


            // right arrow, move right
            $arrowRight.on(eventStringDown, function () {

                if (busy === false) {
                    internal.isArrowBeingClicked = internal.firstMouseClick = true;
                    internal.timer = window.setInterval(function () {that._doArrowBeingClicked('right'); }, 10);
					if (internal.slideTimer) {
                        window.clearInterval(internal.slideTimer);
                        internal.slideShowActive = false;
                    }
                }
            });

            // mouse is up / touch is over?
            $(this.element).on(eventStringUp, function () {
                if (internal.isArrowBeingClicked === true) {
                    that._clearInterval();
                }
            });



        },

        /**
         * Figure out the width of each slider element (usually an li)
         *
         * "inherit"
         * ---------
         * If options.unitWidth is set to the string 'inherit', use the current width of the
         * slide unit (the blocks that go inside the slide target, like LI elements, for example)
         *
         * "compute"
         * --------
         * If options.unitWidth is set to the string 'compute', use an external callback to
         * dynamically determine the width based on any function you create.  that function
         * must return an integer with the new unit width.
         *
         * integer
         * -------
         * If options.unitWidth is an integer, it is converted to a pixel width.
         *
         * @private
         * @return void
         */
        _setUnitWidth: function () {

            var w, m,
                that = this,
                internal = this.internal,
                options = this.options,
                $target = $(this.element).find(options.target),
                $el = $(this.element),
                $firstUnit = $target.find(options.unitElement).eq(0),
                delay = new this.wait(),


                _importWidthFromDOM = function () {
                    internal.unitWidth = $firstUnit.outerWidth();
                },

                _setResponsiveUnitWidth = function () {
                    var maskInnerWidth = $el.find(options.mask).innerWidth();
                    m = options.responsiveUnitSize($el, internal, options);
                    if ('number' !== typeof m || m < 1) {
                        throw new Error("The responsiveUnitSize callback must return a whole number greater than 0");
                    }
                    w = maskInnerWidth / m;
                    w = Math.floor(w);
                    $target.find(options.unitElement).css('width', w);
                    internal.unitWidth = w;
                };



            if (options.unitWidth === 'inherit') {

                // first visit to page
                _importWidthFromDOM();


                // If the target has images in it's child elements, these images
                // can cause the widths to change as the page is updated. To counter
                // this, we'll re-run _importWidthFromDom after each image load in the
                // target or it's child elements.
                $target.find('img').on('load.responsiveCarousel', function () {
                    // fire the responsiveUnitSize callback
                    _importWidthFromDOM();
                    that._setTargetWidth('inherit');
                    that._setArrowVisibility();
                    if ($.isFunction(options.onRedraw)) {
                        options.onRedraw($el, internal, options);
                    }

                });


            } else if (options.unitWidth === 'compute') {

                // first visit to page
                _importWidthFromDOM();

                if ($.isFunction(options.responsiveUnitSize)) {
                    _setResponsiveUnitWidth();
                    _importWidthFromDOM();
                }
                if ($.isFunction(options.onRedraw)) {
                    options.onRedraw($el, internal, options);
                }

                // If the target has images in it's child elements, these images
                // can cause the widths to change as the page is updated. To counter
                // this, we'll re-run _importWidthFromDom after each image load in the
                // target or it's child elements.
                $target.find('img').on('load', function () {
                    // fire the responsiveUnitSize callback
                    if ($.isFunction(options.responsiveUnitSize)) {
                        _setResponsiveUnitWidth();
                    }
                    _importWidthFromDOM();
                    that._setTargetWidth('compute');
                    that._setArrowVisibility();
                    if ($.isFunction(options.onRedraw)) {
                        options.onRedraw($el, internal, options);
                    }
                });


                // re-import the width every time the page is re-sized.
                $(window).on('resize.responsiveCarousel', function () {
                    delay.thenDo(function () {
                        var adjust;

                        // fire the responsiveUnitSize callback
                        if ($.isFunction(options.responsiveUnitSize)) {
                            _setResponsiveUnitWidth();
                        }

                        // get the new width from the dom and store internally
                        _importWidthFromDOM();
                        that._setTargetWidth('compute (window resize)');

                        // keep the left-most fully visible object prior to the resize
                        // in the left-most slot after the resize
                        adjust = internal.currentSlide * -1 * internal.unitWidth;


                        // if we are not animating a transition, update the scroll arrows
                        $target.css({left: adjust});
                        that._setArrowVisibility();

                        if ($.isFunction(options.onRedraw)) {
                            options.onRedraw($el, internal, options);
                        }

                    }, 100);
                });


            } else {

                internal.unitWidth = options.unitWidth;
            }
        },

        /**
         * Handle optional drag events.  Works on touch and non-touch screens via mouse drag.
         *
         * @param jQuery container The object (usually a UL) that contains the elements that scroll, (usually LI's)
         * @private
         * @return void
         */
        _dragEvents: function () {

            var that = this,
                options = this.options,
                internal = this.internal,
                $target = $(this.element).find(options.target),
                $mask = $target.parent(),
                content = $target,
                hammer = new Hammer($mask.get(0), {
                    drag: true,
                    drag_vertical: false,
                    drag_horizontal: true,
                    drag_min_distance: 0,
                    transform: false,
                    tap: false,
                    tap_double: false,
                    hold: false
                }),
                scroll_start = {},
                scroll_dim = {},
                content_dim = {},

                getScrollPosition = function () {
                    return {
                        top: parseInt(content.css('top'), 10),
                        left: parseInt(content.css('left'), 10)
                    };
                };


            hammer.ondragstart = function () {

                if (true === internal.isArrowBeingClicked || true === busy) {
                    // prevent jitters due to fat fingers touching scroll arrow and carousel at same time.
                    // if we're already busy, ignore
                    return {};
                }

                busy = true;

                scroll_start = getScrollPosition();
                scroll_start.time = new Date().getTime();
                scroll_dim = {
                    width: internal.targetParentOuterWidth,
                    height: internal.targetParentOuterHeight
                };
                content_dim = {
                    width: internal.targetOuterWidth,
                    height: internal.targetOuterHeight
                };
            };

            hammer.ondrag = function (ev) {

                if (true === internal.isArrowBeingClicked) {
                    // prevent jitters due to fat fingers touching scroll arrow and carousel at same time.
                    return;
                }

				var delta = 1, left;

                internal.nudgeDirection = null;

				if (ev.direction === 'up' || ev.direction === 'left') {
					ev.distance = -ev.distance;
                    if (Math.abs(ev.distance) > options.nudgeThreshold && Math.abs(ev.distance) < internal.unitWidth / 2) {
                        internal.nudgeDirection = 'left';
                    }
				} else {
                    if (ev.distance > options.nudgeThreshold && ev.distance < internal.unitWidth / 2) {
                        internal.nudgeDirection = 'right';
                    }
                }

                left = scroll_start.left + ev.distance * delta;
                internal.left = left;
				content.css('left', left);

            };

            hammer.ondragend = function () {
                $target.stop(true, false);
                that._animate($target, {left: that.computeAdjust($target)}, options.speed, function () {
                    that._setArrowVisibility();
                    busy = false;
                });
            };

        },



        /**
         * Setup widget (eg. element creation, apply theming, bind events etc.)
         * @private
         * @return Void
         */
        _create: function () {

            // _create will automatically run the first time
            // this widget is called. Put the initial widget
            // setup code here, then you can access the element
            // on which the widget was called via this.element.
            // The options defined above can be accessed
            // via this.options this.element.addStuff();

            var options = this.options,
                internal = this.internal,
                $el = $(this.element),
                $target = $(this.element).find(options.target);




            // --------------------
            // _create MAIN FLOW
            // --------------------
            // backup original target element
            this.internal.targetBackupCopy = this.element;
            // if we are using css3 animations, determine the browser specific prefix (-ie,-moz,-webkit, etc)
            if (this.options.cssAnimations) {
                this.internal.prefix = this._getPrefix('transition');
            }
            // init the target DOM element's css
            $target.css({
                'position': 'relative',
                'left': 0
            });

            //number all the unitElements
            $target.find(options.unitElement).each(function (i) {
                $(this).attr({"data-slide": i});
            });

            // init touch events if applicable
            if (options.dragEvents === true) {
                this._dragEvents();
            }

            this._setArrowEvents();
            this._setUnitWidth();
            this._setTargetWidth('first load');
            this._setArrowVisibility();

            if ($.isFunction(options.onRedraw)) {
                options.onRedraw($el, internal, options);
            }


        },


        /**
         * Force a redraw of the carousel.
         * @public
         * @return void
         */
        redraw: function () {
            var that = this,
                internal = this.internal,
                options = this.options,
                $el = $(this.element);

            this._setUnitWidth();
            this._setTargetWidth('_redraw');
            this._setArrowVisibility();
            if ($.isFunction(this.options.onRedraw)) {
                that.options.onRedraw($el, internal, options);
            }
        },

        /**
         * return the number of the current slide.  numbering starts at zero.
         * @public
         * @return integer
         */
		getCurrentSlide: function () {
			return this.internal.currentSlide;
		},

        /**
         * Make a specified slide the left-most visible slide in the slider
         * @public
         */
		goToSlide: function (i) {
            var that = this,
                internal = this.internal,
				options = this.options,
				$target = $(this.element).find(options.target),
				newLeft;

			this._setUnitWidth();
			newLeft = i * internal.unitWidth * -1;
			busy = true;
			this._animate($target, {'left': newLeft}, options.speed, function () {
				busy = false;
				that._setArrowVisibility();
			});

		},

        /**
         * Activate / Deactivate slide show mode.
         * @public
         */
		toggleSlideShow: function () {


			var that = this,
				internal = this.internal,
				options = this.options,
				$target = $(this.element).find(options.target),


                _stopSlideShow = function () {
                    if (true === internal.slideShowActive) {
                        internal.slideShowActive = false;
                        window.clearInterval(internal.slideTimer);
                    }
                },

                _step = function (i) {
                    var width = internal.targetParentInnerWidth,
                        left = $target.position().left,
                        right = left + internal.targetWidth,
                        newLeft = left + i * internal.unitWidth,
                        newRight = right + i * internal.unitWidth,
                        adjustedLeft = newLeft;



                    if (internal.slideBumped === false) {

                        // too far left
                        if (newRight <= width) {
                            adjustedLeft = newLeft + width - newRight;
                            internal.slideBumped = 'left';
                        }

                        // too far right
                        if (newLeft >= 0) {
                            internal.slideBumped = 'right';
                            adjustedLeft = 0;
                        }

                    } else {

                        if ('left' === internal.slideBumped) {
                            adjustedLeft = 0;
                        }

                        if ('right' === internal.slideBumped) {
                            adjustedLeft = left + width - right;
                        }

                        internal.slideBumped = false;

                    }

                    // do the animation
                    busy = true;
                    that._animate($target, {'left': adjustedLeft}, options.speed, function () {
                        busy = false;
                        that._setArrowVisibility();
                    });

                };


			if (false === internal.slideShowActive) {
				internal.slideShowActive = true;
				internal.slideTimer = window.setInterval(function () {
					_step(options.step);
				}, options.slideSpeed);
			} else {
				_stopSlideShow();
			}

		},

        /**
         * Destroy this plugin and clean up modifications the widget has made to the DOM
         * @public
         * @return void
         */
        destroy: function () {

            // remove events created by this instance
            $(window).unbind('.responsiveCarousel');
            $(this.element).find(this.options.arrowLeft).unbind('.responsiveCarousel');
            $(this.element).find(this.options.arrowRight).unbind('.responsiveCarousel');

            // restore the element to it's original pristine state
            this.element = this.internal.targetBackupCopy;

            // For UI 1.8, destroy must be invoked from the base widget
            $.Widget.prototype.destroy.call(this);
            // For UI 1.9, define _destroy instead and don't worry about calling the base widget
        },


        /**
         * Try to keep the leftmost visible element (usually an LI) flush against the left border.
         * Use this to prevent on fractions of elements from being visible.
         * @param jQuery $target
         * @return integer
         * @public
         */
        computeAdjust : function ($target) {


            var internal = this.internal,
                left = $target.position().left,
                right,
                mod,
                thresh = internal.unitWidth / -2,
                width = internal.targetParentInnerWidth,
                newLeft,
                direction = internal.nudgeDirection,
                unitWidth = internal.unitWidth;


            // nudged with finger or mouse past the threshold level
            if (direction !== null) {
                if (direction === 'left') {
                    newLeft = left - unitWidth;
                }
                if (direction === 'right') {
                    newLeft = left + unitWidth;
                }
                left = newLeft;
            }

            // entire slider is too far left
            right = left + internal.targetWidth;
            if (right < width) {
                newLeft = left + width - right;
                left = newLeft;
            }

            // entire slider is too far right
            if (left > 0) {
                left = newLeft = 0;
            }


            // keep left most fully visible object aligned with left border

            mod = left % this.internal.unitWidth;

            if (mod !== 0) {

                if (mod < thresh) {
                    newLeft =  left - (this.internal.unitWidth + mod);
                }
                if (mod > thresh) {
                    newLeft = left - mod;
                }
            }

            // compute the number of the left-most slide and store the number of the left-most slide
            return newLeft;
        }


    });

}(jQuery, window, document));
