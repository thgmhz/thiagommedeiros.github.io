(function() {

	var staticUrl =  'https://thiagommedeiros.github.io/pg/';

(function(global) {
	var receivedMessages = [];
	var callStack = {};
	var messageId = 0;
	var source;
	var destination;

	var _toArray = function(obj) {
		return Array.prototype.slice.call(obj);
	};

	var checkForPendingMessages = function() {
		postMessage(JSON.stringify({
			method: '_pending'
		}));
	};

	var resendPendingMessages = function() {
		for (var id in callStack) {
			if (!callStack[id].responded) {
				postMessage(callStack[id].message);
				return;
			}
		}
	};

	var postMessage = function(message) {
		source.postMessage(message, destination);
	};

	var postMethod = function() {
		var args = _toArray(arguments);
		var method = args.shift();

		var cb;
		if (args.length && typeof args[args.length-1] == 'function') {
			cb = args.pop();
		} else {
			cb = function() {};
		}

		messageId += 1;

		var message = JSON.stringify({
			method: method,
			args: args,
			id: messageId
		});

		callStack[messageId] = {
			message: message,
			cb: cb
		};

		// checkAndRetry(messageId, message);
		postMessage(message);
	};

	global.createTransport = function(methods, url) {
		destination = url || '*';

		setInterval(function() {
			if (source) {
				checkForPendingMessages();
			}
		}, 300);

		window.addEventListener('message', function(event) {
			var urlParser = document.createElement('a');
			var originParser = document.createElement('a');

			urlParser.href = url;
			originParser.href = event.origin;

			if (url && urlParser.hostname !== originParser.hostname) {
				return;
			}

			var win = event.source;
			var to = event.origin;
			var data = JSON.parse(event.data);
			
			if (data.method == '_ack') {
				if (callStack[data.id]) {
					callStack[data.id].cb();
					delete callStack[data.id];
				}
			} else if (data.method == '_pending') {
				resendPendingMessages();
			} else {
				if (receivedMessages.indexOf(data.id) == -1) {
					receivedMessages.push(data.id);
				} else {
					return;
				}

				win.postMessage(JSON.stringify({
					method: '_ack',
					id: data.id
				}), to);

				if (methods[data.method]) {
					methods[data.method].apply(null, data.args);
				}
			}
		});

		return {
			callMethod: function() {
				postMethod.apply(null, arguments);
			},
			setSource: function(s) {
				source = s;
			},
			restart: function() {
				receivedMessages = [];
			}
		};
	};
})(window);

var scriptsToLoad = 1;
var scriptsLoaded = 0;
window.PagarMeCheckout = window.PagarMeCheckout || {};

if (window.PagarMeCheckoutLoadedDevelopment) {
	return;
} else {
	window.PagarMeCheckoutLoadedDevelopment = true;
}

function registerScriptLoadCallback(scriptTag) {
	if (scriptTag.readyState) {
		scriptTag.onreadystatechange = function() {
			if (this.readyState == 'complete' || this.readyState == 'loaded') {
				scriptLoadHandler();
			}
		}
	} else {
		scriptTag.onload = scriptLoadHandler;
	}
}

function loadScript(url) {
	var script = document.createElement('script');

	script.setAttribute('type', 'text/javascript');
	script.setAttribute('src', url);

	registerScriptLoadCallback(script);

	(document.getElementsByTagName("head")[0] || document.documentElement).appendChild(script);
}

function scriptLoadHandler() {
	scriptsLoaded += 1;

	if (scriptsLoaded == scriptsToLoad) {
		fireMain(window.jQuery.noConflict(true));
	}
}

function fireMain($) {
	if (easyXDM) {
		PagarMeCheckout.easyXDM = easyXDM.noConflict('PagarMeCheckout');
	}

	if ($.isReady) {
		main($);
	} else {
		$(document).ready(main);
	}
}

if (window.jQuery === undefined || window.jQuery.version !== '1.10.1') {
	scriptsToLoad += 1;
	loadScript('//ajax.googleapis.com/ajax/libs/jquery/1.11.1/jquery.min.js');
}

if ('object' !== typeof window.JSON) {
	scriptsToLoad += 1;
	loadScript(staticUrl + '/json.min.js');
}

loadScript(staticUrl + '/easyXDM.js');

function main($) {

var userAgent = window.navigator.userAgent;

var isiOS = function() {
	return /(iPad|iPhone|iPod)/i.test(userAgent);
};

var isMobileSafari = function() {
	return /(iPad|iPhone).*(Safari\/|Mobile\/)/ig.test(navigator.userAgent)
}

var isWindowsPhone = function() {
	return /(Windows\sPhone|IEMobile)/i.test(userAgent);
};

var isAndroid = function() {
	return /Android/.test(userAgent);
};

var isIE = function() {
	return /(MSIE ([0-9]{1,}[\.0-9]{0,})|Trident\/)/i.test(userAgent);
};

var ieVersion = function() {
	var version = userAgent.match(/(?:MSIE |Trident\/.*rv:)(\d{1,2})\./);

	if ($.isArray(version) && version.length > 1) {
		version = version[1];
	}

	return version && parseInt(version);
};

var isFireFox = function() {
	return /Firefox/i.test(userAgent);
};

var isMobile = function() {
	return isiOS() || isWindowsPhone() || isAndroid();
};

var _toArray = function(obj) {
	return [].slice.call(obj);
};

// Returns a function, that, as long as it continues to be invoked, will not
// be triggered. The function will be called after it stops being called for
// N milliseconds. If `immediate` is passed, trigger the function on the
// leading edge, instead of the trailing.
var debounce = function(func, wait, immediate) {
	var timeout;
	return function() {
		var context = this, args = arguments;
		var later = function() {
			timeout = null;
			if (!immediate) func.apply(context, args);
		};
		var callNow = immediate && !timeout;
		clearTimeout(timeout);
		timeout = setTimeout(later, wait);
		if (callNow) func.apply(context, args);
	};
};

var getClientHeight = function() {

	var documentHeight = 0
	var innerHeight = 0

	if (document.documentElement &&
		typeof document.documentElement.clientHeight === 'number') {
		documentHeight = document.documentElement.clientHeight
	}

	if (typeof window.innerHeight === 'number') {
		innerHeight = window.innerHeight
	}

	return Math.max(documentHeight, innerHeight)
}
var view;

var submitForm =  function(scriptId, params) {
	var checkout = PagarMeCheckoutApi.scripts[scriptId];
	checkout.success(params);
};

var error = function(scriptId, value) {
	var checkout = PagarMeCheckoutApi.scripts[scriptId];
	checkout.error(value);
};

/*
	Quando ocorrer um scroll na página em que está
	sendo usado um modal com position absolute, aplicado
	apenas para o iOS Safari no momento
*/
function onPageScroll (event) {
	modalView.container
		.find('iframe')
		.css({
			top: $(document).scrollTop(),
			height: getClientHeight()
		})
}

var modalView = {
	remotePath: '/modal.html',
	props: {
		style: {
			zIndex: 9999,
			background: 'transparent',
			border: '0 none transparent',
			overflowX: 'hidden',
			overflowY: 'auto',
			margin: 0,
			padding: 0,
			'-webkit-tap-highlight-color': 'transparent',
			'-webkit-touch-callout': 'none',
			position: 'fixed',
			left: 0,
			top: 0,
			width: '100%',
			height: '100%'
		}
	},
	closeModal: function(successFn, errorFn) {

		$(document).off('scroll.pgm-checkout')

		modalView.container.hide();
		modalView.container.find('iframe').blur();
		return true;
	},
	openModal: function() {
		modalView.container.show();
		modalView.container.find('iframe').focus();
	},
	beforeOpen: function(cb) {

		if (isMobileSafari()) {
			modalView.container
				.find('iframe')
				.css({
					position: 'absolute',
					height: getClientHeight(),
					top: $(document).scrollTop()
				})

			$(document).on('scroll.pgm-checkout', debounce(onPageScroll, 300))
		}

		cb && cb();
	},
	create: function() {
		var container = $('<div id="pagarme-checkout-container"></div>').hide();
		$('body').append(container);

		modalView.container = container;

		return new PagarMeCheckout.easyXDM.Rpc({
			remote: staticUrl + modalView.remotePath,
			container: container.get(0),
			props: modalView.props
		},
		{
			local: {
				closeModal: modalView.closeModal,
				submitForm: function(scriptId, params) {
					modalView.closeModal();
					submitForm(scriptId, params);
				},
        error: function(scriptId, value){
          error(scriptId, value)
        }
			},
			remote: {
				config: {},
				animateIn: {}
			}
		});
	}
};

var win;
var transportStack;
var tabView = {
	remotePath: '/tab-mid.html',
	props: {
		style: {
			display: 'none'
		}
	},
	closeModal: function() {
		win.close();
		win = null;
		transportStack.setSource(null);
		transportStack.restart();
	},
	beforeOpen: function(cb) {
		if (win && !win.closed) {
			win.close();
		}

		win = window.open(staticUrl + '/tab.html');
		win.blur();
		transportStack.setSource(win);
		cb && cb();
	},
	openModal: function() {
	},
	create: function() {
		transportStack = createTransport({
			closeModal: function() {
				tabView.closeModal();
			},
			submitForm: function(scriptId, params) {
				tabView.closeModal();
				submitForm(scriptId, params);
			}
		}, staticUrl);

		return {
			config: function(iframeParams, cb) {
				transportStack.callMethod('config', iframeParams, cb);
			},
			animateIn: function(cb) {
				transportStack.callMethod('animateIn');
			}
		};
	}
};

view = modalView;

function PagarMeCheckoutApi(params) {
	if (!params || !params.encryption_key) {
		alert('Encryption key missing.');

		return null;
	}

	this.params = params;
	this.view = view;
	this.id = PagarMeCheckoutApi.scriptsCount_++;

	PagarMeCheckoutApi.scripts[this.id] = this;

	if (!PagarMeCheckoutApi.bridge || !isModalExistent()) {
		PagarMeCheckoutApi.bridge = view.create();
	}

    function isModalExistent() {
        return !!$('#pagarme-checkout-container > iframe').length
    }
};

PagarMeCheckoutApi.scriptsCount_ = 0;
PagarMeCheckoutApi.scripts = {};

PagarMeCheckoutApi.prototype.mapIframeParameters_ = function(params) {
	var mappings = {
		card_brands: 'brands'
	};

	for (var name in mappings) {
		if (params[name]) {
			params[mappings[name]] = params[name];
			delete params[name];
		}
	}
};

PagarMeCheckoutApi.prototype.open = function(params) {
	var bridge = PagarMeCheckoutApi.bridge;
	var self = this;

	var iframeParameters = params;
	for (var name in this.params) {
		iframeParameters[name] = this.params[name];
	}
	this.mapIframeParameters_(iframeParameters);

	iframeParameters.script_id = this.id;

	this.view.beforeOpen(function() {
		bridge.config(iframeParameters, function() {
			self.view.openModal();
			bridge.animateIn();
		});
	});
};

PagarMeCheckoutApi.prototype.close = function() {
  this.view.closeModal();
};

PagarMeCheckoutApi.prototype.success = function(params) {
	if (this.params.success) {
		this.params.success.call(this, params);
	}
};

PagarMeCheckoutApi.prototype.error = function(params) {
	if (this.params.error) {
		this.params.error.call(this, params);
	}
};

window.PagarMeCheckout.Checkout = PagarMeCheckoutApi;

var iframeContainer;

var openModal = function() {
	var checkout = $(this).data('checkout');
	var iframeParameters = getIframeParameters($('[data-checkout-id=' + $(this).data('script') + ']'));

	checkout.open(iframeParameters);
};

var findScriptTags = function() {
	var scriptTags = $('script');
	var tags = [];

	for (var i = 0; i < scriptTags.length; i++) {
		if (scriptTags[i].src.indexOf(staticUrl + 'checkout.js') != -1 || scriptTags[i].src.indexOf('https://pagar.me/assets/checkout/checkout.js') != -1) {
			tags.push($(scriptTags[i]));
		}
	}

	return tags;
};

var rightEncoding = function(string) {
	var str = string;

	try {
		str = decodeURIComponent(escape(string));
	} catch (e) {
	}

	return str;
};

var getIframeParameters = function(tag) {
	var allowedProperties = [
		'create-token',
		'customer-data',
		'payment-methods',
		'brands',
		'card-brands',
		'header-text',
		'payment-button-text',
		'amount',
		'postback-url',
		'default-installment',
		'show-installment',
		'max-installments',
		'encryption-key',
		'ui-color',
		'interest-rate',
		'customer-name',
		'customer-document-number',
		'customer-email',
		'customer-address-street',
		'customer-address-street-number',
		'customer-address-complementary',
		'customer-address-neighborhood',
		'customer-address-city',
		'customer-address-state',
		'customer-address-zipcode',
		'customer-phone-ddd',
		'customer-phone-number',
		'free-installments',
		'metadata-discount-amount',
		'metadata-gross-amount',
		'boleto-discount-percentage',
		'boleto-discount-amount',
		'boleto-installment',
		'boleto-max-installments',
		'tracking',
		'boleto-expiration-date',
		'boleto-first-installment-amount',
		'disable-zero-document-number',
		'boleto-helper-text',
		'credit-card-helper-text',
		'credit-card-discount-amount',
		'credit-card-discount-percentage'
	];
	var properties = {};

	for (var i = 0; i < allowedProperties.length; i++) {
		if (tag.attr('data-' + allowedProperties[i]) !== undefined) {
			properties[allowedProperties[i].replace(/-/g, '_')] = rightEncoding(tag.attr('data-' + allowedProperties[i]));
		}
	}

	return properties;
};

var createButton = function(text) {
	text = text || 'Pagar';
	var button = $('<input class="pagarme-checkout-btn" type="button" value="' + rightEncoding(text) + '" />');
	button.click(openModal);

	return button;
};

var scriptTags = findScriptTags();
var scriptIdCount = 1;

for (var i = 0; i < scriptTags.length; i++) {
	var script = scriptTags[i];

	var form = script.parents('form');

	if (!form || !form.length) {
		continue;
	}

	if (!script.data('amount') || !script.data('encryption-key')) {
		continue;
	}

	var button = createButton(script.data('button-text'));
	button.insertBefore(script);

	if (script.data('button-class')) {
		button.addClass(script.data('button-class'));
	}

	var checkout = new PagarMeCheckoutApi({
		encryption_key: script.data('encryption-key'),
		success: function(params) {
			var script = $('[data-checkout-id=' + this.id + ']');
			var form = script.parents('form');
			var prefix = null;

			var createInputForParams = function(params, prefix) {
				prefix = prefix;

				$.each(params, function(name) {
					var inputName;

					if (prefix) {
						inputName = prefix + '[' + name + ']';
					} else {
						inputName = name;
					}

					if ($.isPlainObject(this)) {
						createInputForParams(this, inputName);
					} else {
						var $input = $('<input />', {
							name: inputName,
							type: 'hidden',
							val: this
						});

						form.append($input);
					}
				});
			};

			if (!params.token) {
				prefix = 'pagarme';
			}

			createInputForParams(params, prefix);
			form.submit();
		}
	});

	var scriptId;
	scriptId = checkout.id;
	script.attr('data-checkout-id', scriptId);

	button.data('script', scriptId);
	button.data('checkout', checkout);
}

	}
})();
