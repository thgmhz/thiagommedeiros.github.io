var PagarMe = PagarMe || {};
PagarMe.Checkout = PagarMe.Checkout || {};

(function(checkout) {
	checkout.Animations = {
		setup: function() {
			$('.pagarme-checkout-step.hidden').css({
				opacity: 0,
				display: 'none'
			});

			$('.pagarme-checkout-step.next').css({
				left: '100px'
			});

			$('.pagarme-checkout-step.previous').css({
				left: '-100px'
			});

			$('.pagarme-checkout-step:not(.hidden)').css({
				opacity: 1,
				left: 0,
				display: 'block'
			});
		},
		openModal: function(cb) {
			$('#pagarme-checkout-ui').animate({
				opacity: 1
			}, function() {
				$('#pagarme-modal-box').animate({
					top: 0,
					opacity: 1
				}, 300, $.bez([0, 0, 0, 1]), function() {
					if (cb) {
						cb();
					}
				});
			});
		},
		closeModal: function(cb) {
			$('#pagarme-modal-box').animate({
				opacity: 0,
				top: -90
			}, 300, $.bez([0, 0, 1, 0]), function() {
				$('#pagarme-checkout-ui').animate({
					opacity: 0
				}, cb);
			});
		},
		stepOut: function(params, cb) {
			var outClass;
			var left;

			if (params.direction > 0) {
				left = '100px';
				outClass = 'next';
			} else {
				left = '-100px';
				outClass = 'previous';
			}

			var moveOut = function(cb) {
				params.element.animate({
					left: left,
					opacity: 0
				}, 150, 'linear', function() {
					$(this).hide();
					$(this).addClass(outClass + ' hidden');

					if (cb) {
						cb();
					}
				});
			};

			if (params.moveUp) {
				var animationLength = $(document).scrollTop();
				$('html,body').animate({
					scrollTop: 0
				}, animationLength, $.bez[0, 0, 0.58, 1], function() {
					moveOut(cb);
				});
				$('input,textarea,select,option').filter(':focus').blur();
			} else {
				moveOut(cb);
			}
		},
		stepIn: function(params, cb) {
			params.element.show();
			params.element.removeClass('previous next hidden'); 

			params.element.animate({
				left: 0,
				opacity: 1
			}, 750, $.bez([0.22, 1.64, 0.32, 0.95]), function() {
				if (cb) {
					cb();
				}
			});
		},
		beginAuthorization: function(params, cb) {
			var animateButtonLoading = function(button, bgColor, cb) {
				var title = $('#pagarme-checkout-step-title');
				checkout.Animations.aux.oldTitle = title.text();
				var called = false;

				title.animate({
					opacity: 0
				}, function() {
					title.text('Processando...').animate({
						opacity: 1
					});
				});

				$('#pagarme-checkout-amount-information').animate({
					opacity: 0
				});

				checkout.Animations.aux.buttonBuffer = button;
				checkout.Animations.aux.buttonTextBuffer = button.html();
				button.animate({
					color: bgColor
				}, 400, function() {
					var image = $('<div class="spinner"></div>');
					image.css({
						position: 'absolute',
						left: '50%',
						top: '50%',
						width: 30,
						height: 30,
						marginTop: -21,
						marginLeft: -21
					});
					image.hide();

					button.css({
						position: 'relative'
					}).html('').append(image);
					image.fadeIn();

					button.animate({
						color: '#fff'
					}, 400, function() {
						$('#pagarme-checkout-ui').animate({
							scrollTop: 0
						}, $('#pagarme-checkout-ui').scrollTop()*2, $.bez[0, 0, 0.58, 1]);

						if(!called) {
							cb && cb();
							called = true;							
						}
					});
				});
			};

			if (params.step.attr('id') == 'pagarme-modal-box-step-choose-method') {
				params.step.find('#pagarme-checkout-boleto-button .button-indicator').fadeOut();
				var div = params.step.find('#pagarme-checkout-boleto-button');

				params.step.find('#pagarme-checkout-card-button').slideUp(function() {
					div.css({
						borderRadius: 6
					}).removeClass('darker-hover arrow');

					animateButtonLoading(div.find('button'), div.css('background-color'), cb);
				});
			} else {
				var button = params.step.find('button');
				animateButtonLoading(button, button.css('background-color'), function() {
					checkout.Animations.aux.oldStepHeight = params.step.height();

					params.step.css({
						overflow: 'hidden',
						position: 'absolute',
						height: params.step.height()
					});

					button.css({
						position: 'absolute',
						bottom: 0,
						left: 0,
						zIndex: 100
					});

					params.step.find('#pagarme-checkout-card-container, .pagarme-checkout-input-container').animate({
						opacity: 0
					});

					params.step.animate({
						height: 80
					}, 600, $.bez([0,0,.40,1]), function() {
						
						setTimeout(cb, 1000);
					});
				});
			}
		},
		endAuthorization: function(params, cb) {
			cb();
		},
		success: function(params, cb) {
			if (params.boleto) {
				cb && cb();
				return;
			}

			var addSuccessIcon = function(button, cb) {
				var img = $('<div><img src="images/transaction-success.png" height="30" width="30" /></div>');

				img.css({
					overflow: 'hidden',
					width: 0,
					position: 'absolute',
					top: parseInt(button.css('height'))/2,
					left: parseInt(button.css('width')) - 30,
					marginTop: -15,
					marginLeft: -15
				});

				button.css({
					position: 'absolute'
				}).append(img);

				img.animate({
					width: 30,
					height: 30
				}, 100, cb);
			};

			var finishSuccess = function(button, cb) {
				var offsetButton = button.offset();

				button.css({
					width: parseInt(button.css('width'))
				});

				button.css({
					position: 'absolute',
					top: offsetButton.top,
					left: offsetButton.left
				}).parents(':not(#pagarme-checkout-ui)').css({
					position: 'static'
				});
				
				button.animate({
					top: '50%',
					marginTop: -button.height()
				}, 500, $.bez([0, 0, 0, 1]), function() {
					setTimeout(cb, 0);
				});
			};

			if (params.step.attr('id') == 'pagarme-modal-box-step-choose-method') {
				var boletoDiv = params.step.find('#pagarme-checkout-boleto-button');
				var boletoButton = boletoDiv.find('button');

				boletoButton.animate({
					color: boletoDiv.css('background-color')
				}, 400, function() {
					boletoButton.text('Transação autorizada');
					boletoButton.animate({
						color: '#fff'
					}, 100, function() {
						boletoDiv.animate({
							backgroundColor: '#6db963'
						}, 400, function() {
							$('#pagarme-checkout-amount-information, #pagarme-checkout-step-title').animate({
								opacity: 0
							}, 'fast');
							addSuccessIcon(boletoDiv);
							finishSuccess(boletoDiv, cb);
						});
					});
				});
			} else {
				var button = params.step.find('.pagarme-modal-box-next-step');
				var icon = params.step.find('.pagarme-modal-box-next-step .icon-pg-checkout-continue');

				button.animate({
					color: button.css('background-color')
				}, 400, function() {
					button.text('Transação autorizada');
					button.animate({
						backgroundColor: '#6db963',
						color: '#fff'
					}, 400, function() {
						$('#pagarme-checkout-amount-information, #pagarme-checkout-step-title, .pagarme-checkout-step-indicator').animate({
							opacity: 0
						}, 'fast');
						addSuccessIcon(button);
						finishSuccess(button, cb);
					});
				});
			}
		},
		error: function(params, cb) {
			$('#pagarme-checkout-step-title').text(checkout.Animations.aux.oldTitle);

			$('#pagarme-checkout-amount-information').animate({
				opacity: 0
			});

			params.step.addClass('recover-from-error');
			checkout.Animations.stepOut({
				element: params.step,
				direction: -1
			});

			if(params.buttonBuffer){
				checkout.Animations.aux.buttonBuffer = params.buttonBuffer
			}
			checkout.Animations.aux.buttonBuffer.html(checkout.Animations.aux.buttonTextBuffer);

			checkout.Animations.stepIn({
				element: $('#pagarme-checkout-error-container')
			}, cb);
		},
		dismissError: function(cb) {
			$('#pagarme-checkout-amount-information').animate({
				opacity: 1
			});

			var returnStep = $('.pagarme-checkout-step.recover-from-error');
			returnStep.removeClass('recover-from-error');

			checkout.Animations.stepOut({
				element: $('#pagarme-checkout-error-container'),
				direction: 1
			});

			checkout.Animations.stepIn({
				element: returnStep
			}, function() {
				if (returnStep.attr('id') == 'pagarme-modal-box-step-choose-method') {
					returnStep.find('#pagarme-checkout-boleto-button .button-indicator').fadeIn();
					returnStep.find('#pagarme-checkout-boleto-button').addClass('darker-hover arrow').css({
						borderTopRightRadius: 0,
						borderTopLeftRadius: 0
					});
					returnStep.find('#pagarme-checkout-card-button').slideDown(cb);
				} else {
					var button = returnStep.find('button');
					returnStep.find('#pagarme-checkout-card-container, .pagarme-checkout-input-container').animate({
						opacity: 1
					}, 600);

					returnStep.animate({
						height: checkout.Animations.aux.oldStepHeight
					}, 600, function() {
						returnStep.css({
							overflow: 'visible'
						});

						button.css({
							position: 'static'
						});

						cb && cb();
					});
				}
			});
		}
	};

	// Aux variables
	checkout.Animations.aux = checkout.Animations.aux || {};
})(PagarMe.Checkout);
