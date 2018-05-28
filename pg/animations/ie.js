var PagarMe = PagarMe || {};
PagarMe.Checkout = PagarMe.Checkout || {};

(function(checkout) {
	checkout.Animations.aux = checkout.Animations.aux || {};

	checkout.Animations.openModal = function(cb) {
		$('#pagarme-checkout-ui').css({
			opacity: 1
		});

		$('#pagarme-modal-box').css({
			opacity: 1,
			marginTop: 0
		});

		cb && cb();
	};

	checkout.Animations.closeModal = function(cb) {
		$('#pagarme-modal-box').css({
			opacity: 0
		});

		$('#pagarme-checkout-ui').css({
			opacity: 0
		});

		cb && cb();
	};

	checkout.Animations.beginAuthorization = function(params, cb) {
		var title = $('#pagarme-checkout-step-title');

		var animateButton = function($button, cb) {
			checkout.Animations.aux.buttonBuffer = $button;
			checkout.Animations.aux.buttonTextBuffer = $button.html();
			$button.text('Processando...');

			oldTitle = title.html();
			title.animate({
				opacity: 0
			});

			$('#pagarme-checkout-amount-information').animate({
				opacity: 0
			});

			cb && cb();
		};

		if (params.step.attr('id') == 'pagarme-modal-box-step-choose-method') {
			var $div = params.step.find('#pagarme-checkout-boleto-button');
			var $button = $div.find('button');

			animateButton($button);
			$div.removeClass('darker-hover arrow');

			params.step.find('#pagarme-checkout-card-button').slideUp();
			cb && cb();
		} else {
			var $button = params.step.find('button');

			animateButton($button);

			checkout.Animations.aux.oldStepHeight = params.step.css('height');
			params.step.css({
				overflow: 'hidden',
				position: 'absolute',
				height: params.step.css('height') 
			});

			params.step.find('#pagarme-checkout-card-container .front *').animate({
				opacity: 0
			}, 100);
			params.step.find('#pagarme-checkout-card-container').slideUp(600);

			$button.css({
				position: 'absolute',
				bottom: 0,
				left: 0,
				zIndex: 100
			});

			params.step.animate({
				height: 80
			}, 600, $.bez([0,0,0.4,1]), function() {
				cb && cb();
			});
		}
	};

	checkout.Animations.endAuthorization = function(params, cb) {
		var title = $('#pagarme-checkout-step-title');

		title.animate({
			opacity: 1
		});

		cb && cb();
	};

	var oldSuccess = checkout.Animations.success;
	checkout.Animations.success = function(params, cb) {
		if (params.step.attr('id') != 'pagarme-modal-box-step-choose-method') {
			var $button = params.step.find('button');
			var offsetButton = $button.offset();

			$button.css({
				position: 'absolute',
				top: offsetButton.top,
				left: offsetButton.left
			}).parents(':not(#pagarme-checkout-ui)').css({
				position: 'static'
			});

			params.step.css({
				height: 0
			});
		}

		oldSuccess(params, cb);
	};

	var oldDismissError = checkout.Animations.dismissError;
	checkout.Animations.dismissError = function(cb) {
		var returnStep = $('.pagarme-checkout-step.recover-from-error');

		setTimeout(function() {
			returnStep.find('#pagarme-checkout-card-container').slideDown(600);
		}, 650);

		oldDismissError(function() {
			returnStep.find('#pagarme-checkout-card-container .front *').animate({
				opacity: 1
			}, 400);

			cb && cb();
		});
	};
})(PagarMe.Checkout);
