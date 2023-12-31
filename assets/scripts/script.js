var data, focusBalance, blurBalance,
    dataFetcher = new XMLHttpRequest(),
    blurTime = Date.now();

dataFetcher.onreadystatechange = function () {
	if (this.readyState === 4 && this.status === 200) {
		data = JSON.parse(this.responseText);
		exchangePrices();

		if (depositPrice) {
			setDepositPower();
			depositPrice.addEventListener('keyup', setDepositPower);
			depositPrice.addEventListener('change', setDepositPower);
		}

		if (powerCalculator) {
			powerPriceInput.addEventListener('keyup', updateCalculator);
			powerPriceInput.addEventListener('change', updateCalculator);
		}

		if (setLiveBalance) {
			focusBalance = blurBalance = parseFloat(data.user_balance);
			addUserBalance();

			window.addEventListener('blur', function () {
				blurTime = Date.now();
				blurBalance = focusBalance;
			});

			window.addEventListener('focus', function () {
				focusBalance = blurBalance + ((Date.now() - blurTime) / data.live_feq) * parseFloat(data.user_earn_rate);
			});

			window.setInterval(function() {
				addUserBalance(data.user_earn_rate);
			}, data.live_feq);
		}

		if (setLivePower) {
			updateUserPower();

			window.setInterval(function() {
				updateUserPower();
			}, data.live_feq);
		}

		if (refBanner) {
			updateBanner();
			refBanner.addEventListener('change', updateBanner);
		}
	}
}

dataFetcher.open('GET', '/data');
dataFetcher.send(null);

var setLiveBalance = document.getElementsByClassName('livebalance')[0],
	setLivePower = document.getElementsByClassName('livepower')[0];

function addUserBalance(add = 0) {
    let dec = (conversion.currency == 'btc') ? 8 : 2;
	focusBalance = parseFloat(focusBalance + add);
	setLiveBalance.innerHTML = (focusBalance * conversion.rate).toFixed(dec) +' '+ conversion.currency.toUpperCase();
}

function updateUserPower(random = Math.random() * (.025 + .025) - .025) {
	if (data.user_power < .025) random = 0;
	setLivePower.innerHTML = (data.user_power + random).toFixed(data.power_d) +' '+ data.power_u;
}

// convert prices

var setCurrency = document.getElementsByClassName('setcurrency'),
	currencyItems = document.getElementsByClassName('currency'),
	convertItems = document.getElementsByClassName('convertbtc'),
	convertItemValues = [],
	conversion = {};

function exchangePrices() {
	switch (true) {
		case (this.value == 'btc' || (('rate_'+ this.value) in data)):
			conversion.currency = localStorage.currency = this.value;
			break;

		case (localStorage.currency == 'btc' || (('rate_'+ localStorage.currency) in data)):
			conversion.currency = localStorage.currency;
			break;

		default:
			conversion.currency = localStorage.currency = setCurrency[0].value;
			break;
	}

	for (let i = 0; i < setCurrency.length; i++)
		setCurrency[i].value = conversion.currency;

	conversion.rate = (conversion.currency == 'btc') ? 1 : data['rate_'+ conversion.currency];

	for (let i = 0; i < convertItems.length; i++) {
		let inputElement = convertItems[i].tagName == 'INPUT',
			dec = (conversion.currency == 'btc') ? 8 : 2,
			decStep = (conversion.currency == 'btc') ? 0.0001 : 1;

		if (!convertItemValues[i])
			convertItemValues[i] = (inputElement)
				? convertItems[i].value
				: convertItems[i].innerHTML;

		if (inputElement) convertItems[i].removeAttribute('value');

		switch (true) {
			case conversion.currency == 'btc' && convertItems[i].classList.contains('nobtc'):
				dec = 2;
				decStep = 1;
				inputElement
					? convertItems[i].value = (convertItemValues[i] * data.rate_usd).toFixed(dec)
					: convertItems[i].innerHTML = (convertItemValues[i] * data.rate_usd).toFixed(dec) +' USD';
				break;

			case conversion.currency == 'btc' && convertItems[i].classList.contains('shortbtc'):
				dec = 4;
				inputElement
					? convertItems[i].value = (convertItemValues[i] * conversion.rate).toFixed(dec)
					: convertItems[i].innerHTML = (convertItemValues[i] * conversion.rate).toFixed(dec) +' '+ conversion.currency.toUpperCase();
				break;

			default:
				inputElement
					? convertItems[i].value = (convertItemValues[i] * conversion.rate).toFixed(dec)
					: convertItems[i].innerHTML = (convertItemValues[i] * conversion.rate).toFixed(dec) +' '+ conversion.currency.toUpperCase();
				break;
		}

		if (inputElement) convertItems[i].setAttribute('step', decStep);
	}

	for (let i = 0; i < currencyItems.length; i++)
		currencyItems[i].innerHTML = conversion.currency == 'btc' && currencyItems[i].classList.contains('nobtc')
			? 'USD'
			: conversion.currency.toUpperCase();

	if (powerCalculator) updateCalculator();
}

for (let i = 0; i < setCurrency.length; i++)
	setCurrency[i].addEventListener('change', exchangePrices);

// ajax forms

var loader = document.getElementsByClassName('loader')[0],
	forms = document.getElementsByTagName('form'),
	formData = {},
	spamLock = false;

for (let i = 0; i < forms.length; i++) {
	let form = forms[i];
	let autoSubmit = form.classList.contains('autosubmit'),
		innerSubmit = form.getElementsByClassName('submit')[0],
		outerSubmit = document.querySelectorAll('.submit[form="' + form.id + '"]')[0],
		inputs = Array.from(form.querySelectorAll('[name]')),
		exceptionWrap = form.querySelectorAll('[hidden]'),
		grecaptcha = form.getElementsByClassName('g-recaptcha')[0];

/*	for (let i = 0; i < inputs.length; i++)
		for (let j = 0; j < exceptionWrap.length; j++)
			if (exceptionWrap[j].contains(inputs[i])) delete inputs[i]; */

	if (autoSubmit) submitForm(inputs, grecaptcha);
	else {

		form.addEventListener('keypress', function (e) {
			if (e.keyCode === 13 && e.target.tagName !== 'TEXTAREA') {
				e.preventDefault();
				submitForm(inputs, grecaptcha);
			}
		});

		innerSubmit.addEventListener('click', function () {
			submitForm(inputs, grecaptcha);
		});

		outerSubmit && outerSubmit.addEventListener('click', function () {
			submitForm(inputs, grecaptcha);
		});
	}
}

function submitForm(inputs, verify = null) {
	if (!spamLock) {
		spamLock = true;
		loader.classList.add('on');

		for (let prop in inputs) {
			if (inputs[prop].type !== 'checkbox' || (inputs[prop].type === 'checkbox' && inputs[prop].checked)) {

				if (formData[inputs[prop].name]) {

					if (!Array.isArray(formData[inputs[prop].name])) formData[inputs[prop].name] = [formData[inputs[prop].name]];
					formData[inputs[prop].name].push(inputs[prop].value);
				}

				else formData[inputs[prop].name] = inputs[prop].value;
			}

			if (conversion.currency != 'btc' && inputs[prop].classList.contains('convertbtc'))
				formData[inputs[prop].name] = (inputs[prop].value / conversion.rate).toFixed(8);
		}
	}

	if (verify) grecaptcha.execute();
	else submitData();
}

function grecaptchaCallback() {
	formData.grecaptcharesponse = grecaptcha.getResponse();
	submitData();
	grecaptcha.reset();
}

function submitData() {
	let getQueries = {},
		handler = new XMLHttpRequest();

	location.search.substr(1).split('&').forEach(function (item) {
		getQueries[item.split('=')[0]] = item.split('=')[1];
	});

	for (let prop in getQueries) formData[prop] = getQueries[prop];

	for (let prop in formData) {
		switch (true) {
			case formData[prop] === '':
				formData[prop] = null;
				break;

			case typeof(formData[prop]) === 'string' && !isNaN(formData[prop]):
				formData[prop] = Number(formData[prop]);
				break;
		}
	}

	handler.onreadystatechange = function () {
		if (this.readyState === 4 && this.status === 200) {
			loader.classList.remove('on');
			if (this.responseText) {
				let data = JSON.parse(this.responseText);
				window[data.function].apply(null, data.parameters);
			}
		}
	};

	handler.open('POST', '?handle', true);
	handler.send(JSON.stringify(formData));
	formData = {};
	spamLock = false;
}

function invalidInput(name, errorMessage) {
	let inputElement = document.querySelector('[name="'+ name +'"]');

	inputElement.classList.add('invalid');
	inputElement.focus();
	inputElement.setCustomValidity(errorMessage);
	// inputElement.form.reportValidity();
	inputElement.reportValidity();

	inputElement.addEventListener('input', function () {
		this.setCustomValidity('');
	});
}

function focusInput(name, message) {
	let inputElement = document.querySelector('[name="'+ name +'"]');

	inputElement.removeAttribute('hidden');
	inputElement.focus();
	inputElement.setCustomValidity(message);
	// inputElement.form.reportValidity();
	inputElement.reportValidity();

	inputElement.addEventListener('input', function () {
		this.setCustomValidity('');
	});
}

function createAlert(nodeClass, message) {
	let previousAlert = document.getElementsByClassName('notification')[0];
	if (previousAlert) document.body.removeChild(previousAlert);

	let messageBox = document.createElement('div'),
		messageNode = document.createTextNode(message);

	messageBox.appendChild(messageNode);
	messageBox.classList.add('notification', nodeClass);
	document.body.appendChild(messageBox);
}

function redirectAlert(targetLink, nodeClass, message, displayTime = 1000) {
	createAlert(nodeClass, message);
    loader.classList.add('on');

	setTimeout(function () {
		window.location.replace(targetLink);
	}, displayTime);
}

var showPasswords = document.getElementsByClassName('showpw');
for (let i = 0; i < showPasswords.length; i++) {
	let targetElement = document.getElementById(showPasswords[i].getAttribute('data-for'));

	showPasswords[i].addEventListener('mousedown', function () {
		targetElement.setAttribute('type', 'text');
	});

	showPasswords[i].addEventListener('touchstart', function () {
		targetElement.setAttribute('type', 'text');
	});

	window.addEventListener('mouseup', function () {
		targetElement.setAttribute('type', 'password');
	});

	window.addEventListener('touchend', function () {
		targetElement.setAttribute('type', 'password');
	});
}

var formatDates = document.getElementsByClassName('formatunix');
for (let i = 0; i < formatDates.length; i++) {
	if (Number.isInteger(parseInt(formatDates[i].innerHTML))) {
		let timestamp = parseInt(formatDates[i].innerHTML);
		let date = new Date(timestamp * 1000);

		formatDates[i].innerHTML = date.toLocaleString(false, {
			"year": "numeric",
			"month": "short",
			"day": "2-digit",
			"hour": "2-digit",
			"minute": "2-digit"
		});
	}
}

var toggleButtons = document.getElementsByClassName('toggle');
for (let i = 0; i < toggleButtons.length; i++) {

	toggleButtons[i].addEventListener('click', function () {
		let elementID = this.getAttribute('data-target');
		let element = document.getElementById(elementID);

		if (element.hasAttribute('hidden'))
			element.removeAttribute('hidden')
		else element.setAttribute('hidden', '');
	});
}

var refBanner = document.getElementById('refbanner');
function updateBanner() {
	let refImage = document.getElementById('refimage'),
		refBB = document.getElementById('refbb'),
		refHTML = document.getElementById('refhtml'),
		refDirect = document.getElementById('refdirect');

	refImage.src = data.site_url+ '/assets/images/banner/'+ refBanner.value +'.gif';
	refBB.value = '[url='+ data.user_ref_url +'][img]'+ refImage.src +'[/img][/url]';
	refHTML.value = '<a href="'+ data.user_ref_url +'"><img src="'+ refImage.src +'"></a>';
	refDirect.value = refImage.src;
}

// power calculator

function convertPower(amount) {
	if (amount > data.max_d) amount = data.max_d;
	let minPower = data.min_d / data.power_p,
		maxPower = data.max_d / data.power_p;
	let scaling = ((amount - data.min_d) / (data.max_d - data.min_d)) * data.scaling;

	if (amount < data.min_d) scaling = 0;
	if (amount > data.max_d) scaling = data.scaling;

	let result = amount / ((1 - scaling) * data.power_p);

	return result.toFixed(data.power_d) +' '+ data.power_u;
}

function profitPerTime(amount, days) {
	if (amount == 0) amount = 0.00000001;
	let scaling = ((amount - data.min_d) / (data.max_d - data.min_d)) * data.scaling;

	if (amount < data.min_d) scaling = 0;
	if (amount > data.max_d) scaling = data.scaling;

	return ((amount / ((data.duration * (1 - scaling)) * 86400)) * (days * 86400)) / amount;
}

var powerCalculator = document.getElementById('calculator'),
	powerPriceInput = document.getElementsByClassName('price')[0];
function updateCalculator() {
	let price = powerPriceInput,
		power = powerCalculator.getElementsByClassName('power')[0],
		unitPrice = powerCalculator.getElementsByClassName('unitprice')[0],
		hourlyProfit = powerCalculator.getElementsByClassName('hourly')[0],
		hourlyProfitPc = powerCalculator.getElementsByClassName('hourlypc')[0],
		dailyProfit = powerCalculator.getElementsByClassName('daily')[0],
		dailyProfitPc = powerCalculator.getElementsByClassName('dailypc')[0],
		weeklyProfit = powerCalculator.getElementsByClassName('weekly')[0],
		weeklyProfitPc = powerCalculator.getElementsByClassName('weeklypc')[0],
		monthlyProfit = powerCalculator.getElementsByClassName('monthly')[0],
		monthlyProfitPc = powerCalculator.getElementsByClassName('monthlypc')[0],
		yearlyProfit = powerCalculator.getElementsByClassName('yearly')[0],
		yearlyProfitPc = powerCalculator.getElementsByClassName('yearlypc')[0],
		roi = powerCalculator.getElementsByClassName('roi')[0],
		dec = (conversion.currency == 'btc') ? 8 : 2,
		decStep = (conversion.currency == 'btc') ? 0.0001 : 1;

	if (price.value < 0)
		price.value = (parseFloat(data.min_d) * conversion.rate).toFixed(dec);

	if ((price.value / conversion.rate) > parseFloat(data.max_d))
		price.value = (parseFloat(data.max_d) * conversion.rate).toFixed(dec);

	power.innerHTML = convertPower(price.value / conversion.rate);

	price.setAttribute('min', (parseFloat(data.min_d) * conversion.rate).toFixed(dec));
	price.setAttribute('max', (parseFloat(data.max_d) * conversion.rate).toFixed(dec));
	price.setAttribute('step', decStep);

	let zero = price.value == 0 ? 0 : 1;

	hourlyProfitRate = profitPerTime(price.value / conversion.rate, 0.0416666667);
	hourlyProfit.innerHTML = (hourlyProfitRate * price.value).toFixed(dec) +' '+ conversion.currency.toUpperCase();
	hourlyProfitPc.innerHTML = (zero * hourlyProfitRate * 100).toFixed(2) + '%';

	dailyProfitRate = profitPerTime(price.value / conversion.rate, 1);
	dailyProfit.innerHTML = (dailyProfitRate * price.value).toFixed(dec) +' '+ conversion.currency.toUpperCase();
	dailyProfitPc.innerHTML = (zero * dailyProfitRate * 100).toFixed(2) + '%';

	weeklyProfitRate = profitPerTime(price.value / conversion.rate, 7);
	weeklyProfit.innerHTML = (weeklyProfitRate * price.value).toFixed(dec) +' '+ conversion.currency.toUpperCase();
	weeklyProfitPc.innerHTML = (zero * weeklyProfitRate * 100).toFixed(2) + '%';

	monthlyProfitRate = profitPerTime(price.value / conversion.rate, 30);
	monthlyProfit.innerHTML = (monthlyProfitRate * price.value).toFixed(dec) +' '+ conversion.currency.toUpperCase();
	monthlyProfitPc.innerHTML = (zero * monthlyProfitRate * 100).toFixed(2) + '%';

	yearlyProfitRate = profitPerTime(price.value / conversion.rate, 365);
	yearlyProfit.innerHTML = (yearlyProfitRate * price.value).toFixed(dec) +' '+ conversion.currency.toUpperCase();
	yearlyProfitPc.innerHTML = (zero * yearlyProfitRate * 100).toFixed(2) + '%';

	let scaling = (((price.value / conversion.rate) - data.min_d) / (data.max_d - data.min_d)) * data.scaling;

	if ((price.value / conversion.rate) < data.min_d) scaling = 0;
	if ((price.value / conversion.rate) > data.max_d) scaling = data.scaling;

	unitPrice.innerHTML = (((1 - scaling) * data.power_p) * conversion.rate).toFixed(dec) +' '+ conversion.currency.toUpperCase();
	roi.innerHTML = (data.duration * (1 - scaling)).toFixed(0) + ' days';
}

var depositPrice = document.getElementById('deposit');
function setDepositPower() {
	let depositPower = document.getElementById('power');
	depositPower.innerHTML = convertPower(depositPrice.value / conversion.rate);
}
