var PagarMe = PagarMe || {};

(function(PagarMe) {
	var getCardBrand = function(cardNumber) {
		if(!cardNumber) {
			return null;
		}

		cardNumber = cardNumber.replace(/[^0-9]/g, '');

		var creditCard = new PagarMe.creditCard();
		creditCard.cardNumber = cardNumber;
		return creditCard.brand();

	};

	PagarMe.CardForm = function(container, opts) {
		opts = opts || {};

		var event = 'keyup.card';
		var brand = null;

		var card = $(container).find('.card');
		var number = card.find('.number');
		var expiration = card.find('.expiration');
		var expirationLabel = card.find('.expiration-label');
		var cvv = card.find('.cvv');
		var cvvAmex = card.find('.cvv.amex');
		var name = card.find('.name');

		var numberInput = $(opts.number.input);
		var cvvInput = $(opts.cvv.input);
		var nameInput = $(opts.name.input);
		var expirationInput = $(opts.expiration.input);

		var defaultCvv = opts.cvv.value || '•••';
		var defaultNumber = opts.number.value || '•••• •••• •••• ••••';
		var defaultName = opts.name.value || 'Nome completo';
		var defaultExpiration = opts.expiration.value || 'MM/AA';

		cvv.text(defaultCvv);
		cvvAmex.text(Array(5).join(defaultCvv.charAt(0)));
		number.text(defaultNumber);
		name.text(defaultName);
		expiration.text(defaultExpiration);

		var fillNumber = function () {
			if (numberInput.val()) {
				setTimeout(function() {
					number.text(numberInput.val());

					var cardBrand = getCardBrand(numberInput.val());

					if (cardBrand && cardBrand !== 'unknown') {
						card.removeClass(brand);
						card.addClass(cardBrand);
						numberInput.parent('div').addClass(cardBrand);
						brand = cardBrand;
					} else {
						numberInput.parent('div').removeClass(brand);
						card.removeClass(brand);
						brand = null;
					}
				}, 0);
			} else {
				number.text(defaultNumber);
				card.removeClass(brand);
				brand = null;
			}
		};

		var fillCvv = function() {
			if (cvvInput.val()) {
				cvv.text(cvvInput.val())
			} else {
				cvv.text(defaultCvv);
				cvvAmex.text(Array(5).join(defaultCvv.charAt(0)));
			}
		};

		var fillName = function () {
			if (nameInput.val()) {
				name.text(nameInput.val());
			} else {
				name.text(defaultName);
			}
		};

		var fillExpiration = function() {
			if (expirationInput.val()) {
				setTimeout(function() {
					expiration.text(expirationInput.val());
				}, 0);
			} else {
				expiration.text(defaultExpiration);
			}
		};

		numberInput.bind(event, fillNumber).focus(function() {
			number.addClass('focused');
		}).blur(function() {
			number.removeClass('focused');
		});

		cvvInput.bind(event, fillCvv).focus(function() {
			cvv.addClass('focused');
			card.addClass('flipped');
		}).blur(function() {
			cvv.removeClass('focused');
			card.removeClass('flipped');
		});

		nameInput.bind(event, fillName).focus(function() {
			name.addClass('focused');
		}).blur(function() {
			name.removeClass('focused');
		});

		expirationInput.bind(event, fillExpiration).focus(function() {
			expiration.addClass('focused');
			expirationLabel.addClass('focused');
		}).blur(function() {
			expiration.removeClass('focused');
			expirationLabel.removeClass('focused');
		});

		return {
			clear: function() {
				card.removeClass(brand);
				number.text(defaultNumber);
				cvv.text(defaultCvv);
				name.text(defaultName);
				expiration.text(defaultExpiration);
			},
			fill: function() {
				fillNumber();
				fillCvv();
				fillName();
				fillExpiration();
			}
		};
	};
})(PagarMe);
