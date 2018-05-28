var staticUrl =  'http://localhost:8000/dist/';

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
window.PagarMeCheckout = window.PagarMeCheckout || {};

if (window.easyXDM) {
	PagarMeCheckout.easyXDM = easyXDM.noConflict('PagarMeCheckout');
}

var getCardBrand = function(cardNumber) {
	if(!cardNumber) {
		return null;
	}

	cardNumber = cardNumber.replace(/[^0-9]/g, '');

	var cardStartRules = {
		'elo': [ '401178', '401179', '431274', '438935', '451416', '457393', '457631', '457632', '504175', '627780', '636297', '636368', '5067',
			'509048', '509067', '509049', '509069', '509050', '509074', '509068', '509040', '509045', '509051', '509046', '509066', '509047',
			'509042', '509052', '509043', '509064' ],
		'discover': ['6011', '622', '64', '65'],
		'diners': ['301', '305', '36', '38'],
		'amex': ['34', '37'],
		'aura': ['50'],
		'jcb': ['35'],
		'hipercard': ['38', '60'],
		'visa': ['4'],
		'mastercard': ['5']
	};

	var matchBrand;
	var matchLength = 0;

	for(var brand in cardStartRules) {
		for(var i = 0; i < cardStartRules[brand].length; i++) {
			var start = cardStartRules[brand][i];
			var comp1, comp2;

			if (start.length > cardNumber.length) {
				comp1 = cardNumber;
				comp2 = start.substring(0, cardNumber.length);
			} else {
				comp1 = cardNumber.substring(0, start.length);
				comp2 = start;
			}

			if(comp1 == comp2 && start.length > matchLength) {
				matchBrand = brand;
				matchLength = start.length;
			}
		}
	}

	if (matchBrand) {
		if (matchLength <= cardNumber.length) {
			return matchBrand;
		} else {
			return 'unknown';
		}
	} else {
		return 'unknown';
	}
};

var makeCamelCase = function(val) {
	var index;

	while ((index = val.indexOf('_')) > -1) {
		val = val.substring(0, index) + val.charAt(index+1).toUpperCase() + val.substring(index+2);
	}

	return val;
};


var optionsArrayFromString = function(str) {
	var array = str.split(',');

	for (var i = 0; i < array.length; i++) {
		array[i] = $.trim(array[i].toLowerCase());
	}

	return array;
};

var setValueForPath = function(obj, path, val) {
	path = path.split('.');

	for (var i = 0; i < path.length-1; i++) {
		if (!obj[path[i]]) {
			obj[path[i]] = {};
		}

		obj = obj[path[i]];
	}

	return obj[path[i]] = val;
};


var receivedMessages = [];
var createBridge = function(params) {
	var transportStack = createTransport({
		config: params.config,
		animateIn: params.animateIn
	});

	transportStack.setSource(window.opener);

	return {
		closeModal: function() {
			transportStack.callMethod('closeModal');
			window.open('', '_self', ''); //bug fix
			window.close();
		},
		submitForm: function(scriptId, params) {
			transportStack.callMethod('submitForm', scriptId, params);
		}
	};
};

var PagarMe = PagarMe || {};

(function(PagarMe, global) {

var JSEncryptExports = {};
(function(exports) {
// Copyright (c) 2005  Tom Wu
// All Rights Reserved.
// See "LICENSE" for details.

// Basic JavaScript BN library - subset useful for RSA encryption.

// Bits per digit
var dbits;

// JavaScript engine analysis
var canary = 0xdeadbeefcafe;
var j_lm = ((canary&0xffffff)==0xefcafe);

// (public) Constructor
function BigInteger(a,b,c) {
  if(a != null)
    if("number" == typeof a) this.fromNumber(a,b,c);
    else if(b == null && "string" != typeof a) this.fromString(a,256);
    else this.fromString(a,b);
}

// return new, unset BigInteger
function nbi() { return new BigInteger(null); }

// am: Compute w_j += (x*this_i), propagate carries,
// c is initial carry, returns final carry.
// c < 3*dvalue, x < 2*dvalue, this_i < dvalue
// We need to select the fastest one that works in this environment.

// am1: use a single mult and divide to get the high bits,
// max digit bits should be 26 because
// max internal value = 2*dvalue^2-2*dvalue (< 2^53)
function am1(i,x,w,j,c,n) {
  while(--n >= 0) {
    var v = x*this[i++]+w[j]+c;
    c = Math.floor(v/0x4000000);
    w[j++] = v&0x3ffffff;
  }
  return c;
}
// am2 avoids a big mult-and-extract completely.
// Max digit bits should be <= 30 because we do bitwise ops
// on values up to 2*hdvalue^2-hdvalue-1 (< 2^31)
function am2(i,x,w,j,c,n) {
  var xl = x&0x7fff, xh = x>>15;
  while(--n >= 0) {
    var l = this[i]&0x7fff;
    var h = this[i++]>>15;
    var m = xh*l+h*xl;
    l = xl*l+((m&0x7fff)<<15)+w[j]+(c&0x3fffffff);
    c = (l>>>30)+(m>>>15)+xh*h+(c>>>30);
    w[j++] = l&0x3fffffff;
  }
  return c;
}
// Alternately, set max digit bits to 28 since some
// browsers slow down when dealing with 32-bit numbers.
function am3(i,x,w,j,c,n) {
  var xl = x&0x3fff, xh = x>>14;
  while(--n >= 0) {
    var l = this[i]&0x3fff;
    var h = this[i++]>>14;
    var m = xh*l+h*xl;
    l = xl*l+((m&0x3fff)<<14)+w[j]+c;
    c = (l>>28)+(m>>14)+xh*h;
    w[j++] = l&0xfffffff;
  }
  return c;
}
if(j_lm && (navigator.appName == "Microsoft Internet Explorer")) {
  BigInteger.prototype.am = am2;
  dbits = 30;
}
else if(j_lm && (navigator.appName != "Netscape")) {
  BigInteger.prototype.am = am1;
  dbits = 26;
}
else { // Mozilla/Netscape seems to prefer am3
  BigInteger.prototype.am = am3;
  dbits = 28;
}

BigInteger.prototype.DB = dbits;
BigInteger.prototype.DM = ((1<<dbits)-1);
BigInteger.prototype.DV = (1<<dbits);

var BI_FP = 52;
BigInteger.prototype.FV = Math.pow(2,BI_FP);
BigInteger.prototype.F1 = BI_FP-dbits;
BigInteger.prototype.F2 = 2*dbits-BI_FP;

// Digit conversions
var BI_RM = "0123456789abcdefghijklmnopqrstuvwxyz";
var BI_RC = new Array();
var rr,vv;
rr = "0".charCodeAt(0);
for(vv = 0; vv <= 9; ++vv) BI_RC[rr++] = vv;
rr = "a".charCodeAt(0);
for(vv = 10; vv < 36; ++vv) BI_RC[rr++] = vv;
rr = "A".charCodeAt(0);
for(vv = 10; vv < 36; ++vv) BI_RC[rr++] = vv;

function int2char(n) { return BI_RM.charAt(n); }
function intAt(s,i) {
  var c = BI_RC[s.charCodeAt(i)];
  return (c==null)?-1:c;
}

// (protected) copy this to r
function bnpCopyTo(r) {
  for(var i = this.t-1; i >= 0; --i) r[i] = this[i];
  r.t = this.t;
  r.s = this.s;
}

// (protected) set from integer value x, -DV <= x < DV
function bnpFromInt(x) {
  this.t = 1;
  this.s = (x<0)?-1:0;
  if(x > 0) this[0] = x;
  else if(x < -1) this[0] = x+DV;
  else this.t = 0;
}

// return bigint initialized to value
function nbv(i) { var r = nbi(); r.fromInt(i); return r; }

// (protected) set from string and radix
function bnpFromString(s,b) {
  var k;
  if(b == 16) k = 4;
  else if(b == 8) k = 3;
  else if(b == 256) k = 8; // byte array
  else if(b == 2) k = 1;
  else if(b == 32) k = 5;
  else if(b == 4) k = 2;
  else { this.fromRadix(s,b); return; }
  this.t = 0;
  this.s = 0;
  var i = s.length, mi = false, sh = 0;
  while(--i >= 0) {
    var x = (k==8)?s[i]&0xff:intAt(s,i);
    if(x < 0) {
      if(s.charAt(i) == "-") mi = true;
      continue;
    }
    mi = false;
    if(sh == 0)
      this[this.t++] = x;
    else if(sh+k > this.DB) {
      this[this.t-1] |= (x&((1<<(this.DB-sh))-1))<<sh;
      this[this.t++] = (x>>(this.DB-sh));
    }
    else
      this[this.t-1] |= x<<sh;
    sh += k;
    if(sh >= this.DB) sh -= this.DB;
  }
  if(k == 8 && (s[0]&0x80) != 0) {
    this.s = -1;
    if(sh > 0) this[this.t-1] |= ((1<<(this.DB-sh))-1)<<sh;
  }
  this.clamp();
  if(mi) BigInteger.ZERO.subTo(this,this);
}

// (protected) clamp off excess high words
function bnpClamp() {
  var c = this.s&this.DM;
  while(this.t > 0 && this[this.t-1] == c) --this.t;
}

// (public) return string representation in given radix
function bnToString(b) {
  if(this.s < 0) return "-"+this.negate().toString(b);
  var k;
  if(b == 16) k = 4;
  else if(b == 8) k = 3;
  else if(b == 2) k = 1;
  else if(b == 32) k = 5;
  else if(b == 4) k = 2;
  else return this.toRadix(b);
  var km = (1<<k)-1, d, m = false, r = "", i = this.t;
  var p = this.DB-(i*this.DB)%k;
  if(i-- > 0) {
    if(p < this.DB && (d = this[i]>>p) > 0) { m = true; r = int2char(d); }
    while(i >= 0) {
      if(p < k) {
        d = (this[i]&((1<<p)-1))<<(k-p);
        d |= this[--i]>>(p+=this.DB-k);
      }
      else {
        d = (this[i]>>(p-=k))&km;
        if(p <= 0) { p += this.DB; --i; }
      }
      if(d > 0) m = true;
      if(m) r += int2char(d);
    }
  }
  return m?r:"0";
}

// (public) -this
function bnNegate() { var r = nbi(); BigInteger.ZERO.subTo(this,r); return r; }

// (public) |this|
function bnAbs() { return (this.s<0)?this.negate():this; }

// (public) return + if this > a, - if this < a, 0 if equal
function bnCompareTo(a) {
  var r = this.s-a.s;
  if(r != 0) return r;
  var i = this.t;
  r = i-a.t;
  if(r != 0) return (this.s<0)?-r:r;
  while(--i >= 0) if((r=this[i]-a[i]) != 0) return r;
  return 0;
}

// returns bit length of the integer x
function nbits(x) {
  var r = 1, t;
  if((t=x>>>16) != 0) { x = t; r += 16; }
  if((t=x>>8) != 0) { x = t; r += 8; }
  if((t=x>>4) != 0) { x = t; r += 4; }
  if((t=x>>2) != 0) { x = t; r += 2; }
  if((t=x>>1) != 0) { x = t; r += 1; }
  return r;
}

// (public) return the number of bits in "this"
function bnBitLength() {
  if(this.t <= 0) return 0;
  return this.DB*(this.t-1)+nbits(this[this.t-1]^(this.s&this.DM));
}

// (protected) r = this << n*DB
function bnpDLShiftTo(n,r) {
  var i;
  for(i = this.t-1; i >= 0; --i) r[i+n] = this[i];
  for(i = n-1; i >= 0; --i) r[i] = 0;
  r.t = this.t+n;
  r.s = this.s;
}

// (protected) r = this >> n*DB
function bnpDRShiftTo(n,r) {
  for(var i = n; i < this.t; ++i) r[i-n] = this[i];
  r.t = Math.max(this.t-n,0);
  r.s = this.s;
}

// (protected) r = this << n
function bnpLShiftTo(n,r) {
  var bs = n%this.DB;
  var cbs = this.DB-bs;
  var bm = (1<<cbs)-1;
  var ds = Math.floor(n/this.DB), c = (this.s<<bs)&this.DM, i;
  for(i = this.t-1; i >= 0; --i) {
    r[i+ds+1] = (this[i]>>cbs)|c;
    c = (this[i]&bm)<<bs;
  }
  for(i = ds-1; i >= 0; --i) r[i] = 0;
  r[ds] = c;
  r.t = this.t+ds+1;
  r.s = this.s;
  r.clamp();
}

// (protected) r = this >> n
function bnpRShiftTo(n,r) {
  r.s = this.s;
  var ds = Math.floor(n/this.DB);
  if(ds >= this.t) { r.t = 0; return; }
  var bs = n%this.DB;
  var cbs = this.DB-bs;
  var bm = (1<<bs)-1;
  r[0] = this[ds]>>bs;
  for(var i = ds+1; i < this.t; ++i) {
    r[i-ds-1] |= (this[i]&bm)<<cbs;
    r[i-ds] = this[i]>>bs;
  }
  if(bs > 0) r[this.t-ds-1] |= (this.s&bm)<<cbs;
  r.t = this.t-ds;
  r.clamp();
}

// (protected) r = this - a
function bnpSubTo(a,r) {
  var i = 0, c = 0, m = Math.min(a.t,this.t);
  while(i < m) {
    c += this[i]-a[i];
    r[i++] = c&this.DM;
    c >>= this.DB;
  }
  if(a.t < this.t) {
    c -= a.s;
    while(i < this.t) {
      c += this[i];
      r[i++] = c&this.DM;
      c >>= this.DB;
    }
    c += this.s;
  }
  else {
    c += this.s;
    while(i < a.t) {
      c -= a[i];
      r[i++] = c&this.DM;
      c >>= this.DB;
    }
    c -= a.s;
  }
  r.s = (c<0)?-1:0;
  if(c < -1) r[i++] = this.DV+c;
  else if(c > 0) r[i++] = c;
  r.t = i;
  r.clamp();
}

// (protected) r = this * a, r != this,a (HAC 14.12)
// "this" should be the larger one if appropriate.
function bnpMultiplyTo(a,r) {
  var x = this.abs(), y = a.abs();
  var i = x.t;
  r.t = i+y.t;
  while(--i >= 0) r[i] = 0;
  for(i = 0; i < y.t; ++i) r[i+x.t] = x.am(0,y[i],r,i,0,x.t);
  r.s = 0;
  r.clamp();
  if(this.s != a.s) BigInteger.ZERO.subTo(r,r);
}

// (protected) r = this^2, r != this (HAC 14.16)
function bnpSquareTo(r) {
  var x = this.abs();
  var i = r.t = 2*x.t;
  while(--i >= 0) r[i] = 0;
  for(i = 0; i < x.t-1; ++i) {
    var c = x.am(i,x[i],r,2*i,0,1);
    if((r[i+x.t]+=x.am(i+1,2*x[i],r,2*i+1,c,x.t-i-1)) >= x.DV) {
      r[i+x.t] -= x.DV;
      r[i+x.t+1] = 1;
    }
  }
  if(r.t > 0) r[r.t-1] += x.am(i,x[i],r,2*i,0,1);
  r.s = 0;
  r.clamp();
}

// (protected) divide this by m, quotient and remainder to q, r (HAC 14.20)
// r != q, this != m.  q or r may be null.
function bnpDivRemTo(m,q,r) {
  var pm = m.abs();
  if(pm.t <= 0) return;
  var pt = this.abs();
  if(pt.t < pm.t) {
    if(q != null) q.fromInt(0);
    if(r != null) this.copyTo(r);
    return;
  }
  if(r == null) r = nbi();
  var y = nbi(), ts = this.s, ms = m.s;
  var nsh = this.DB-nbits(pm[pm.t-1]);	// normalize modulus
  if(nsh > 0) { pm.lShiftTo(nsh,y); pt.lShiftTo(nsh,r); }
  else { pm.copyTo(y); pt.copyTo(r); }
  var ys = y.t;
  var y0 = y[ys-1];
  if(y0 == 0) return;
  var yt = y0*(1<<this.F1)+((ys>1)?y[ys-2]>>this.F2:0);
  var d1 = this.FV/yt, d2 = (1<<this.F1)/yt, e = 1<<this.F2;
  var i = r.t, j = i-ys, t = (q==null)?nbi():q;
  y.dlShiftTo(j,t);
  if(r.compareTo(t) >= 0) {
    r[r.t++] = 1;
    r.subTo(t,r);
  }
  BigInteger.ONE.dlShiftTo(ys,t);
  t.subTo(y,y);	// "negative" y so we can replace sub with am later
  while(y.t < ys) y[y.t++] = 0;
  while(--j >= 0) {
    // Estimate quotient digit
    var qd = (r[--i]==y0)?this.DM:Math.floor(r[i]*d1+(r[i-1]+e)*d2);
    if((r[i]+=y.am(0,qd,r,j,0,ys)) < qd) {	// Try it out
      y.dlShiftTo(j,t);
      r.subTo(t,r);
      while(r[i] < --qd) r.subTo(t,r);
    }
  }
  if(q != null) {
    r.drShiftTo(ys,q);
    if(ts != ms) BigInteger.ZERO.subTo(q,q);
  }
  r.t = ys;
  r.clamp();
  if(nsh > 0) r.rShiftTo(nsh,r);	// Denormalize remainder
  if(ts < 0) BigInteger.ZERO.subTo(r,r);
}

// (public) this mod a
function bnMod(a) {
  var r = nbi();
  this.abs().divRemTo(a,null,r);
  if(this.s < 0 && r.compareTo(BigInteger.ZERO) > 0) a.subTo(r,r);
  return r;
}

// Modular reduction using "classic" algorithm
function Classic(m) { this.m = m; }
function cConvert(x) {
  if(x.s < 0 || x.compareTo(this.m) >= 0) return x.mod(this.m);
  else return x;
}
function cRevert(x) { return x; }
function cReduce(x) { x.divRemTo(this.m,null,x); }
function cMulTo(x,y,r) { x.multiplyTo(y,r); this.reduce(r); }
function cSqrTo(x,r) { x.squareTo(r); this.reduce(r); }

Classic.prototype.convert = cConvert;
Classic.prototype.revert = cRevert;
Classic.prototype.reduce = cReduce;
Classic.prototype.mulTo = cMulTo;
Classic.prototype.sqrTo = cSqrTo;

// (protected) return "-1/this % 2^DB"; useful for Mont. reduction
// justification:
//         xy == 1 (mod m)
//         xy =  1+km
//   xy(2-xy) = (1+km)(1-km)
// x[y(2-xy)] = 1-k^2m^2
// x[y(2-xy)] == 1 (mod m^2)
// if y is 1/x mod m, then y(2-xy) is 1/x mod m^2
// should reduce x and y(2-xy) by m^2 at each step to keep size bounded.
// JS multiply "overflows" differently from C/C++, so care is needed here.
function bnpInvDigit() {
  if(this.t < 1) return 0;
  var x = this[0];
  if((x&1) == 0) return 0;
  var y = x&3;		// y == 1/x mod 2^2
  y = (y*(2-(x&0xf)*y))&0xf;	// y == 1/x mod 2^4
  y = (y*(2-(x&0xff)*y))&0xff;	// y == 1/x mod 2^8
  y = (y*(2-(((x&0xffff)*y)&0xffff)))&0xffff;	// y == 1/x mod 2^16
  // last step - calculate inverse mod DV directly;
  // assumes 16 < DB <= 32 and assumes ability to handle 48-bit ints
  y = (y*(2-x*y%this.DV))%this.DV;		// y == 1/x mod 2^dbits
  // we really want the negative inverse, and -DV < y < DV
  return (y>0)?this.DV-y:-y;
}

// Montgomery reduction
function Montgomery(m) {
  this.m = m;
  this.mp = m.invDigit();
  this.mpl = this.mp&0x7fff;
  this.mph = this.mp>>15;
  this.um = (1<<(m.DB-15))-1;
  this.mt2 = 2*m.t;
}

// xR mod m
function montConvert(x) {
  var r = nbi();
  x.abs().dlShiftTo(this.m.t,r);
  r.divRemTo(this.m,null,r);
  if(x.s < 0 && r.compareTo(BigInteger.ZERO) > 0) this.m.subTo(r,r);
  return r;
}

// x/R mod m
function montRevert(x) {
  var r = nbi();
  x.copyTo(r);
  this.reduce(r);
  return r;
}

// x = x/R mod m (HAC 14.32)
function montReduce(x) {
  while(x.t <= this.mt2)	// pad x so am has enough room later
    x[x.t++] = 0;
  for(var i = 0; i < this.m.t; ++i) {
    // faster way of calculating u0 = x[i]*mp mod DV
    var j = x[i]&0x7fff;
    var u0 = (j*this.mpl+(((j*this.mph+(x[i]>>15)*this.mpl)&this.um)<<15))&x.DM;
    // use am to combine the multiply-shift-add into one call
    j = i+this.m.t;
    x[j] += this.m.am(0,u0,x,i,0,this.m.t);
    // propagate carry
    while(x[j] >= x.DV) { x[j] -= x.DV; x[++j]++; }
  }
  x.clamp();
  x.drShiftTo(this.m.t,x);
  if(x.compareTo(this.m) >= 0) x.subTo(this.m,x);
}

// r = "x^2/R mod m"; x != r
function montSqrTo(x,r) { x.squareTo(r); this.reduce(r); }

// r = "xy/R mod m"; x,y != r
function montMulTo(x,y,r) { x.multiplyTo(y,r); this.reduce(r); }

Montgomery.prototype.convert = montConvert;
Montgomery.prototype.revert = montRevert;
Montgomery.prototype.reduce = montReduce;
Montgomery.prototype.mulTo = montMulTo;
Montgomery.prototype.sqrTo = montSqrTo;

// (protected) true iff this is even
function bnpIsEven() { return ((this.t>0)?(this[0]&1):this.s) == 0; }

// (protected) this^e, e < 2^32, doing sqr and mul with "r" (HAC 14.79)
function bnpExp(e,z) {
  if(e > 0xffffffff || e < 1) return BigInteger.ONE;
  var r = nbi(), r2 = nbi(), g = z.convert(this), i = nbits(e)-1;
  g.copyTo(r);
  while(--i >= 0) {
    z.sqrTo(r,r2);
    if((e&(1<<i)) > 0) z.mulTo(r2,g,r);
    else { var t = r; r = r2; r2 = t; }
  }
  return z.revert(r);
}

// (public) this^e % m, 0 <= e < 2^32
function bnModPowInt(e,m) {
  var z;
  if(e < 256 || m.isEven()) z = new Classic(m); else z = new Montgomery(m);
  return this.exp(e,z);
}

// protected
BigInteger.prototype.copyTo = bnpCopyTo;
BigInteger.prototype.fromInt = bnpFromInt;
BigInteger.prototype.fromString = bnpFromString;
BigInteger.prototype.clamp = bnpClamp;
BigInteger.prototype.dlShiftTo = bnpDLShiftTo;
BigInteger.prototype.drShiftTo = bnpDRShiftTo;
BigInteger.prototype.lShiftTo = bnpLShiftTo;
BigInteger.prototype.rShiftTo = bnpRShiftTo;
BigInteger.prototype.subTo = bnpSubTo;
BigInteger.prototype.multiplyTo = bnpMultiplyTo;
BigInteger.prototype.squareTo = bnpSquareTo;
BigInteger.prototype.divRemTo = bnpDivRemTo;
BigInteger.prototype.invDigit = bnpInvDigit;
BigInteger.prototype.isEven = bnpIsEven;
BigInteger.prototype.exp = bnpExp;

// public
BigInteger.prototype.toString = bnToString;
BigInteger.prototype.negate = bnNegate;
BigInteger.prototype.abs = bnAbs;
BigInteger.prototype.compareTo = bnCompareTo;
BigInteger.prototype.bitLength = bnBitLength;
BigInteger.prototype.mod = bnMod;
BigInteger.prototype.modPowInt = bnModPowInt;

// "constants"
BigInteger.ZERO = nbv(0);
BigInteger.ONE = nbv(1);
// Copyright (c) 2005-2009  Tom Wu
// All Rights Reserved.
// See "LICENSE" for details.

// Extended JavaScript BN functions, required for RSA private ops.

// Version 1.1: new BigInteger("0", 10) returns "proper" zero
// Version 1.2: square() API, isProbablePrime fix

// (public)
function bnClone() { var r = nbi(); this.copyTo(r); return r; }

// (public) return value as integer
function bnIntValue() {
  if(this.s < 0) {
    if(this.t == 1) return this[0]-this.DV;
    else if(this.t == 0) return -1;
  }
  else if(this.t == 1) return this[0];
  else if(this.t == 0) return 0;
  // assumes 16 < DB < 32
  return ((this[1]&((1<<(32-this.DB))-1))<<this.DB)|this[0];
}

// (public) return value as byte
function bnByteValue() { return (this.t==0)?this.s:(this[0]<<24)>>24; }

// (public) return value as short (assumes DB>=16)
function bnShortValue() { return (this.t==0)?this.s:(this[0]<<16)>>16; }

// (protected) return x s.t. r^x < DV
function bnpChunkSize(r) { return Math.floor(Math.LN2*this.DB/Math.log(r)); }

// (public) 0 if this == 0, 1 if this > 0
function bnSigNum() {
  if(this.s < 0) return -1;
  else if(this.t <= 0 || (this.t == 1 && this[0] <= 0)) return 0;
  else return 1;
}

// (protected) convert to radix string
function bnpToRadix(b) {
  if(b == null) b = 10;
  if(this.signum() == 0 || b < 2 || b > 36) return "0";
  var cs = this.chunkSize(b);
  var a = Math.pow(b,cs);
  var d = nbv(a), y = nbi(), z = nbi(), r = "";
  this.divRemTo(d,y,z);
  while(y.signum() > 0) {
    r = (a+z.intValue()).toString(b).substr(1) + r;
    y.divRemTo(d,y,z);
  }
  return z.intValue().toString(b) + r;
}

// (protected) convert from radix string
function bnpFromRadix(s,b) {
  this.fromInt(0);
  if(b == null) b = 10;
  var cs = this.chunkSize(b);
  var d = Math.pow(b,cs), mi = false, j = 0, w = 0;
  for(var i = 0; i < s.length; ++i) {
    var x = intAt(s,i);
    if(x < 0) {
      if(s.charAt(i) == "-" && this.signum() == 0) mi = true;
      continue;
    }
    w = b*w+x;
    if(++j >= cs) {
      this.dMultiply(d);
      this.dAddOffset(w,0);
      j = 0;
      w = 0;
    }
  }
  if(j > 0) {
    this.dMultiply(Math.pow(b,j));
    this.dAddOffset(w,0);
  }
  if(mi) BigInteger.ZERO.subTo(this,this);
}

// (protected) alternate constructor
function bnpFromNumber(a,b,c) {
  if("number" == typeof b) {
    // new BigInteger(int,int,RNG)
    if(a < 2) this.fromInt(1);
    else {
      this.fromNumber(a,c);
      if(!this.testBit(a-1))	// force MSB set
        this.bitwiseTo(BigInteger.ONE.shiftLeft(a-1),op_or,this);
      if(this.isEven()) this.dAddOffset(1,0); // force odd
      while(!this.isProbablePrime(b)) {
        this.dAddOffset(2,0);
        if(this.bitLength() > a) this.subTo(BigInteger.ONE.shiftLeft(a-1),this);
      }
    }
  }
  else {
    // new BigInteger(int,RNG)
    var x = new Array(), t = a&7;
    x.length = (a>>3)+1;
    b.nextBytes(x);
    if(t > 0) x[0] &= ((1<<t)-1); else x[0] = 0;
    this.fromString(x,256);
  }
}

// (public) convert to bigendian byte array
function bnToByteArray() {
  var i = this.t, r = new Array();
  r[0] = this.s;
  var p = this.DB-(i*this.DB)%8, d, k = 0;
  if(i-- > 0) {
    if(p < this.DB && (d = this[i]>>p) != (this.s&this.DM)>>p)
      r[k++] = d|(this.s<<(this.DB-p));
    while(i >= 0) {
      if(p < 8) {
        d = (this[i]&((1<<p)-1))<<(8-p);
        d |= this[--i]>>(p+=this.DB-8);
      }
      else {
        d = (this[i]>>(p-=8))&0xff;
        if(p <= 0) { p += this.DB; --i; }
      }
      if((d&0x80) != 0) d |= -256;
      if(k == 0 && (this.s&0x80) != (d&0x80)) ++k;
      if(k > 0 || d != this.s) r[k++] = d;
    }
  }
  return r;
}

function bnEquals(a) { return(this.compareTo(a)==0); }
function bnMin(a) { return(this.compareTo(a)<0)?this:a; }
function bnMax(a) { return(this.compareTo(a)>0)?this:a; }

// (protected) r = this op a (bitwise)
function bnpBitwiseTo(a,op,r) {
  var i, f, m = Math.min(a.t,this.t);
  for(i = 0; i < m; ++i) r[i] = op(this[i],a[i]);
  if(a.t < this.t) {
    f = a.s&this.DM;
    for(i = m; i < this.t; ++i) r[i] = op(this[i],f);
    r.t = this.t;
  }
  else {
    f = this.s&this.DM;
    for(i = m; i < a.t; ++i) r[i] = op(f,a[i]);
    r.t = a.t;
  }
  r.s = op(this.s,a.s);
  r.clamp();
}

// (public) this & a
function op_and(x,y) { return x&y; }
function bnAnd(a) { var r = nbi(); this.bitwiseTo(a,op_and,r); return r; }

// (public) this | a
function op_or(x,y) { return x|y; }
function bnOr(a) { var r = nbi(); this.bitwiseTo(a,op_or,r); return r; }

// (public) this ^ a
function op_xor(x,y) { return x^y; }
function bnXor(a) { var r = nbi(); this.bitwiseTo(a,op_xor,r); return r; }

// (public) this & ~a
function op_andnot(x,y) { return x&~y; }
function bnAndNot(a) { var r = nbi(); this.bitwiseTo(a,op_andnot,r); return r; }

// (public) ~this
function bnNot() {
  var r = nbi();
  for(var i = 0; i < this.t; ++i) r[i] = this.DM&~this[i];
  r.t = this.t;
  r.s = ~this.s;
  return r;
}

// (public) this << n
function bnShiftLeft(n) {
  var r = nbi();
  if(n < 0) this.rShiftTo(-n,r); else this.lShiftTo(n,r);
  return r;
}

// (public) this >> n
function bnShiftRight(n) {
  var r = nbi();
  if(n < 0) this.lShiftTo(-n,r); else this.rShiftTo(n,r);
  return r;
}

// return index of lowest 1-bit in x, x < 2^31
function lbit(x) {
  if(x == 0) return -1;
  var r = 0;
  if((x&0xffff) == 0) { x >>= 16; r += 16; }
  if((x&0xff) == 0) { x >>= 8; r += 8; }
  if((x&0xf) == 0) { x >>= 4; r += 4; }
  if((x&3) == 0) { x >>= 2; r += 2; }
  if((x&1) == 0) ++r;
  return r;
}

// (public) returns index of lowest 1-bit (or -1 if none)
function bnGetLowestSetBit() {
  for(var i = 0; i < this.t; ++i)
    if(this[i] != 0) return i*this.DB+lbit(this[i]);
  if(this.s < 0) return this.t*this.DB;
  return -1;
}

// return number of 1 bits in x
function cbit(x) {
  var r = 0;
  while(x != 0) { x &= x-1; ++r; }
  return r;
}

// (public) return number of set bits
function bnBitCount() {
  var r = 0, x = this.s&this.DM;
  for(var i = 0; i < this.t; ++i) r += cbit(this[i]^x);
  return r;
}

// (public) true iff nth bit is set
function bnTestBit(n) {
  var j = Math.floor(n/this.DB);
  if(j >= this.t) return(this.s!=0);
  return((this[j]&(1<<(n%this.DB)))!=0);
}

// (protected) this op (1<<n)
function bnpChangeBit(n,op) {
  var r = BigInteger.ONE.shiftLeft(n);
  this.bitwiseTo(r,op,r);
  return r;
}

// (public) this | (1<<n)
function bnSetBit(n) { return this.changeBit(n,op_or); }

// (public) this & ~(1<<n)
function bnClearBit(n) { return this.changeBit(n,op_andnot); }

// (public) this ^ (1<<n)
function bnFlipBit(n) { return this.changeBit(n,op_xor); }

// (protected) r = this + a
function bnpAddTo(a,r) {
  var i = 0, c = 0, m = Math.min(a.t,this.t);
  while(i < m) {
    c += this[i]+a[i];
    r[i++] = c&this.DM;
    c >>= this.DB;
  }
  if(a.t < this.t) {
    c += a.s;
    while(i < this.t) {
      c += this[i];
      r[i++] = c&this.DM;
      c >>= this.DB;
    }
    c += this.s;
  }
  else {
    c += this.s;
    while(i < a.t) {
      c += a[i];
      r[i++] = c&this.DM;
      c >>= this.DB;
    }
    c += a.s;
  }
  r.s = (c<0)?-1:0;
  if(c > 0) r[i++] = c;
  else if(c < -1) r[i++] = this.DV+c;
  r.t = i;
  r.clamp();
}

// (public) this + a
function bnAdd(a) { var r = nbi(); this.addTo(a,r); return r; }

// (public) this - a
function bnSubtract(a) { var r = nbi(); this.subTo(a,r); return r; }

// (public) this * a
function bnMultiply(a) { var r = nbi(); this.multiplyTo(a,r); return r; }

// (public) this^2
function bnSquare() { var r = nbi(); this.squareTo(r); return r; }

// (public) this / a
function bnDivide(a) { var r = nbi(); this.divRemTo(a,r,null); return r; }

// (public) this % a
function bnRemainder(a) { var r = nbi(); this.divRemTo(a,null,r); return r; }

// (public) [this/a,this%a]
function bnDivideAndRemainder(a) {
  var q = nbi(), r = nbi();
  this.divRemTo(a,q,r);
  return new Array(q,r);
}

// (protected) this *= n, this >= 0, 1 < n < DV
function bnpDMultiply(n) {
  this[this.t] = this.am(0,n-1,this,0,0,this.t);
  ++this.t;
  this.clamp();
}

// (protected) this += n << w words, this >= 0
function bnpDAddOffset(n,w) {
  if(n == 0) return;
  while(this.t <= w) this[this.t++] = 0;
  this[w] += n;
  while(this[w] >= this.DV) {
    this[w] -= this.DV;
    if(++w >= this.t) this[this.t++] = 0;
    ++this[w];
  }
}

// A "null" reducer
function NullExp() {}
function nNop(x) { return x; }
function nMulTo(x,y,r) { x.multiplyTo(y,r); }
function nSqrTo(x,r) { x.squareTo(r); }

NullExp.prototype.convert = nNop;
NullExp.prototype.revert = nNop;
NullExp.prototype.mulTo = nMulTo;
NullExp.prototype.sqrTo = nSqrTo;

// (public) this^e
function bnPow(e) { return this.exp(e,new NullExp()); }

// (protected) r = lower n words of "this * a", a.t <= n
// "this" should be the larger one if appropriate.
function bnpMultiplyLowerTo(a,n,r) {
  var i = Math.min(this.t+a.t,n);
  r.s = 0; // assumes a,this >= 0
  r.t = i;
  while(i > 0) r[--i] = 0;
  var j;
  for(j = r.t-this.t; i < j; ++i) r[i+this.t] = this.am(0,a[i],r,i,0,this.t);
  for(j = Math.min(a.t,n); i < j; ++i) this.am(0,a[i],r,i,0,n-i);
  r.clamp();
}

// (protected) r = "this * a" without lower n words, n > 0
// "this" should be the larger one if appropriate.
function bnpMultiplyUpperTo(a,n,r) {
  --n;
  var i = r.t = this.t+a.t-n;
  r.s = 0; // assumes a,this >= 0
  while(--i >= 0) r[i] = 0;
  for(i = Math.max(n-this.t,0); i < a.t; ++i)
    r[this.t+i-n] = this.am(n-i,a[i],r,0,0,this.t+i-n);
  r.clamp();
  r.drShiftTo(1,r);
}

// Barrett modular reduction
function Barrett(m) {
  // setup Barrett
  this.r2 = nbi();
  this.q3 = nbi();
  BigInteger.ONE.dlShiftTo(2*m.t,this.r2);
  this.mu = this.r2.divide(m);
  this.m = m;
}

function barrettConvert(x) {
  if(x.s < 0 || x.t > 2*this.m.t) return x.mod(this.m);
  else if(x.compareTo(this.m) < 0) return x;
  else { var r = nbi(); x.copyTo(r); this.reduce(r); return r; }
}

function barrettRevert(x) { return x; }

// x = x mod m (HAC 14.42)
function barrettReduce(x) {
  x.drShiftTo(this.m.t-1,this.r2);
  if(x.t > this.m.t+1) { x.t = this.m.t+1; x.clamp(); }
  this.mu.multiplyUpperTo(this.r2,this.m.t+1,this.q3);
  this.m.multiplyLowerTo(this.q3,this.m.t+1,this.r2);
  while(x.compareTo(this.r2) < 0) x.dAddOffset(1,this.m.t+1);
  x.subTo(this.r2,x);
  while(x.compareTo(this.m) >= 0) x.subTo(this.m,x);
}

// r = x^2 mod m; x != r
function barrettSqrTo(x,r) { x.squareTo(r); this.reduce(r); }

// r = x*y mod m; x,y != r
function barrettMulTo(x,y,r) { x.multiplyTo(y,r); this.reduce(r); }

Barrett.prototype.convert = barrettConvert;
Barrett.prototype.revert = barrettRevert;
Barrett.prototype.reduce = barrettReduce;
Barrett.prototype.mulTo = barrettMulTo;
Barrett.prototype.sqrTo = barrettSqrTo;

// (public) this^e % m (HAC 14.85)
function bnModPow(e,m) {
  var i = e.bitLength(), k, r = nbv(1), z;
  if(i <= 0) return r;
  else if(i < 18) k = 1;
  else if(i < 48) k = 3;
  else if(i < 144) k = 4;
  else if(i < 768) k = 5;
  else k = 6;
  if(i < 8)
    z = new Classic(m);
  else if(m.isEven())
    z = new Barrett(m);
  else
    z = new Montgomery(m);

  // precomputation
  var g = new Array(), n = 3, k1 = k-1, km = (1<<k)-1;
  g[1] = z.convert(this);
  if(k > 1) {
    var g2 = nbi();
    z.sqrTo(g[1],g2);
    while(n <= km) {
      g[n] = nbi();
      z.mulTo(g2,g[n-2],g[n]);
      n += 2;
    }
  }

  var j = e.t-1, w, is1 = true, r2 = nbi(), t;
  i = nbits(e[j])-1;
  while(j >= 0) {
    if(i >= k1) w = (e[j]>>(i-k1))&km;
    else {
      w = (e[j]&((1<<(i+1))-1))<<(k1-i);
      if(j > 0) w |= e[j-1]>>(this.DB+i-k1);
    }

    n = k;
    while((w&1) == 0) { w >>= 1; --n; }
    if((i -= n) < 0) { i += this.DB; --j; }
    if(is1) {	// ret == 1, don't bother squaring or multiplying it
      g[w].copyTo(r);
      is1 = false;
    }
    else {
      while(n > 1) { z.sqrTo(r,r2); z.sqrTo(r2,r); n -= 2; }
      if(n > 0) z.sqrTo(r,r2); else { t = r; r = r2; r2 = t; }
      z.mulTo(r2,g[w],r);
    }

    while(j >= 0 && (e[j]&(1<<i)) == 0) {
      z.sqrTo(r,r2); t = r; r = r2; r2 = t;
      if(--i < 0) { i = this.DB-1; --j; }
    }
  }
  return z.revert(r);
}

// (public) gcd(this,a) (HAC 14.54)
function bnGCD(a) {
  var x = (this.s<0)?this.negate():this.clone();
  var y = (a.s<0)?a.negate():a.clone();
  if(x.compareTo(y) < 0) { var t = x; x = y; y = t; }
  var i = x.getLowestSetBit(), g = y.getLowestSetBit();
  if(g < 0) return x;
  if(i < g) g = i;
  if(g > 0) {
    x.rShiftTo(g,x);
    y.rShiftTo(g,y);
  }
  while(x.signum() > 0) {
    if((i = x.getLowestSetBit()) > 0) x.rShiftTo(i,x);
    if((i = y.getLowestSetBit()) > 0) y.rShiftTo(i,y);
    if(x.compareTo(y) >= 0) {
      x.subTo(y,x);
      x.rShiftTo(1,x);
    }
    else {
      y.subTo(x,y);
      y.rShiftTo(1,y);
    }
  }
  if(g > 0) y.lShiftTo(g,y);
  return y;
}

// (protected) this % n, n < 2^26
function bnpModInt(n) {
  if(n <= 0) return 0;
  var d = this.DV%n, r = (this.s<0)?n-1:0;
  if(this.t > 0)
    if(d == 0) r = this[0]%n;
    else for(var i = this.t-1; i >= 0; --i) r = (d*r+this[i])%n;
  return r;
}

// (public) 1/this % m (HAC 14.61)
function bnModInverse(m) {
  var ac = m.isEven();
  if((this.isEven() && ac) || m.signum() == 0) return BigInteger.ZERO;
  var u = m.clone(), v = this.clone();
  var a = nbv(1), b = nbv(0), c = nbv(0), d = nbv(1);
  while(u.signum() != 0) {
    while(u.isEven()) {
      u.rShiftTo(1,u);
      if(ac) {
        if(!a.isEven() || !b.isEven()) { a.addTo(this,a); b.subTo(m,b); }
        a.rShiftTo(1,a);
      }
      else if(!b.isEven()) b.subTo(m,b);
      b.rShiftTo(1,b);
    }
    while(v.isEven()) {
      v.rShiftTo(1,v);
      if(ac) {
        if(!c.isEven() || !d.isEven()) { c.addTo(this,c); d.subTo(m,d); }
        c.rShiftTo(1,c);
      }
      else if(!d.isEven()) d.subTo(m,d);
      d.rShiftTo(1,d);
    }
    if(u.compareTo(v) >= 0) {
      u.subTo(v,u);
      if(ac) a.subTo(c,a);
      b.subTo(d,b);
    }
    else {
      v.subTo(u,v);
      if(ac) c.subTo(a,c);
      d.subTo(b,d);
    }
  }
  if(v.compareTo(BigInteger.ONE) != 0) return BigInteger.ZERO;
  if(d.compareTo(m) >= 0) return d.subtract(m);
  if(d.signum() < 0) d.addTo(m,d); else return d;
  if(d.signum() < 0) return d.add(m); else return d;
}

var lowprimes = [2,3,5,7,11,13,17,19,23,29,31,37,41,43,47,53,59,61,67,71,73,79,83,89,97,101,103,107,109,113,127,131,137,139,149,151,157,163,167,173,179,181,191,193,197,199,211,223,227,229,233,239,241,251,257,263,269,271,277,281,283,293,307,311,313,317,331,337,347,349,353,359,367,373,379,383,389,397,401,409,419,421,431,433,439,443,449,457,461,463,467,479,487,491,499,503,509,521,523,541,547,557,563,569,571,577,587,593,599,601,607,613,617,619,631,641,643,647,653,659,661,673,677,683,691,701,709,719,727,733,739,743,751,757,761,769,773,787,797,809,811,821,823,827,829,839,853,857,859,863,877,881,883,887,907,911,919,929,937,941,947,953,967,971,977,983,991,997];
var lplim = (1<<26)/lowprimes[lowprimes.length-1];

// (public) test primality with certainty >= 1-.5^t
function bnIsProbablePrime(t) {
  var i, x = this.abs();
  if(x.t == 1 && x[0] <= lowprimes[lowprimes.length-1]) {
    for(i = 0; i < lowprimes.length; ++i)
      if(x[0] == lowprimes[i]) return true;
    return false;
  }
  if(x.isEven()) return false;
  i = 1;
  while(i < lowprimes.length) {
    var m = lowprimes[i], j = i+1;
    while(j < lowprimes.length && m < lplim) m *= lowprimes[j++];
    m = x.modInt(m);
    while(i < j) if(m%lowprimes[i++] == 0) return false;
  }
  return x.millerRabin(t);
}

// (protected) true if probably prime (HAC 4.24, Miller-Rabin)
function bnpMillerRabin(t) {
  var n1 = this.subtract(BigInteger.ONE);
  var k = n1.getLowestSetBit();
  if(k <= 0) return false;
  var r = n1.shiftRight(k);
  t = (t+1)>>1;
  if(t > lowprimes.length) t = lowprimes.length;
  var a = nbi();
  for(var i = 0; i < t; ++i) {
    //Pick bases at random, instead of starting at 2
    a.fromInt(lowprimes[Math.floor(Math.random()*lowprimes.length)]);
    var y = a.modPow(r,this);
    if(y.compareTo(BigInteger.ONE) != 0 && y.compareTo(n1) != 0) {
      var j = 1;
      while(j++ < k && y.compareTo(n1) != 0) {
        y = y.modPowInt(2,this);
        if(y.compareTo(BigInteger.ONE) == 0) return false;
      }
      if(y.compareTo(n1) != 0) return false;
    }
  }
  return true;
}

// protected
BigInteger.prototype.chunkSize = bnpChunkSize;
BigInteger.prototype.toRadix = bnpToRadix;
BigInteger.prototype.fromRadix = bnpFromRadix;
BigInteger.prototype.fromNumber = bnpFromNumber;
BigInteger.prototype.bitwiseTo = bnpBitwiseTo;
BigInteger.prototype.changeBit = bnpChangeBit;
BigInteger.prototype.addTo = bnpAddTo;
BigInteger.prototype.dMultiply = bnpDMultiply;
BigInteger.prototype.dAddOffset = bnpDAddOffset;
BigInteger.prototype.multiplyLowerTo = bnpMultiplyLowerTo;
BigInteger.prototype.multiplyUpperTo = bnpMultiplyUpperTo;
BigInteger.prototype.modInt = bnpModInt;
BigInteger.prototype.millerRabin = bnpMillerRabin;

// public
BigInteger.prototype.clone = bnClone;
BigInteger.prototype.intValue = bnIntValue;
BigInteger.prototype.byteValue = bnByteValue;
BigInteger.prototype.shortValue = bnShortValue;
BigInteger.prototype.signum = bnSigNum;
BigInteger.prototype.toByteArray = bnToByteArray;
BigInteger.prototype.equals = bnEquals;
BigInteger.prototype.min = bnMin;
BigInteger.prototype.max = bnMax;
BigInteger.prototype.and = bnAnd;
BigInteger.prototype.or = bnOr;
BigInteger.prototype.xor = bnXor;
BigInteger.prototype.andNot = bnAndNot;
BigInteger.prototype.not = bnNot;
BigInteger.prototype.shiftLeft = bnShiftLeft;
BigInteger.prototype.shiftRight = bnShiftRight;
BigInteger.prototype.getLowestSetBit = bnGetLowestSetBit;
BigInteger.prototype.bitCount = bnBitCount;
BigInteger.prototype.testBit = bnTestBit;
BigInteger.prototype.setBit = bnSetBit;
BigInteger.prototype.clearBit = bnClearBit;
BigInteger.prototype.flipBit = bnFlipBit;
BigInteger.prototype.add = bnAdd;
BigInteger.prototype.subtract = bnSubtract;
BigInteger.prototype.multiply = bnMultiply;
BigInteger.prototype.divide = bnDivide;
BigInteger.prototype.remainder = bnRemainder;
BigInteger.prototype.divideAndRemainder = bnDivideAndRemainder;
BigInteger.prototype.modPow = bnModPow;
BigInteger.prototype.modInverse = bnModInverse;
BigInteger.prototype.pow = bnPow;
BigInteger.prototype.gcd = bnGCD;
BigInteger.prototype.isProbablePrime = bnIsProbablePrime;

// JSBN-specific extension
BigInteger.prototype.square = bnSquare;

// BigInteger interfaces not implemented in jsbn:

// BigInteger(int signum, byte[] magnitude)
// double doubleValue()
// float floatValue()
// int hashCode()
// long longValue()
// static BigInteger valueOf(long val)
// prng4.js - uses Arcfour as a PRNG

function Arcfour() {
  this.i = 0;
  this.j = 0;
  this.S = new Array();
}

// Initialize arcfour context from key, an array of ints, each from [0..255]
function ARC4init(key) {
  var i, j, t;
  for(i = 0; i < 256; ++i)
    this.S[i] = i;
  j = 0;
  for(i = 0; i < 256; ++i) {
    j = (j + this.S[i] + key[i % key.length]) & 255;
    t = this.S[i];
    this.S[i] = this.S[j];
    this.S[j] = t;
  }
  this.i = 0;
  this.j = 0;
}

function ARC4next() {
  var t;
  this.i = (this.i + 1) & 255;
  this.j = (this.j + this.S[this.i]) & 255;
  t = this.S[this.i];
  this.S[this.i] = this.S[this.j];
  this.S[this.j] = t;
  return this.S[(t + this.S[this.i]) & 255];
}

Arcfour.prototype.init = ARC4init;
Arcfour.prototype.next = ARC4next;

// Plug in your RNG constructor here
function prng_newstate() {
  return new Arcfour();
}

// Pool size must be a multiple of 4 and greater than 32.
// An array of bytes the size of the pool will be passed to init()
var rng_psize = 256;
// Random number generator - requires a PRNG backend, e.g. prng4.js
var rng_state;
var rng_pool;
var rng_pptr;

// Initialize the pool with junk if needed.
if(rng_pool == null) {
  rng_pool = new Array();
  rng_pptr = 0;
  var t;
  if(window.crypto && window.crypto.getRandomValues) {
    // Extract entropy (2048 bits) from RNG if available
    var z = new Uint32Array(256);
    window.crypto.getRandomValues(z);
    for (t = 0; t < z.length; ++t)
      rng_pool[rng_pptr++] = z[t] & 255;
  } 
  
  // Use mouse events for entropy, if we do not have enough entropy by the time
  // we need it, entropy will be generated by Math.random.
  var onMouseMoveListener = function(ev) {
    this.count = this.count || 0;
    if (this.count >= 256 || rng_pptr >= rng_psize) {
      if (window.removeEventListener)
        window.removeEventListener("mousemove", onMouseMoveListener);
      else if (window.detachEvent)
        window.detachEvent("onmousemove", onMouseMoveListener);
      return;
    }
    this.count += 1;
    var mouseCoordinates = ev.x + ev.y;
    rng_pool[rng_pptr++] = mouseCoordinates & 255;
  };
  if (window.addEventListener)
    window.addEventListener("mousemove", onMouseMoveListener);
  else if (window.attachEvent)
    window.attachEvent("onmousemove", onMouseMoveListener);
  
}

function rng_get_byte() {
  if(rng_state == null) {
    rng_state = prng_newstate();
    // At this point, we may not have collected enough entropy.  If not, fall back to Math.random
    while (rng_pptr < rng_psize) {
      var random = Math.floor(65536 * Math.random());
      rng_pool[rng_pptr++] = random & 255;
    }
    rng_state.init(rng_pool);
    for(rng_pptr = 0; rng_pptr < rng_pool.length; ++rng_pptr)
      rng_pool[rng_pptr] = 0;
    rng_pptr = 0;
  }
  // TODO: allow reseeding after first request
  return rng_state.next();
}

function rng_get_bytes(ba) {
  var i;
  for(i = 0; i < ba.length; ++i) ba[i] = rng_get_byte();
}

function SecureRandom() {}

SecureRandom.prototype.nextBytes = rng_get_bytes;
// Depends on jsbn.js and rng.js

// Version 1.1: support utf-8 encoding in pkcs1pad2

// convert a (hex) string to a bignum object
function parseBigInt(str,r) {
  return new BigInteger(str,r);
}

function linebrk(s,n) {
  var ret = "";
  var i = 0;
  while(i + n < s.length) {
    ret += s.substring(i,i+n) + "\n";
    i += n;
  }
  return ret + s.substring(i,s.length);
}

function byte2Hex(b) {
  if(b < 0x10)
    return "0" + b.toString(16);
  else
    return b.toString(16);
}

// PKCS#1 (type 2, random) pad input string s to n bytes, and return a bigint
function pkcs1pad2(s,n) {
  if(n < s.length + 11) { // TODO: fix for utf-8
    console.error("Message too long for RSA");
    return null;
  }
  var ba = new Array();
  var i = s.length - 1;
  while(i >= 0 && n > 0) {
    var c = s.charCodeAt(i--);
    if(c < 128) { // encode using utf-8
      ba[--n] = c;
    }
    else if((c > 127) && (c < 2048)) {
      ba[--n] = (c & 63) | 128;
      ba[--n] = (c >> 6) | 192;
    }
    else {
      ba[--n] = (c & 63) | 128;
      ba[--n] = ((c >> 6) & 63) | 128;
      ba[--n] = (c >> 12) | 224;
    }
  }
  ba[--n] = 0;
  var rng = new SecureRandom();
  var x = new Array();
  while(n > 2) { // random non-zero pad
    x[0] = 0;
    while(x[0] == 0) rng.nextBytes(x);
    ba[--n] = x[0];
  }
  ba[--n] = 2;
  ba[--n] = 0;
  return new BigInteger(ba);
}

// "empty" RSA key constructor
function RSAKey() {
  this.n = null;
  this.e = 0;
  this.d = null;
  this.p = null;
  this.q = null;
  this.dmp1 = null;
  this.dmq1 = null;
  this.coeff = null;
}

// Set the public key fields N and e from hex strings
function RSASetPublic(N,E) {
  if(N != null && E != null && N.length > 0 && E.length > 0) {
    this.n = parseBigInt(N,16);
    this.e = parseInt(E,16);
  }
  else
    console.error("Invalid RSA public key");
}

// Perform raw public operation on "x": return x^e (mod n)
function RSADoPublic(x) {
  return x.modPowInt(this.e, this.n);
}

// Return the PKCS#1 RSA encryption of "text" as an even-length hex string
function RSAEncrypt(text) {
  var m = pkcs1pad2(text,(this.n.bitLength()+7)>>3);
  if(m == null) return null;
  var c = this.doPublic(m);
  if(c == null) return null;
  var h = c.toString(16);
  if((h.length & 1) == 0) return h; else return "0" + h;
}

// Return the PKCS#1 RSA encryption of "text" as a Base64-encoded string
//function RSAEncryptB64(text) {
//  var h = this.encrypt(text);
//  if(h) return hex2b64(h); else return null;
//}

// protected
RSAKey.prototype.doPublic = RSADoPublic;

// public
RSAKey.prototype.setPublic = RSASetPublic;
RSAKey.prototype.encrypt = RSAEncrypt;
//RSAKey.prototype.encrypt_b64 = RSAEncryptB64;
// Depends on rsa.js and jsbn2.js

// Version 1.1: support utf-8 decoding in pkcs1unpad2

// Undo PKCS#1 (type 2, random) padding and, if valid, return the plaintext
function pkcs1unpad2(d,n) {
  var b = d.toByteArray();
  var i = 0;
  while(i < b.length && b[i] == 0) ++i;
  if(b.length-i != n-1 || b[i] != 2)
    return null;
  ++i;
  while(b[i] != 0)
    if(++i >= b.length) return null;
  var ret = "";
  while(++i < b.length) {
    var c = b[i] & 255;
    if(c < 128) { // utf-8 decode
      ret += String.fromCharCode(c);
    }
    else if((c > 191) && (c < 224)) {
      ret += String.fromCharCode(((c & 31) << 6) | (b[i+1] & 63));
      ++i;
    }
    else {
      ret += String.fromCharCode(((c & 15) << 12) | ((b[i+1] & 63) << 6) | (b[i+2] & 63));
      i += 2;
    }
  }
  return ret;
}

// Set the private key fields N, e, and d from hex strings
function RSASetPrivate(N,E,D) {
  if(N != null && E != null && N.length > 0 && E.length > 0) {
    this.n = parseBigInt(N,16);
    this.e = parseInt(E,16);
    this.d = parseBigInt(D,16);
  }
  else
    console.error("Invalid RSA private key");
}

// Set the private key fields N, e, d and CRT params from hex strings
function RSASetPrivateEx(N,E,D,P,Q,DP,DQ,C) {
  if(N != null && E != null && N.length > 0 && E.length > 0) {
    this.n = parseBigInt(N,16);
    this.e = parseInt(E,16);
    this.d = parseBigInt(D,16);
    this.p = parseBigInt(P,16);
    this.q = parseBigInt(Q,16);
    this.dmp1 = parseBigInt(DP,16);
    this.dmq1 = parseBigInt(DQ,16);
    this.coeff = parseBigInt(C,16);
  }
  else
    console.error("Invalid RSA private key");
}

// Generate a new random private key B bits long, using public expt E
function RSAGenerate(B,E) {
  var rng = new SecureRandom();
  var qs = B>>1;
  this.e = parseInt(E,16);
  var ee = new BigInteger(E,16);
  for(;;) {
    for(;;) {
      this.p = new BigInteger(B-qs,1,rng);
      if(this.p.subtract(BigInteger.ONE).gcd(ee).compareTo(BigInteger.ONE) == 0 && this.p.isProbablePrime(10)) break;
    }
    for(;;) {
      this.q = new BigInteger(qs,1,rng);
      if(this.q.subtract(BigInteger.ONE).gcd(ee).compareTo(BigInteger.ONE) == 0 && this.q.isProbablePrime(10)) break;
    }
    if(this.p.compareTo(this.q) <= 0) {
      var t = this.p;
      this.p = this.q;
      this.q = t;
    }
    var p1 = this.p.subtract(BigInteger.ONE);
    var q1 = this.q.subtract(BigInteger.ONE);
    var phi = p1.multiply(q1);
    if(phi.gcd(ee).compareTo(BigInteger.ONE) == 0) {
      this.n = this.p.multiply(this.q);
      this.d = ee.modInverse(phi);
      this.dmp1 = this.d.mod(p1);
      this.dmq1 = this.d.mod(q1);
      this.coeff = this.q.modInverse(this.p);
      break;
    }
  }
}

// Perform raw private operation on "x": return x^d (mod n)
function RSADoPrivate(x) {
  if(this.p == null || this.q == null)
    return x.modPow(this.d, this.n);

  // TODO: re-calculate any missing CRT params
  var xp = x.mod(this.p).modPow(this.dmp1, this.p);
  var xq = x.mod(this.q).modPow(this.dmq1, this.q);

  while(xp.compareTo(xq) < 0)
    xp = xp.add(this.p);
  return xp.subtract(xq).multiply(this.coeff).mod(this.p).multiply(this.q).add(xq);
}

// Return the PKCS#1 RSA decryption of "ctext".
// "ctext" is an even-length hex string and the output is a plain string.
function RSADecrypt(ctext) {
  var c = parseBigInt(ctext, 16);
  var m = this.doPrivate(c);
  if(m == null) return null;
  return pkcs1unpad2(m, (this.n.bitLength()+7)>>3);
}

// Return the PKCS#1 RSA decryption of "ctext".
// "ctext" is a Base64-encoded string and the output is a plain string.
//function RSAB64Decrypt(ctext) {
//  var h = b64tohex(ctext);
//  if(h) return this.decrypt(h); else return null;
//}

// protected
RSAKey.prototype.doPrivate = RSADoPrivate;

// public
RSAKey.prototype.setPrivate = RSASetPrivate;
RSAKey.prototype.setPrivateEx = RSASetPrivateEx;
RSAKey.prototype.generate = RSAGenerate;
RSAKey.prototype.decrypt = RSADecrypt;
//RSAKey.prototype.b64_decrypt = RSAB64Decrypt;
// Copyright (c) 2011  Kevin M Burns Jr.
// All Rights Reserved.
// See "LICENSE" for details.
//
// Extension to jsbn which adds facilities for asynchronous RSA key generation
// Primarily created to avoid execution timeout on mobile devices
//
// http://www-cs-students.stanford.edu/~tjw/jsbn/
//
// ---

(function(){

// Generate a new random private key B bits long, using public expt E
var RSAGenerateAsync = function (B, E, callback) {
    //var rng = new SeededRandom();
    var rng = new SecureRandom();
    var qs = B >> 1;
    this.e = parseInt(E, 16);
    var ee = new BigInteger(E, 16);
    var rsa = this;
    // These functions have non-descript names because they were originally for(;;) loops.
    // I don't know about cryptography to give them better names than loop1-4.
    var loop1 = function() {
        var loop4 = function() {
            if (rsa.p.compareTo(rsa.q) <= 0) {
                var t = rsa.p;
                rsa.p = rsa.q;
                rsa.q = t;
            }
            var p1 = rsa.p.subtract(BigInteger.ONE);
            var q1 = rsa.q.subtract(BigInteger.ONE);
            var phi = p1.multiply(q1);
            if (phi.gcd(ee).compareTo(BigInteger.ONE) == 0) {
                rsa.n = rsa.p.multiply(rsa.q);
                rsa.d = ee.modInverse(phi);
                rsa.dmp1 = rsa.d.mod(p1);
                rsa.dmq1 = rsa.d.mod(q1);
                rsa.coeff = rsa.q.modInverse(rsa.p);
                setTimeout(function(){callback()},0); // escape
            } else {
                setTimeout(loop1,0);
            }
        };
        var loop3 = function() {
            rsa.q = nbi();
            rsa.q.fromNumberAsync(qs, 1, rng, function(){
                rsa.q.subtract(BigInteger.ONE).gcda(ee, function(r){
                    if (r.compareTo(BigInteger.ONE) == 0 && rsa.q.isProbablePrime(10)) {
                        setTimeout(loop4,0);
                    } else {
                        setTimeout(loop3,0);
                    }
                });
            });
        };
        var loop2 = function() {
            rsa.p = nbi();
            rsa.p.fromNumberAsync(B - qs, 1, rng, function(){
                rsa.p.subtract(BigInteger.ONE).gcda(ee, function(r){
                    if (r.compareTo(BigInteger.ONE) == 0 && rsa.p.isProbablePrime(10)) {
                        setTimeout(loop3,0);
                    } else {
                        setTimeout(loop2,0);
                    }
                });
            });
        };
        setTimeout(loop2,0);
    };
    setTimeout(loop1,0);
};
RSAKey.prototype.generateAsync = RSAGenerateAsync;

// Public API method
var bnGCDAsync = function (a, callback) {
    var x = (this.s < 0) ? this.negate() : this.clone();
    var y = (a.s < 0) ? a.negate() : a.clone();
    if (x.compareTo(y) < 0) {
        var t = x;
        x = y;
        y = t;
    }
    var i = x.getLowestSetBit(),
        g = y.getLowestSetBit();
    if (g < 0) {
        callback(x);
        return;
    }
    if (i < g) g = i;
    if (g > 0) {
        x.rShiftTo(g, x);
        y.rShiftTo(g, y);
    }
    // Workhorse of the algorithm, gets called 200 - 800 times per 512 bit keygen.
    var gcda1 = function() {
        if ((i = x.getLowestSetBit()) > 0){ x.rShiftTo(i, x); }
        if ((i = y.getLowestSetBit()) > 0){ y.rShiftTo(i, y); }
        if (x.compareTo(y) >= 0) {
            x.subTo(y, x);
            x.rShiftTo(1, x);
        } else {
            y.subTo(x, y);
            y.rShiftTo(1, y);
        }
        if(!(x.signum() > 0)) {
            if (g > 0) y.lShiftTo(g, y);
            setTimeout(function(){callback(y)},0); // escape
        } else {
            setTimeout(gcda1,0);
        }
    };
    setTimeout(gcda1,10);
};
BigInteger.prototype.gcda = bnGCDAsync;

// (protected) alternate constructor
var bnpFromNumberAsync = function (a,b,c,callback) {
  if("number" == typeof b) {
    if(a < 2) {
        this.fromInt(1);
    } else {
      this.fromNumber(a,c);
      if(!this.testBit(a-1)){
        this.bitwiseTo(BigInteger.ONE.shiftLeft(a-1),op_or,this);
      }
      if(this.isEven()) {
        this.dAddOffset(1,0);
      }
      var bnp = this;
      var bnpfn1 = function(){
        bnp.dAddOffset(2,0);
        if(bnp.bitLength() > a) bnp.subTo(BigInteger.ONE.shiftLeft(a-1),bnp);
        if(bnp.isProbablePrime(b)) {
            setTimeout(function(){callback()},0); // escape
        } else {
            setTimeout(bnpfn1,0);
        }
      };
      setTimeout(bnpfn1,0);
    }
  } else {
    var x = new Array(), t = a&7;
    x.length = (a>>3)+1;
    b.nextBytes(x);
    if(t > 0) x[0] &= ((1<<t)-1); else x[0] = 0;
    this.fromString(x,256);
  }
};
BigInteger.prototype.fromNumberAsync = bnpFromNumberAsync;

})();var b64map="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
var b64pad="=";

function hex2b64(h) {
  var i;
  var c;
  var ret = "";
  for(i = 0; i+3 <= h.length; i+=3) {
    c = parseInt(h.substring(i,i+3),16);
    ret += b64map.charAt(c >> 6) + b64map.charAt(c & 63);
  }
  if(i+1 == h.length) {
    c = parseInt(h.substring(i,i+1),16);
    ret += b64map.charAt(c << 2);
  }
  else if(i+2 == h.length) {
    c = parseInt(h.substring(i,i+2),16);
    ret += b64map.charAt(c >> 2) + b64map.charAt((c & 3) << 4);
  }
  while((ret.length & 3) > 0) ret += b64pad;
  return ret;
}

// convert a base64 string to hex
function b64tohex(s) {
  var ret = ""
  var i;
  var k = 0; // b64 state, 0-3
  var slop;
  for(i = 0; i < s.length; ++i) {
    if(s.charAt(i) == b64pad) break;
    v = b64map.indexOf(s.charAt(i));
    if(v < 0) continue;
    if(k == 0) {
      ret += int2char(v >> 2);
      slop = v & 3;
      k = 1;
    }
    else if(k == 1) {
      ret += int2char((slop << 2) | (v >> 4));
      slop = v & 0xf;
      k = 2;
    }
    else if(k == 2) {
      ret += int2char(slop);
      ret += int2char(v >> 2);
      slop = v & 3;
      k = 3;
    }
    else {
      ret += int2char((slop << 2) | (v >> 4));
      ret += int2char(v & 0xf);
      k = 0;
    }
  }
  if(k == 1)
    ret += int2char(slop << 2);
  return ret;
}

// convert a base64 string to a byte/number array
function b64toBA(s) {
  //piggyback on b64tohex for now, optimize later
  var h = b64tohex(s);
  var i;
  var a = new Array();
  for(i = 0; 2*i < h.length; ++i) {
    a[i] = parseInt(h.substring(2*i,2*i+2),16);
  }
  return a;
}
/*! asn1-1.0.2.js (c) 2013 Kenji Urushima | kjur.github.com/jsrsasign/license
 */

var JSX = JSX || {};
JSX.env = JSX.env || {};

var L = JSX, OP = Object.prototype, FUNCTION_TOSTRING = '[object Function]',ADD = ["toString", "valueOf"];

JSX.env.parseUA = function(agent) {

    var numberify = function(s) {
        var c = 0;
        return parseFloat(s.replace(/\./g, function() {
            return (c++ == 1) ? '' : '.';
        }));
    },

    nav = navigator,
    o = {
        ie: 0,
        opera: 0,
        gecko: 0,
        webkit: 0,
        chrome: 0,
        mobile: null,
        air: 0,
        ipad: 0,
        iphone: 0,
        ipod: 0,
        ios: null,
        android: 0,
        webos: 0,
        caja: nav && nav.cajaVersion,
        secure: false,
        os: null

    },

    ua = agent || (navigator && navigator.userAgent),
    loc = window && window.location,
    href = loc && loc.href,
    m;

    o.secure = href && (href.toLowerCase().indexOf("https") === 0);

    if (ua) {

        if ((/windows|win32/i).test(ua)) {
            o.os = 'windows';
        } else if ((/macintosh/i).test(ua)) {
            o.os = 'macintosh';
        } else if ((/rhino/i).test(ua)) {
            o.os = 'rhino';
        }
        if ((/KHTML/).test(ua)) {
            o.webkit = 1;
        }
        m = ua.match(/AppleWebKit\/([^\s]*)/);
        if (m && m[1]) {
            o.webkit = numberify(m[1]);
            if (/ Mobile\//.test(ua)) {
                o.mobile = 'Apple'; // iPhone or iPod Touch
                m = ua.match(/OS ([^\s]*)/);
                if (m && m[1]) {
                    m = numberify(m[1].replace('_', '.'));
                }
                o.ios = m;
                o.ipad = o.ipod = o.iphone = 0;
                m = ua.match(/iPad|iPod|iPhone/);
                if (m && m[0]) {
                    o[m[0].toLowerCase()] = o.ios;
                }
            } else {
                m = ua.match(/NokiaN[^\/]*|Android \d\.\d|webOS\/\d\.\d/);
                if (m) {
                    o.mobile = m[0];
                }
                if (/webOS/.test(ua)) {
                    o.mobile = 'WebOS';
                    m = ua.match(/webOS\/([^\s]*);/);
                    if (m && m[1]) {
                        o.webos = numberify(m[1]);
                    }
                }
                if (/ Android/.test(ua)) {
                    o.mobile = 'Android';
                    m = ua.match(/Android ([^\s]*);/);
                    if (m && m[1]) {
                        o.android = numberify(m[1]);
                    }
                }
            }
            m = ua.match(/Chrome\/([^\s]*)/);
            if (m && m[1]) {
                o.chrome = numberify(m[1]); // Chrome
            } else {
                m = ua.match(/AdobeAIR\/([^\s]*)/);
                if (m) {
                    o.air = m[0]; // Adobe AIR 1.0 or better
                }
            }
        }
        if (!o.webkit) {
            m = ua.match(/Opera[\s\/]([^\s]*)/);
            if (m && m[1]) {
                o.opera = numberify(m[1]);
                m = ua.match(/Version\/([^\s]*)/);
                if (m && m[1]) {
                    o.opera = numberify(m[1]); // opera 10+
                }
                m = ua.match(/Opera Mini[^;]*/);
                if (m) {
                    o.mobile = m[0]; // ex: Opera Mini/2.0.4509/1316
                }
            } else { // not opera or webkit
                m = ua.match(/MSIE\s([^;]*)/);
                if (m && m[1]) {
                    o.ie = numberify(m[1]);
                } else { // not opera, webkit, or ie
                    m = ua.match(/Gecko\/([^\s]*)/);
                    if (m) {
                        o.gecko = 1; // Gecko detected, look for revision
                        m = ua.match(/rv:([^\s\)]*)/);
                        if (m && m[1]) {
                            o.gecko = numberify(m[1]);
                        }
                    }
                }
            }
        }
    }
    return o;
};

JSX.env.ua = JSX.env.parseUA();

JSX.isFunction = function(o) {
    return (typeof o === 'function') || OP.toString.apply(o) === FUNCTION_TOSTRING;
};

JSX._IEEnumFix = (JSX.env.ua.ie) ? function(r, s) {
    var i, fname, f;
    for (i=0;i<ADD.length;i=i+1) {

        fname = ADD[i];
        f = s[fname];

        if (L.isFunction(f) && f!=OP[fname]) {
            r[fname]=f;
        }
    }
} : function(){};

JSX.extend = function(subc, superc, overrides) {
    if (!superc||!subc) {
        throw new Error("extend failed, please check that " +
                        "all dependencies are included.");
    }
    var F = function() {}, i;
    F.prototype=superc.prototype;
    subc.prototype=new F();
    subc.prototype.constructor=subc;
    subc.superclass=superc.prototype;
    if (superc.prototype.constructor == OP.constructor) {
        superc.prototype.constructor=superc;
    }

    if (overrides) {
        for (i in overrides) {
            if (L.hasOwnProperty(overrides, i)) {
                subc.prototype[i]=overrides[i];
            }
        }

        L._IEEnumFix(subc.prototype, overrides);
    }
};

/*
 * asn1.js - ASN.1 DER encoder classes
 *
 * Copyright (c) 2013 Kenji Urushima (kenji.urushima@gmail.com)
 *
 * This software is licensed under the terms of the MIT License.
 * http://kjur.github.com/jsrsasign/license
 *
 * The above copyright and license notice shall be 
 * included in all copies or substantial portions of the Software.
 */

/**
 * @fileOverview
 * @name asn1-1.0.js
 * @author Kenji Urushima kenji.urushima@gmail.com
 * @version 1.0.2 (2013-May-30)
 * @since 2.1
 * @license <a href="http://kjur.github.io/jsrsasign/license/">MIT License</a>
 */

/** 
 * kjur's class library name space
 * <p>
 * This name space provides following name spaces:
 * <ul>
 * <li>{@link KJUR.asn1} - ASN.1 primitive hexadecimal encoder</li>
 * <li>{@link KJUR.asn1.x509} - ASN.1 structure for X.509 certificate and CRL</li>
 * <li>{@link KJUR.crypto} - Java Cryptographic Extension(JCE) style MessageDigest/Signature 
 * class and utilities</li>
 * </ul>
 * </p> 
 * NOTE: Please ignore method summary and document of this namespace. This caused by a bug of jsdoc2.
  * @name KJUR
 * @namespace kjur's class library name space
 */
if (typeof KJUR == "undefined" || !KJUR) KJUR = {};

/**
 * kjur's ASN.1 class library name space
 * <p>
 * This is ITU-T X.690 ASN.1 DER encoder class library and
 * class structure and methods is very similar to 
 * org.bouncycastle.asn1 package of 
 * well known BouncyCaslte Cryptography Library.
 *
 * <h4>PROVIDING ASN.1 PRIMITIVES</h4>
 * Here are ASN.1 DER primitive classes.
 * <ul>
 * <li>{@link KJUR.asn1.DERBoolean}</li>
 * <li>{@link KJUR.asn1.DERInteger}</li>
 * <li>{@link KJUR.asn1.DERBitString}</li>
 * <li>{@link KJUR.asn1.DEROctetString}</li>
 * <li>{@link KJUR.asn1.DERNull}</li>
 * <li>{@link KJUR.asn1.DERObjectIdentifier}</li>
 * <li>{@link KJUR.asn1.DERUTF8String}</li>
 * <li>{@link KJUR.asn1.DERNumericString}</li>
 * <li>{@link KJUR.asn1.DERPrintableString}</li>
 * <li>{@link KJUR.asn1.DERTeletexString}</li>
 * <li>{@link KJUR.asn1.DERIA5String}</li>
 * <li>{@link KJUR.asn1.DERUTCTime}</li>
 * <li>{@link KJUR.asn1.DERGeneralizedTime}</li>
 * <li>{@link KJUR.asn1.DERSequence}</li>
 * <li>{@link KJUR.asn1.DERSet}</li>
 * </ul>
 *
 * <h4>OTHER ASN.1 CLASSES</h4>
 * <ul>
 * <li>{@link KJUR.asn1.ASN1Object}</li>
 * <li>{@link KJUR.asn1.DERAbstractString}</li>
 * <li>{@link KJUR.asn1.DERAbstractTime}</li>
 * <li>{@link KJUR.asn1.DERAbstractStructured}</li>
 * <li>{@link KJUR.asn1.DERTaggedObject}</li>
 * </ul>
 * </p>
 * NOTE: Please ignore method summary and document of this namespace. This caused by a bug of jsdoc2.
 * @name KJUR.asn1
 * @namespace
 */
if (typeof KJUR.asn1 == "undefined" || !KJUR.asn1) KJUR.asn1 = {};

/**
 * ASN1 utilities class
 * @name KJUR.asn1.ASN1Util
 * @classs ASN1 utilities class
 * @since asn1 1.0.2
 */
KJUR.asn1.ASN1Util = new function() {
    this.integerToByteHex = function(i) {
	var h = i.toString(16);
	if ((h.length % 2) == 1) h = '0' + h;
	return h;
    };
    this.bigIntToMinTwosComplementsHex = function(bigIntegerValue) {
	var h = bigIntegerValue.toString(16);
	if (h.substr(0, 1) != '-') {
	    if (h.length % 2 == 1) {
		h = '0' + h;
	    } else {
		if (! h.match(/^[0-7]/)) {
		    h = '00' + h;
		}
	    }
	} else {
	    var hPos = h.substr(1);
	    var xorLen = hPos.length;
	    if (xorLen % 2 == 1) {
		xorLen += 1;
	    } else {
		if (! h.match(/^[0-7]/)) {
		    xorLen += 2;
		}
	    }
	    var hMask = '';
	    for (var i = 0; i < xorLen; i++) {
		hMask += 'f';
	    }
	    var biMask = new BigInteger(hMask, 16);
	    var biNeg = biMask.xor(bigIntegerValue).add(BigInteger.ONE);
	    h = biNeg.toString(16).replace(/^-/, '');
	}
	return h;
    };
    /**
     * get PEM string from hexadecimal data and header string
     * @name getPEMStringFromHex
     * @memberOf KJUR.asn1.ASN1Util
     * @function
     * @param {String} dataHex hexadecimal string of PEM body
     * @param {String} pemHeader PEM header string (ex. 'RSA PRIVATE KEY')
     * @return {String} PEM formatted string of input data
     * @description
     * @example
     * var pem  = KJUR.asn1.ASN1Util.getPEMStringFromHex('616161', 'RSA PRIVATE KEY');
     * // value of pem will be:
     * -----BEGIN PRIVATE KEY-----
     * YWFh
     * -----END PRIVATE KEY-----
     */
    this.getPEMStringFromHex = function(dataHex, pemHeader) {
	var dataWA = CryptoJS.enc.Hex.parse(dataHex);
	var dataB64 = CryptoJS.enc.Base64.stringify(dataWA);
	var pemBody = dataB64.replace(/(.{64})/g, "$1\r\n");
        pemBody = pemBody.replace(/\r\n$/, '');
	return "-----BEGIN " + pemHeader + "-----\r\n" + 
               pemBody + 
               "\r\n-----END " + pemHeader + "-----\r\n";
    };
};

// ********************************************************************
//  Abstract ASN.1 Classes
// ********************************************************************

// ********************************************************************

/**
 * base class for ASN.1 DER encoder object
 * @name KJUR.asn1.ASN1Object
 * @class base class for ASN.1 DER encoder object
 * @property {Boolean} isModified flag whether internal data was changed
 * @property {String} hTLV hexadecimal string of ASN.1 TLV
 * @property {String} hT hexadecimal string of ASN.1 TLV tag(T)
 * @property {String} hL hexadecimal string of ASN.1 TLV length(L)
 * @property {String} hV hexadecimal string of ASN.1 TLV value(V)
 * @description
 */
KJUR.asn1.ASN1Object = function() {
    var isModified = true;
    var hTLV = null;
    var hT = '00'
    var hL = '00';
    var hV = '';

    /**
     * get hexadecimal ASN.1 TLV length(L) bytes from TLV value(V)
     * @name getLengthHexFromValue
     * @memberOf KJUR.asn1.ASN1Object
     * @function
     * @return {String} hexadecimal string of ASN.1 TLV length(L)
     */
    this.getLengthHexFromValue = function() {
	if (typeof this.hV == "undefined" || this.hV == null) {
	    throw "this.hV is null or undefined.";
	}
	if (this.hV.length % 2 == 1) {
	    throw "value hex must be even length: n=" + hV.length + ",v=" + this.hV;
	}
	var n = this.hV.length / 2;
	var hN = n.toString(16);
	if (hN.length % 2 == 1) {
	    hN = "0" + hN;
	}
	if (n < 128) {
	    return hN;
	} else {
	    var hNlen = hN.length / 2;
	    if (hNlen > 15) {
		throw "ASN.1 length too long to represent by 8x: n = " + n.toString(16);
	    }
	    var head = 128 + hNlen;
	    return head.toString(16) + hN;
	}
    };

    /**
     * get hexadecimal string of ASN.1 TLV bytes
     * @name getEncodedHex
     * @memberOf KJUR.asn1.ASN1Object
     * @function
     * @return {String} hexadecimal string of ASN.1 TLV
     */
    this.getEncodedHex = function() {
	if (this.hTLV == null || this.isModified) {
	    this.hV = this.getFreshValueHex();
	    this.hL = this.getLengthHexFromValue();
	    this.hTLV = this.hT + this.hL + this.hV;
	    this.isModified = false;
	    //console.error("first time: " + this.hTLV);
	}
	return this.hTLV;
    };

    /**
     * get hexadecimal string of ASN.1 TLV value(V) bytes
     * @name getValueHex
     * @memberOf KJUR.asn1.ASN1Object
     * @function
     * @return {String} hexadecimal string of ASN.1 TLV value(V) bytes
     */
    this.getValueHex = function() {
	this.getEncodedHex();
	return this.hV;
    }

    this.getFreshValueHex = function() {
	return '';
    };
};

// == BEGIN DERAbstractString ================================================
/**
 * base class for ASN.1 DER string classes
 * @name KJUR.asn1.DERAbstractString
 * @class base class for ASN.1 DER string classes
 * @param {Array} params associative array of parameters (ex. {'str': 'aaa'})
 * @property {String} s internal string of value
 * @extends KJUR.asn1.ASN1Object
 * @description
 * <br/>
 * As for argument 'params' for constructor, you can specify one of
 * following properties:
 * <ul>
 * <li>str - specify initial ASN.1 value(V) by a string</li>
 * <li>hex - specify initial ASN.1 value(V) by a hexadecimal string</li>
 * </ul>
 * NOTE: 'params' can be omitted.
 */
KJUR.asn1.DERAbstractString = function(params) {
    KJUR.asn1.DERAbstractString.superclass.constructor.call(this);
    var s = null;
    var hV = null;

    /**
     * get string value of this string object
     * @name getString
     * @memberOf KJUR.asn1.DERAbstractString
     * @function
     * @return {String} string value of this string object
     */
    this.getString = function() {
	return this.s;
    };

    /**
     * set value by a string
     * @name setString
     * @memberOf KJUR.asn1.DERAbstractString
     * @function
     * @param {String} newS value by a string to set
     */
    this.setString = function(newS) {
	this.hTLV = null;
	this.isModified = true;
	this.s = newS;
	this.hV = stohex(this.s);
    };

    /**
     * set value by a hexadecimal string
     * @name setStringHex
     * @memberOf KJUR.asn1.DERAbstractString
     * @function
     * @param {String} newHexString value by a hexadecimal string to set
     */
    this.setStringHex = function(newHexString) {
	this.hTLV = null;
	this.isModified = true;
	this.s = null;
	this.hV = newHexString;
    };

    this.getFreshValueHex = function() {
	return this.hV;
    };

    if (typeof params != "undefined") {
	if (typeof params['str'] != "undefined") {
	    this.setString(params['str']);
	} else if (typeof params['hex'] != "undefined") {
	    this.setStringHex(params['hex']);
	}
    }
};
JSX.extend(KJUR.asn1.DERAbstractString, KJUR.asn1.ASN1Object);
// == END   DERAbstractString ================================================

// == BEGIN DERAbstractTime ==================================================
/**
 * base class for ASN.1 DER Generalized/UTCTime class
 * @name KJUR.asn1.DERAbstractTime
 * @class base class for ASN.1 DER Generalized/UTCTime class
 * @param {Array} params associative array of parameters (ex. {'str': '130430235959Z'})
 * @extends KJUR.asn1.ASN1Object
 * @description
 * @see KJUR.asn1.ASN1Object - superclass
 */
KJUR.asn1.DERAbstractTime = function(params) {
    KJUR.asn1.DERAbstractTime.superclass.constructor.call(this);
    var s = null;
    var date = null;

    // --- PRIVATE METHODS --------------------
    this.localDateToUTC = function(d) {
	utc = d.getTime() + (d.getTimezoneOffset() * 60000);
	var utcDate = new Date(utc);
	return utcDate;
    };

    this.formatDate = function(dateObject, type) {
	var pad = this.zeroPadding;
	var d = this.localDateToUTC(dateObject);
	var year = String(d.getFullYear());
	if (type == 'utc') year = year.substr(2, 2);
	var month = pad(String(d.getMonth() + 1), 2);
	var day = pad(String(d.getDate()), 2);
	var hour = pad(String(d.getHours()), 2);
	var min = pad(String(d.getMinutes()), 2);
	var sec = pad(String(d.getSeconds()), 2);
	return year + month + day + hour + min + sec + 'Z';
    };

    this.zeroPadding = function(s, len) {
	if (s.length >= len) return s;
	return new Array(len - s.length + 1).join('0') + s;
    };

    // --- PUBLIC METHODS --------------------
    /**
     * get string value of this string object
     * @name getString
     * @memberOf KJUR.asn1.DERAbstractTime
     * @function
     * @return {String} string value of this time object
     */
    this.getString = function() {
	return this.s;
    };

    /**
     * set value by a string
     * @name setString
     * @memberOf KJUR.asn1.DERAbstractTime
     * @function
     * @param {String} newS value by a string to set such like "130430235959Z"
     */
    this.setString = function(newS) {
	this.hTLV = null;
	this.isModified = true;
	this.s = newS;
	this.hV = stohex(this.s);
    };

    /**
     * set value by a Date object
     * @name setByDateValue
     * @memberOf KJUR.asn1.DERAbstractTime
     * @function
     * @param {Integer} year year of date (ex. 2013)
     * @param {Integer} month month of date between 1 and 12 (ex. 12)
     * @param {Integer} day day of month
     * @param {Integer} hour hours of date
     * @param {Integer} min minutes of date
     * @param {Integer} sec seconds of date
     */
    this.setByDateValue = function(year, month, day, hour, min, sec) {
	var dateObject = new Date(Date.UTC(year, month - 1, day, hour, min, sec, 0));
	this.setByDate(dateObject);
    };

    this.getFreshValueHex = function() {
	return this.hV;
    };
};
JSX.extend(KJUR.asn1.DERAbstractTime, KJUR.asn1.ASN1Object);
// == END   DERAbstractTime ==================================================

// == BEGIN DERAbstractStructured ============================================
/**
 * base class for ASN.1 DER structured class
 * @name KJUR.asn1.DERAbstractStructured
 * @class base class for ASN.1 DER structured class
 * @property {Array} asn1Array internal array of ASN1Object
 * @extends KJUR.asn1.ASN1Object
 * @description
 * @see KJUR.asn1.ASN1Object - superclass
 */
KJUR.asn1.DERAbstractStructured = function(params) {
    KJUR.asn1.DERAbstractString.superclass.constructor.call(this);
    var asn1Array = null;

    /**
     * set value by array of ASN1Object
     * @name setByASN1ObjectArray
     * @memberOf KJUR.asn1.DERAbstractStructured
     * @function
     * @param {array} asn1ObjectArray array of ASN1Object to set
     */
    this.setByASN1ObjectArray = function(asn1ObjectArray) {
	this.hTLV = null;
	this.isModified = true;
	this.asn1Array = asn1ObjectArray;
    };

    /**
     * append an ASN1Object to internal array
     * @name appendASN1Object
     * @memberOf KJUR.asn1.DERAbstractStructured
     * @function
     * @param {ASN1Object} asn1Object to add
     */
    this.appendASN1Object = function(asn1Object) {
	this.hTLV = null;
	this.isModified = true;
	this.asn1Array.push(asn1Object);
    };

    this.asn1Array = new Array();
    if (typeof params != "undefined") {
	if (typeof params['array'] != "undefined") {
	    this.asn1Array = params['array'];
	}
    }
};
JSX.extend(KJUR.asn1.DERAbstractStructured, KJUR.asn1.ASN1Object);


// ********************************************************************
//  ASN.1 Object Classes
// ********************************************************************

// ********************************************************************
/**
 * class for ASN.1 DER Boolean
 * @name KJUR.asn1.DERBoolean
 * @class class for ASN.1 DER Boolean
 * @extends KJUR.asn1.ASN1Object
 * @description
 * @see KJUR.asn1.ASN1Object - superclass
 */
KJUR.asn1.DERBoolean = function() {
    KJUR.asn1.DERBoolean.superclass.constructor.call(this);
    this.hT = "01";
    this.hTLV = "0101ff";
};
JSX.extend(KJUR.asn1.DERBoolean, KJUR.asn1.ASN1Object);

// ********************************************************************
/**
 * class for ASN.1 DER Integer
 * @name KJUR.asn1.DERInteger
 * @class class for ASN.1 DER Integer
 * @extends KJUR.asn1.ASN1Object
 * @description
 * <br/>
 * As for argument 'params' for constructor, you can specify one of
 * following properties:
 * <ul>
 * <li>int - specify initial ASN.1 value(V) by integer value</li>
 * <li>bigint - specify initial ASN.1 value(V) by BigInteger object</li>
 * <li>hex - specify initial ASN.1 value(V) by a hexadecimal string</li>
 * </ul>
 * NOTE: 'params' can be omitted.
 */
KJUR.asn1.DERInteger = function(params) {
    KJUR.asn1.DERInteger.superclass.constructor.call(this);
    this.hT = "02";

    /**
     * set value by Tom Wu's BigInteger object
     * @name setByBigInteger
     * @memberOf KJUR.asn1.DERInteger
     * @function
     * @param {BigInteger} bigIntegerValue to set
     */
    this.setByBigInteger = function(bigIntegerValue) {
	this.hTLV = null;
	this.isModified = true;
	this.hV = KJUR.asn1.ASN1Util.bigIntToMinTwosComplementsHex(bigIntegerValue);
    };

    /**
     * set value by integer value
     * @name setByInteger
     * @memberOf KJUR.asn1.DERInteger
     * @function
     * @param {Integer} integer value to set
     */
    this.setByInteger = function(intValue) {
	var bi = new BigInteger(String(intValue), 10);
	this.setByBigInteger(bi);
    };

    /**
     * set value by integer value
     * @name setValueHex
     * @memberOf KJUR.asn1.DERInteger
     * @function
     * @param {String} hexadecimal string of integer value
     * @description
     * <br/>
     * NOTE: Value shall be represented by minimum octet length of
     * two's complement representation.
     */
    this.setValueHex = function(newHexString) {
	this.hV = newHexString;
    };

    this.getFreshValueHex = function() {
	return this.hV;
    };

    if (typeof params != "undefined") {
	if (typeof params['bigint'] != "undefined") {
	    this.setByBigInteger(params['bigint']);
	} else if (typeof params['int'] != "undefined") {
	    this.setByInteger(params['int']);
	} else if (typeof params['hex'] != "undefined") {
	    this.setValueHex(params['hex']);
	}
    }
};
JSX.extend(KJUR.asn1.DERInteger, KJUR.asn1.ASN1Object);

// ********************************************************************
/**
 * class for ASN.1 DER encoded BitString primitive
 * @name KJUR.asn1.DERBitString
 * @class class for ASN.1 DER encoded BitString primitive
 * @extends KJUR.asn1.ASN1Object
 * @description 
 * <br/>
 * As for argument 'params' for constructor, you can specify one of
 * following properties:
 * <ul>
 * <li>bin - specify binary string (ex. '10111')</li>
 * <li>array - specify array of boolean (ex. [true,false,true,true])</li>
 * <li>hex - specify hexadecimal string of ASN.1 value(V) including unused bits</li>
 * </ul>
 * NOTE: 'params' can be omitted.
 */
KJUR.asn1.DERBitString = function(params) {
    KJUR.asn1.DERBitString.superclass.constructor.call(this);
    this.hT = "03";

    /**
     * set ASN.1 value(V) by a hexadecimal string including unused bits
     * @name setHexValueIncludingUnusedBits
     * @memberOf KJUR.asn1.DERBitString
     * @function
     * @param {String} newHexStringIncludingUnusedBits
     */
    this.setHexValueIncludingUnusedBits = function(newHexStringIncludingUnusedBits) {
	this.hTLV = null;
	this.isModified = true;
	this.hV = newHexStringIncludingUnusedBits;
    };

    /**
     * set ASN.1 value(V) by unused bit and hexadecimal string of value
     * @name setUnusedBitsAndHexValue
     * @memberOf KJUR.asn1.DERBitString
     * @function
     * @param {Integer} unusedBits
     * @param {String} hValue
     */
    this.setUnusedBitsAndHexValue = function(unusedBits, hValue) {
	if (unusedBits < 0 || 7 < unusedBits) {
	    throw "unused bits shall be from 0 to 7: u = " + unusedBits;
	}
	var hUnusedBits = "0" + unusedBits;
	this.hTLV = null;
	this.isModified = true;
	this.hV = hUnusedBits + hValue;
    };

    /**
     * set ASN.1 DER BitString by binary string
     * @name setByBinaryString
     * @memberOf KJUR.asn1.DERBitString
     * @function
     * @param {String} binaryString binary value string (i.e. '10111')
     * @description
     * Its unused bits will be calculated automatically by length of 
     * 'binaryValue'. <br/>
     * NOTE: Trailing zeros '0' will be ignored.
     */
    this.setByBinaryString = function(binaryString) {
	binaryString = binaryString.replace(/0+$/, '');
	var unusedBits = 8 - binaryString.length % 8;
	if (unusedBits == 8) unusedBits = 0;
	for (var i = 0; i <= unusedBits; i++) {
	    binaryString += '0';
	}
	var h = '';
	for (var i = 0; i < binaryString.length - 1; i += 8) {
	    var b = binaryString.substr(i, 8);
	    var x = parseInt(b, 2).toString(16);
	    if (x.length == 1) x = '0' + x;
	    h += x;  
	}
	this.hTLV = null;
	this.isModified = true;
	this.hV = '0' + unusedBits + h;
    };

    /**
     * set ASN.1 TLV value(V) by an array of boolean
     * @name setByBooleanArray
     * @memberOf KJUR.asn1.DERBitString
     * @function
     * @param {array} booleanArray array of boolean (ex. [true, false, true])
     * @description
     * NOTE: Trailing falses will be ignored.
     */
    this.setByBooleanArray = function(booleanArray) {
	var s = '';
	for (var i = 0; i < booleanArray.length; i++) {
	    if (booleanArray[i] == true) {
		s += '1';
	    } else {
		s += '0';
	    }
	}
	this.setByBinaryString(s);
    };

    /**
     * generate an array of false with specified length
     * @name newFalseArray
     * @memberOf KJUR.asn1.DERBitString
     * @function
     * @param {Integer} nLength length of array to generate
     * @return {array} array of boolean faluse
     * @description
     * This static method may be useful to initialize boolean array.
     */
    this.newFalseArray = function(nLength) {
	var a = new Array(nLength);
	for (var i = 0; i < nLength; i++) {
	    a[i] = false;
	}
	return a;
    };

    this.getFreshValueHex = function() {
	return this.hV;
    };

    if (typeof params != "undefined") {
	if (typeof params['hex'] != "undefined") {
	    this.setHexValueIncludingUnusedBits(params['hex']);
	} else if (typeof params['bin'] != "undefined") {
	    this.setByBinaryString(params['bin']);
	} else if (typeof params['array'] != "undefined") {
	    this.setByBooleanArray(params['array']);
	}
    }
};
JSX.extend(KJUR.asn1.DERBitString, KJUR.asn1.ASN1Object);

// ********************************************************************
/**
 * class for ASN.1 DER OctetString
 * @name KJUR.asn1.DEROctetString
 * @class class for ASN.1 DER OctetString
 * @param {Array} params associative array of parameters (ex. {'str': 'aaa'})
 * @extends KJUR.asn1.DERAbstractString
 * @description
 * @see KJUR.asn1.DERAbstractString - superclass
 */
KJUR.asn1.DEROctetString = function(params) {
    KJUR.asn1.DEROctetString.superclass.constructor.call(this, params);
    this.hT = "04";
};
JSX.extend(KJUR.asn1.DEROctetString, KJUR.asn1.DERAbstractString);

// ********************************************************************
/**
 * class for ASN.1 DER Null
 * @name KJUR.asn1.DERNull
 * @class class for ASN.1 DER Null
 * @extends KJUR.asn1.ASN1Object
 * @description
 * @see KJUR.asn1.ASN1Object - superclass
 */
KJUR.asn1.DERNull = function() {
    KJUR.asn1.DERNull.superclass.constructor.call(this);
    this.hT = "05";
    this.hTLV = "0500";
};
JSX.extend(KJUR.asn1.DERNull, KJUR.asn1.ASN1Object);

// ********************************************************************
/**
 * class for ASN.1 DER ObjectIdentifier
 * @name KJUR.asn1.DERObjectIdentifier
 * @class class for ASN.1 DER ObjectIdentifier
 * @param {Array} params associative array of parameters (ex. {'oid': '2.5.4.5'})
 * @extends KJUR.asn1.ASN1Object
 * @description
 * <br/>
 * As for argument 'params' for constructor, you can specify one of
 * following properties:
 * <ul>
 * <li>oid - specify initial ASN.1 value(V) by a oid string (ex. 2.5.4.13)</li>
 * <li>hex - specify initial ASN.1 value(V) by a hexadecimal string</li>
 * </ul>
 * NOTE: 'params' can be omitted.
 */
KJUR.asn1.DERObjectIdentifier = function(params) {
    var itox = function(i) {
	var h = i.toString(16);
	if (h.length == 1) h = '0' + h;
	return h;
    };
    var roidtox = function(roid) {
	var h = '';
	var bi = new BigInteger(roid, 10);
	var b = bi.toString(2);
	var padLen = 7 - b.length % 7;
	if (padLen == 7) padLen = 0;
	var bPad = '';
	for (var i = 0; i < padLen; i++) bPad += '0';
	b = bPad + b;
	for (var i = 0; i < b.length - 1; i += 7) {
	    var b8 = b.substr(i, 7);
	    if (i != b.length - 7) b8 = '1' + b8;
	    h += itox(parseInt(b8, 2));
	}
	return h;
    }

    KJUR.asn1.DERObjectIdentifier.superclass.constructor.call(this);
    this.hT = "06";

    /**
     * set value by a hexadecimal string
     * @name setValueHex
     * @memberOf KJUR.asn1.DERObjectIdentifier
     * @function
     * @param {String} newHexString hexadecimal value of OID bytes
     */
    this.setValueHex = function(newHexString) {
	this.hTLV = null;
	this.isModified = true;
	this.s = null;
	this.hV = newHexString;
    };

    /**
     * set value by a OID string
     * @name setValueOidString
     * @memberOf KJUR.asn1.DERObjectIdentifier
     * @function
     * @param {String} oidString OID string (ex. 2.5.4.13)
     */
    this.setValueOidString = function(oidString) {
	if (! oidString.match(/^[0-9.]+$/)) {
	    throw "malformed oid string: " + oidString;
	}
	var h = '';
	var a = oidString.split('.');
	var i0 = parseInt(a[0]) * 40 + parseInt(a[1]);
	h += itox(i0);
	a.splice(0, 2);
	for (var i = 0; i < a.length; i++) {
	    h += roidtox(a[i]);
	}
	this.hTLV = null;
	this.isModified = true;
	this.s = null;
	this.hV = h;
    };

    /**
     * set value by a OID name
     * @name setValueName
     * @memberOf KJUR.asn1.DERObjectIdentifier
     * @function
     * @param {String} oidName OID name (ex. 'serverAuth')
     * @since 1.0.1
     * @description
     * OID name shall be defined in 'KJUR.asn1.x509.OID.name2oidList'.
     * Otherwise raise error.
     */
    this.setValueName = function(oidName) {
	if (typeof KJUR.asn1.x509.OID.name2oidList[oidName] != "undefined") {
	    var oid = KJUR.asn1.x509.OID.name2oidList[oidName];
	    this.setValueOidString(oid);
	} else {
	    throw "DERObjectIdentifier oidName undefined: " + oidName;
	}
    };

    this.getFreshValueHex = function() {
	return this.hV;
    };

    if (typeof params != "undefined") {
	if (typeof params['oid'] != "undefined") {
	    this.setValueOidString(params['oid']);
	} else if (typeof params['hex'] != "undefined") {
	    this.setValueHex(params['hex']);
	} else if (typeof params['name'] != "undefined") {
	    this.setValueName(params['name']);
	}
    }
};
JSX.extend(KJUR.asn1.DERObjectIdentifier, KJUR.asn1.ASN1Object);

// ********************************************************************
/**
 * class for ASN.1 DER UTF8String
 * @name KJUR.asn1.DERUTF8String
 * @class class for ASN.1 DER UTF8String
 * @param {Array} params associative array of parameters (ex. {'str': 'aaa'})
 * @extends KJUR.asn1.DERAbstractString
 * @description
 * @see KJUR.asn1.DERAbstractString - superclass
 */
KJUR.asn1.DERUTF8String = function(params) {
    KJUR.asn1.DERUTF8String.superclass.constructor.call(this, params);
    this.hT = "0c";
};
JSX.extend(KJUR.asn1.DERUTF8String, KJUR.asn1.DERAbstractString);

// ********************************************************************
/**
 * class for ASN.1 DER NumericString
 * @name KJUR.asn1.DERNumericString
 * @class class for ASN.1 DER NumericString
 * @param {Array} params associative array of parameters (ex. {'str': 'aaa'})
 * @extends KJUR.asn1.DERAbstractString
 * @description
 * @see KJUR.asn1.DERAbstractString - superclass
 */
KJUR.asn1.DERNumericString = function(params) {
    KJUR.asn1.DERNumericString.superclass.constructor.call(this, params);
    this.hT = "12";
};
JSX.extend(KJUR.asn1.DERNumericString, KJUR.asn1.DERAbstractString);

// ********************************************************************
/**
 * class for ASN.1 DER PrintableString
 * @name KJUR.asn1.DERPrintableString
 * @class class for ASN.1 DER PrintableString
 * @param {Array} params associative array of parameters (ex. {'str': 'aaa'})
 * @extends KJUR.asn1.DERAbstractString
 * @description
 * @see KJUR.asn1.DERAbstractString - superclass
 */
KJUR.asn1.DERPrintableString = function(params) {
    KJUR.asn1.DERPrintableString.superclass.constructor.call(this, params);
    this.hT = "13";
};
JSX.extend(KJUR.asn1.DERPrintableString, KJUR.asn1.DERAbstractString);

// ********************************************************************
/**
 * class for ASN.1 DER TeletexString
 * @name KJUR.asn1.DERTeletexString
 * @class class for ASN.1 DER TeletexString
 * @param {Array} params associative array of parameters (ex. {'str': 'aaa'})
 * @extends KJUR.asn1.DERAbstractString
 * @description
 * @see KJUR.asn1.DERAbstractString - superclass
 */
KJUR.asn1.DERTeletexString = function(params) {
    KJUR.asn1.DERTeletexString.superclass.constructor.call(this, params);
    this.hT = "14";
};
JSX.extend(KJUR.asn1.DERTeletexString, KJUR.asn1.DERAbstractString);

// ********************************************************************
/**
 * class for ASN.1 DER IA5String
 * @name KJUR.asn1.DERIA5String
 * @class class for ASN.1 DER IA5String
 * @param {Array} params associative array of parameters (ex. {'str': 'aaa'})
 * @extends KJUR.asn1.DERAbstractString
 * @description
 * @see KJUR.asn1.DERAbstractString - superclass
 */
KJUR.asn1.DERIA5String = function(params) {
    KJUR.asn1.DERIA5String.superclass.constructor.call(this, params);
    this.hT = "16";
};
JSX.extend(KJUR.asn1.DERIA5String, KJUR.asn1.DERAbstractString);

// ********************************************************************
/**
 * class for ASN.1 DER UTCTime
 * @name KJUR.asn1.DERUTCTime
 * @class class for ASN.1 DER UTCTime
 * @param {Array} params associative array of parameters (ex. {'str': '130430235959Z'})
 * @extends KJUR.asn1.DERAbstractTime
 * @description
 * <br/>
 * As for argument 'params' for constructor, you can specify one of
 * following properties:
 * <ul>
 * <li>str - specify initial ASN.1 value(V) by a string (ex.'130430235959Z')</li>
 * <li>hex - specify initial ASN.1 value(V) by a hexadecimal string</li>
 * <li>date - specify Date object.</li>
 * </ul>
 * NOTE: 'params' can be omitted.
 * <h4>EXAMPLES</h4>
 * @example
 * var d1 = new KJUR.asn1.DERUTCTime();
 * d1.setString('130430125959Z');
 *
 * var d2 = new KJUR.asn1.DERUTCTime({'str': '130430125959Z'});
 *
 * var d3 = new KJUR.asn1.DERUTCTime({'date': new Date(Date.UTC(2015, 0, 31, 0, 0, 0, 0))});
 */
KJUR.asn1.DERUTCTime = function(params) {
    KJUR.asn1.DERUTCTime.superclass.constructor.call(this, params);
    this.hT = "17";

    /**
     * set value by a Date object
     * @name setByDate
     * @memberOf KJUR.asn1.DERUTCTime
     * @function
     * @param {Date} dateObject Date object to set ASN.1 value(V)
     */
    this.setByDate = function(dateObject) {
	this.hTLV = null;
	this.isModified = true;
	this.date = dateObject;
	this.s = this.formatDate(this.date, 'utc');
	this.hV = stohex(this.s);
    };

    if (typeof params != "undefined") {
	if (typeof params['str'] != "undefined") {
	    this.setString(params['str']);
	} else if (typeof params['hex'] != "undefined") {
	    this.setStringHex(params['hex']);
	} else if (typeof params['date'] != "undefined") {
	    this.setByDate(params['date']);
	}
    }
};
JSX.extend(KJUR.asn1.DERUTCTime, KJUR.asn1.DERAbstractTime);

// ********************************************************************
/**
 * class for ASN.1 DER GeneralizedTime
 * @name KJUR.asn1.DERGeneralizedTime
 * @class class for ASN.1 DER GeneralizedTime
 * @param {Array} params associative array of parameters (ex. {'str': '20130430235959Z'})
 * @extends KJUR.asn1.DERAbstractTime
 * @description
 * <br/>
 * As for argument 'params' for constructor, you can specify one of
 * following properties:
 * <ul>
 * <li>str - specify initial ASN.1 value(V) by a string (ex.'20130430235959Z')</li>
 * <li>hex - specify initial ASN.1 value(V) by a hexadecimal string</li>
 * <li>date - specify Date object.</li>
 * </ul>
 * NOTE: 'params' can be omitted.
 */
KJUR.asn1.DERGeneralizedTime = function(params) {
    KJUR.asn1.DERGeneralizedTime.superclass.constructor.call(this, params);
    this.hT = "18";

    /**
     * set value by a Date object
     * @name setByDate
     * @memberOf KJUR.asn1.DERGeneralizedTime
     * @function
     * @param {Date} dateObject Date object to set ASN.1 value(V)
     * @example
     * When you specify UTC time, use 'Date.UTC' method like this:<br/>
     * var o = new DERUTCTime();
     * var date = new Date(Date.UTC(2015, 0, 31, 23, 59, 59, 0)); #2015JAN31 23:59:59
     * o.setByDate(date);
     */
    this.setByDate = function(dateObject) {
	this.hTLV = null;
	this.isModified = true;
	this.date = dateObject;
	this.s = this.formatDate(this.date, 'gen');
	this.hV = stohex(this.s);
    };

    if (typeof params != "undefined") {
	if (typeof params['str'] != "undefined") {
	    this.setString(params['str']);
	} else if (typeof params['hex'] != "undefined") {
	    this.setStringHex(params['hex']);
	} else if (typeof params['date'] != "undefined") {
	    this.setByDate(params['date']);
	}
    }
};
JSX.extend(KJUR.asn1.DERGeneralizedTime, KJUR.asn1.DERAbstractTime);

// ********************************************************************
/**
 * class for ASN.1 DER Sequence
 * @name KJUR.asn1.DERSequence
 * @class class for ASN.1 DER Sequence
 * @extends KJUR.asn1.DERAbstractStructured
 * @description
 * <br/>
 * As for argument 'params' for constructor, you can specify one of
 * following properties:
 * <ul>
 * <li>array - specify array of ASN1Object to set elements of content</li>
 * </ul>
 * NOTE: 'params' can be omitted.
 */
KJUR.asn1.DERSequence = function(params) {
    KJUR.asn1.DERSequence.superclass.constructor.call(this, params);
    this.hT = "30";
    this.getFreshValueHex = function() {
	var h = '';
	for (var i = 0; i < this.asn1Array.length; i++) {
	    var asn1Obj = this.asn1Array[i];
	    h += asn1Obj.getEncodedHex();
	}
	this.hV = h;
	return this.hV;
    };
};
JSX.extend(KJUR.asn1.DERSequence, KJUR.asn1.DERAbstractStructured);

// ********************************************************************
/**
 * class for ASN.1 DER Set
 * @name KJUR.asn1.DERSet
 * @class class for ASN.1 DER Set
 * @extends KJUR.asn1.DERAbstractStructured
 * @description
 * <br/>
 * As for argument 'params' for constructor, you can specify one of
 * following properties:
 * <ul>
 * <li>array - specify array of ASN1Object to set elements of content</li>
 * </ul>
 * NOTE: 'params' can be omitted.
 */
KJUR.asn1.DERSet = function(params) {
    KJUR.asn1.DERSet.superclass.constructor.call(this, params);
    this.hT = "31";
    this.getFreshValueHex = function() {
	var a = new Array();
	for (var i = 0; i < this.asn1Array.length; i++) {
	    var asn1Obj = this.asn1Array[i];
	    a.push(asn1Obj.getEncodedHex());
	}
	a.sort();
	this.hV = a.join('');
	return this.hV;
    };
};
JSX.extend(KJUR.asn1.DERSet, KJUR.asn1.DERAbstractStructured);

// ********************************************************************
/**
 * class for ASN.1 DER TaggedObject
 * @name KJUR.asn1.DERTaggedObject
 * @class class for ASN.1 DER TaggedObject
 * @extends KJUR.asn1.ASN1Object
 * @description
 * <br/>
 * Parameter 'tagNoNex' is ASN.1 tag(T) value for this object.
 * For example, if you find '[1]' tag in a ASN.1 dump, 
 * 'tagNoHex' will be 'a1'.
 * <br/>
 * As for optional argument 'params' for constructor, you can specify *ANY* of
 * following properties:
 * <ul>
 * <li>explicit - specify true if this is explicit tag otherwise false 
 *     (default is 'true').</li>
 * <li>tag - specify tag (default is 'a0' which means [0])</li>
 * <li>obj - specify ASN1Object which is tagged</li>
 * </ul>
 * @example
 * d1 = new KJUR.asn1.DERUTF8String({'str':'a'});
 * d2 = new KJUR.asn1.DERTaggedObject({'obj': d1});
 * hex = d2.getEncodedHex();
 */
KJUR.asn1.DERTaggedObject = function(params) {
    KJUR.asn1.DERTaggedObject.superclass.constructor.call(this);
    this.hT = "a0";
    this.hV = '';
    this.isExplicit = true;
    this.asn1Object = null;

    /**
     * set value by an ASN1Object
     * @name setString
     * @memberOf KJUR.asn1.DERTaggedObject
     * @function
     * @param {Boolean} isExplicitFlag flag for explicit/implicit tag
     * @param {Integer} tagNoHex hexadecimal string of ASN.1 tag
     * @param {ASN1Object} asn1Object ASN.1 to encapsulate
     */
    this.setASN1Object = function(isExplicitFlag, tagNoHex, asn1Object) {
	this.hT = tagNoHex;
	this.isExplicit = isExplicitFlag;
	this.asn1Object = asn1Object;
	if (this.isExplicit) {
	    this.hV = this.asn1Object.getEncodedHex();
	    this.hTLV = null;
	    this.isModified = true;
	} else {
	    this.hV = null;
	    this.hTLV = asn1Object.getEncodedHex();
	    this.hTLV = this.hTLV.replace(/^../, tagNoHex);
	    this.isModified = false;
	}
    };

    this.getFreshValueHex = function() {
	return this.hV;
    };

    if (typeof params != "undefined") {
	if (typeof params['tag'] != "undefined") {
	    this.hT = params['tag'];
	}
	if (typeof params['explicit'] != "undefined") {
	    this.isExplicit = params['explicit'];
	}
	if (typeof params['obj'] != "undefined") {
	    this.asn1Object = params['obj'];
	    this.setASN1Object(this.isExplicit, this.hT, this.asn1Object);
	}
    }
};
JSX.extend(KJUR.asn1.DERTaggedObject, KJUR.asn1.ASN1Object);// Hex JavaScript decoder
// Copyright (c) 2008-2013 Lapo Luchini <lapo@lapo.it>

// Permission to use, copy, modify, and/or distribute this software for any
// purpose with or without fee is hereby granted, provided that the above
// copyright notice and this permission notice appear in all copies.
// 
// THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
// WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
// MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
// ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
// WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
// ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
// OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

/*jshint browser: true, strict: true, immed: true, latedef: true, undef: true, regexdash: false */
(function (undefined) {
"use strict";

var Hex = {},
    decoder;

Hex.decode = function(a) {
    var i;
    if (decoder === undefined) {
        var hex = "0123456789ABCDEF",
            ignore = " \f\n\r\t\u00A0\u2028\u2029";
        decoder = [];
        for (i = 0; i < 16; ++i)
            decoder[hex.charAt(i)] = i;
        hex = hex.toLowerCase();
        for (i = 10; i < 16; ++i)
            decoder[hex.charAt(i)] = i;
        for (i = 0; i < ignore.length; ++i)
            decoder[ignore.charAt(i)] = -1;
    }
    var out = [],
        bits = 0,
        char_count = 0;
    for (i = 0; i < a.length; ++i) {
        var c = a.charAt(i);
        if (c == '=')
            break;
        c = decoder[c];
        if (c == -1)
            continue;
        if (c === undefined)
            throw 'Illegal character at offset ' + i;
        bits |= c;
        if (++char_count >= 2) {
            out[out.length] = bits;
            bits = 0;
            char_count = 0;
        } else {
            bits <<= 4;
        }
    }
    if (char_count)
        throw "Hex encoding incomplete: 4 bits missing";
    return out;
};

// export globals
window.Hex = Hex;
})();// Base64 JavaScript decoder
// Copyright (c) 2008-2013 Lapo Luchini <lapo@lapo.it>

// Permission to use, copy, modify, and/or distribute this software for any
// purpose with or without fee is hereby granted, provided that the above
// copyright notice and this permission notice appear in all copies.
// 
// THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
// WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
// MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
// ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
// WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
// ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
// OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

/*jshint browser: true, strict: true, immed: true, latedef: true, undef: true, regexdash: false */
(function (undefined) {
"use strict";

var Base64 = {},
    decoder;

Base64.decode = function (a) {
    var i;
    if (decoder === undefined) {
        var b64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",
            ignore = "= \f\n\r\t\u00A0\u2028\u2029";
        decoder = [];
        for (i = 0; i < 64; ++i)
            decoder[b64.charAt(i)] = i;
        for (i = 0; i < ignore.length; ++i)
            decoder[ignore.charAt(i)] = -1;
    }
    var out = [];
    var bits = 0, char_count = 0;
    for (i = 0; i < a.length; ++i) {
        var c = a.charAt(i);
        if (c == '=')
            break;
        c = decoder[c];
        if (c == -1)
            continue;
        if (c === undefined)
            throw 'Illegal character at offset ' + i;
        bits |= c;
        if (++char_count >= 4) {
            out[out.length] = (bits >> 16);
            out[out.length] = (bits >> 8) & 0xFF;
            out[out.length] = bits & 0xFF;
            bits = 0;
            char_count = 0;
        } else {
            bits <<= 6;
        }
    }
    switch (char_count) {
      case 1:
        throw "Base64 encoding incomplete: at least 2 bits missing";
      case 2:
        out[out.length] = (bits >> 10);
        break;
      case 3:
        out[out.length] = (bits >> 16);
        out[out.length] = (bits >> 8) & 0xFF;
        break;
    }
    return out;
};

Base64.re = /-----BEGIN [^-]+-----([A-Za-z0-9+\/=\s]+)-----END [^-]+-----|begin-base64[^\n]+\n([A-Za-z0-9+\/=\s]+)====/;
Base64.unarmor = function (a) {
    var m = Base64.re.exec(a);
    if (m) {
        if (m[1])
            a = m[1];
        else if (m[2])
            a = m[2];
        else
            throw "RegExp out of sync";
    }
    return Base64.decode(a);
};

// export globals
window.Base64 = Base64;
})();// ASN.1 JavaScript decoder
// Copyright (c) 2008-2013 Lapo Luchini <lapo@lapo.it>

// Permission to use, copy, modify, and/or distribute this software for any
// purpose with or without fee is hereby granted, provided that the above
// copyright notice and this permission notice appear in all copies.
// 
// THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
// WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
// MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
// ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
// WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
// ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
// OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

/*jshint browser: true, strict: true, immed: true, latedef: true, undef: true, regexdash: false */
/*global oids */
(function (undefined) {
"use strict";

var hardLimit = 100,
    ellipsis = "\u2026",
    DOM = {
        tag: function (tagName, className) {
            var t = document.createElement(tagName);
            t.className = className;
            return t;
        },
        text: function (str) {
            return document.createTextNode(str);
        }
    };

function Stream(enc, pos) {
    if (enc instanceof Stream) {
        this.enc = enc.enc;
        this.pos = enc.pos;
    } else {
        this.enc = enc;
        this.pos = pos;
    }
}
Stream.prototype.get = function (pos) {
    if (pos === undefined)
        pos = this.pos++;
    if (pos >= this.enc.length)
        throw 'Requesting byte offset ' + pos + ' on a stream of length ' + this.enc.length;
    return this.enc[pos];
};
Stream.prototype.hexDigits = "0123456789ABCDEF";
Stream.prototype.hexByte = function (b) {
    return this.hexDigits.charAt((b >> 4) & 0xF) + this.hexDigits.charAt(b & 0xF);
};
Stream.prototype.hexDump = function (start, end, raw) {
    var s = "";
    for (var i = start; i < end; ++i) {
        s += this.hexByte(this.get(i));
        if (raw !== true)
            switch (i & 0xF) {
            case 0x7: s += "  "; break;
            case 0xF: s += "\n"; break;
            default:  s += " ";
            }
    }
    return s;
};
Stream.prototype.parseStringISO = function (start, end) {
    var s = "";
    for (var i = start; i < end; ++i)
        s += String.fromCharCode(this.get(i));
    return s;
};
Stream.prototype.parseStringUTF = function (start, end) {
    var s = "";
    for (var i = start; i < end; ) {
        var c = this.get(i++);
        if (c < 128)
            s += String.fromCharCode(c);
        else if ((c > 191) && (c < 224))
            s += String.fromCharCode(((c & 0x1F) << 6) | (this.get(i++) & 0x3F));
        else
            s += String.fromCharCode(((c & 0x0F) << 12) | ((this.get(i++) & 0x3F) << 6) | (this.get(i++) & 0x3F));
    }
    return s;
};
Stream.prototype.parseStringBMP = function (start, end) {
    var str = ""
    for (var i = start; i < end; i += 2) {
        var high_byte = this.get(i);
        var low_byte = this.get(i + 1);
        str += String.fromCharCode( (high_byte << 8) + low_byte );
    }

    return str;
};
Stream.prototype.reTime = /^((?:1[89]|2\d)?\d\d)(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])([01]\d|2[0-3])(?:([0-5]\d)(?:([0-5]\d)(?:[.,](\d{1,3}))?)?)?(Z|[-+](?:[0]\d|1[0-2])([0-5]\d)?)?$/;
Stream.prototype.parseTime = function (start, end) {
    var s = this.parseStringISO(start, end),
        m = this.reTime.exec(s);
    if (!m)
        return "Unrecognized time: " + s;
    s = m[1] + "-" + m[2] + "-" + m[3] + " " + m[4];
    if (m[5]) {
        s += ":" + m[5];
        if (m[6]) {
            s += ":" + m[6];
            if (m[7])
                s += "." + m[7];
        }
    }
    if (m[8]) {
        s += " UTC";
        if (m[8] != 'Z') {
            s += m[8];
            if (m[9])
                s += ":" + m[9];
        }
    }
    return s;
};
Stream.prototype.parseInteger = function (start, end) {
    //TODO support negative numbers
    var len = end - start;
    if (len > 4) {
        len <<= 3;
        var s = this.get(start);
        if (s === 0)
            len -= 8;
        else
            while (s < 128) {
                s <<= 1;
                --len;
            }
        return "(" + len + " bit)";
    }
    var n = 0;
    for (var i = start; i < end; ++i)
        n = (n << 8) | this.get(i);
    return n;
};
Stream.prototype.parseBitString = function (start, end) {
    var unusedBit = this.get(start),
        lenBit = ((end - start - 1) << 3) - unusedBit,
        s = "(" + lenBit + " bit)";
    if (lenBit <= 20) {
        var skip = unusedBit;
        s += " ";
        for (var i = end - 1; i > start; --i) {
            var b = this.get(i);
            for (var j = skip; j < 8; ++j)
                s += (b >> j) & 1 ? "1" : "0";
            skip = 0;
        }
    }
    return s;
};
Stream.prototype.parseOctetString = function (start, end) {
    var len = end - start,
        s = "(" + len + " byte) ";
    if (len > hardLimit)
        end = start + hardLimit;
    for (var i = start; i < end; ++i)
        s += this.hexByte(this.get(i)); //TODO: also try Latin1?
    if (len > hardLimit)
        s += ellipsis;
    return s;
};
Stream.prototype.parseOID = function (start, end) {
    var s = '',
        n = 0,
        bits = 0;
    for (var i = start; i < end; ++i) {
        var v = this.get(i);
        n = (n << 7) | (v & 0x7F);
        bits += 7;
        if (!(v & 0x80)) { // finished
            if (s === '') {
                var m = n < 80 ? n < 40 ? 0 : 1 : 2;
                s = m + "." + (n - m * 40);
            } else
                s += "." + ((bits >= 31) ? "bigint" : n);
            n = bits = 0;
        }
    }
    return s;
};

function ASN1(stream, header, length, tag, sub) {
    this.stream = stream;
    this.header = header;
    this.length = length;
    this.tag = tag;
    this.sub = sub;
}
ASN1.prototype.typeName = function () {
    if (this.tag === undefined)
        return "unknown";
    var tagClass = this.tag >> 6,
        tagConstructed = (this.tag >> 5) & 1,
        tagNumber = this.tag & 0x1F;
    switch (tagClass) {
    case 0: // universal
        switch (tagNumber) {
        case 0x00: return "EOC";
        case 0x01: return "BOOLEAN";
        case 0x02: return "INTEGER";
        case 0x03: return "BIT_STRING";
        case 0x04: return "OCTET_STRING";
        case 0x05: return "NULL";
        case 0x06: return "OBJECT_IDENTIFIER";
        case 0x07: return "ObjectDescriptor";
        case 0x08: return "EXTERNAL";
        case 0x09: return "REAL";
        case 0x0A: return "ENUMERATED";
        case 0x0B: return "EMBEDDED_PDV";
        case 0x0C: return "UTF8String";
        case 0x10: return "SEQUENCE";
        case 0x11: return "SET";
        case 0x12: return "NumericString";
        case 0x13: return "PrintableString"; // ASCII subset
        case 0x14: return "TeletexString"; // aka T61String
        case 0x15: return "VideotexString";
        case 0x16: return "IA5String"; // ASCII
        case 0x17: return "UTCTime";
        case 0x18: return "GeneralizedTime";
        case 0x19: return "GraphicString";
        case 0x1A: return "VisibleString"; // ASCII subset
        case 0x1B: return "GeneralString";
        case 0x1C: return "UniversalString";
        case 0x1E: return "BMPString";
        default:   return "Universal_" + tagNumber.toString(16);
        }
    case 1: return "Application_" + tagNumber.toString(16);
    case 2: return "[" + tagNumber + "]"; // Context
    case 3: return "Private_" + tagNumber.toString(16);
    }
};
ASN1.prototype.reSeemsASCII = /^[ -~]+$/;
ASN1.prototype.content = function () {
    if (this.tag === undefined)
        return null;
    var tagClass = this.tag >> 6,
        tagNumber = this.tag & 0x1F,
        content = this.posContent(),
        len = Math.abs(this.length);
    if (tagClass !== 0) { // universal
        if (this.sub !== null)
            return "(" + this.sub.length + " elem)";
        //TODO: TRY TO PARSE ASCII STRING
        var s = this.stream.parseStringISO(content, content + Math.min(len, hardLimit));
        if (this.reSeemsASCII.test(s))
            return s.substring(0, 2 * hardLimit) + ((s.length > 2 * hardLimit) ? ellipsis : "");
        else
            return this.stream.parseOctetString(content, content + len);
    }
    switch (tagNumber) {
    case 0x01: // BOOLEAN
        return (this.stream.get(content) === 0) ? "false" : "true";
    case 0x02: // INTEGER
        return this.stream.parseInteger(content, content + len);
    case 0x03: // BIT_STRING
        return this.sub ? "(" + this.sub.length + " elem)" :
            this.stream.parseBitString(content, content + len);
    case 0x04: // OCTET_STRING
        return this.sub ? "(" + this.sub.length + " elem)" :
            this.stream.parseOctetString(content, content + len);
    //case 0x05: // NULL
    case 0x06: // OBJECT_IDENTIFIER
        return this.stream.parseOID(content, content + len);
    //case 0x07: // ObjectDescriptor
    //case 0x08: // EXTERNAL
    //case 0x09: // REAL
    //case 0x0A: // ENUMERATED
    //case 0x0B: // EMBEDDED_PDV
    case 0x10: // SEQUENCE
    case 0x11: // SET
        return "(" + this.sub.length + " elem)";
    case 0x0C: // UTF8String
        return this.stream.parseStringUTF(content, content + len);
    case 0x12: // NumericString
    case 0x13: // PrintableString
    case 0x14: // TeletexString
    case 0x15: // VideotexString
    case 0x16: // IA5String
    //case 0x19: // GraphicString
    case 0x1A: // VisibleString
    //case 0x1B: // GeneralString
    //case 0x1C: // UniversalString
        return this.stream.parseStringISO(content, content + len);
    case 0x1E: // BMPString
        return this.stream.parseStringBMP(content, content + len);
    case 0x17: // UTCTime
    case 0x18: // GeneralizedTime
        return this.stream.parseTime(content, content + len);
    }
    return null;
};
ASN1.prototype.toString = function () {
    return this.typeName() + "@" + this.stream.pos + "[header:" + this.header + ",length:" + this.length + ",sub:" + ((this.sub === null) ? 'null' : this.sub.length) + "]";
};
ASN1.prototype.print = function (indent) {
    if (indent === undefined) indent = '';
    document.writeln(indent + this);
    if (this.sub !== null) {
        indent += '  ';
        for (var i = 0, max = this.sub.length; i < max; ++i)
            this.sub[i].print(indent);
    }
};
ASN1.prototype.toPrettyString = function (indent) {
    if (indent === undefined) indent = '';
    var s = indent + this.typeName() + " @" + this.stream.pos;
    if (this.length >= 0)
        s += "+";
    s += this.length;
    if (this.tag & 0x20)
        s += " (constructed)";
    else if (((this.tag == 0x03) || (this.tag == 0x04)) && (this.sub !== null))
        s += " (encapsulates)";
    s += "\n";
    if (this.sub !== null) {
        indent += '  ';
        for (var i = 0, max = this.sub.length; i < max; ++i)
            s += this.sub[i].toPrettyString(indent);
    }
    return s;
};
ASN1.prototype.toDOM = function () {
    var node = DOM.tag("div", "node");
    node.asn1 = this;
    var head = DOM.tag("div", "head");
    var s = this.typeName().replace(/_/g, " ");
    head.innerHTML = s;
    var content = this.content();
    if (content !== null) {
        content = String(content).replace(/</g, "&lt;");
        var preview = DOM.tag("span", "preview");
        preview.appendChild(DOM.text(content));
        head.appendChild(preview);
    }
    node.appendChild(head);
    this.node = node;
    this.head = head;
    var value = DOM.tag("div", "value");
    s = "Offset: " + this.stream.pos + "<br/>";
    s += "Length: " + this.header + "+";
    if (this.length >= 0)
        s += this.length;
    else
        s += (-this.length) + " (undefined)";
    if (this.tag & 0x20)
        s += "<br/>(constructed)";
    else if (((this.tag == 0x03) || (this.tag == 0x04)) && (this.sub !== null))
        s += "<br/>(encapsulates)";
    //TODO if (this.tag == 0x03) s += "Unused bits: "
    if (content !== null) {
        s += "<br/>Value:<br/><b>" + content + "</b>";
        if ((typeof oids === 'object') && (this.tag == 0x06)) {
            var oid = oids[content];
            if (oid) {
                if (oid.d) s += "<br/>" + oid.d;
                if (oid.c) s += "<br/>" + oid.c;
                if (oid.w) s += "<br/>(warning!)";
            }
        }
    }
    value.innerHTML = s;
    node.appendChild(value);
    var sub = DOM.tag("div", "sub");
    if (this.sub !== null) {
        for (var i = 0, max = this.sub.length; i < max; ++i)
            sub.appendChild(this.sub[i].toDOM());
    }
    node.appendChild(sub);
    head.onclick = function () {
        node.className = (node.className == "node collapsed") ? "node" : "node collapsed";
    };
    return node;
};
ASN1.prototype.posStart = function () {
    return this.stream.pos;
};
ASN1.prototype.posContent = function () {
    return this.stream.pos + this.header;
};
ASN1.prototype.posEnd = function () {
    return this.stream.pos + this.header + Math.abs(this.length);
};
ASN1.prototype.fakeHover = function (current) {
    this.node.className += " hover";
    if (current)
        this.head.className += " hover";
};
ASN1.prototype.fakeOut = function (current) {
    var re = / ?hover/;
    this.node.className = this.node.className.replace(re, "");
    if (current)
        this.head.className = this.head.className.replace(re, "");
};
ASN1.prototype.toHexDOM_sub = function (node, className, stream, start, end) {
    if (start >= end)
        return;
    var sub = DOM.tag("span", className);
    sub.appendChild(DOM.text(
        stream.hexDump(start, end)));
    node.appendChild(sub);
};
ASN1.prototype.toHexDOM = function (root) {
    var node = DOM.tag("span", "hex");
    if (root === undefined) root = node;
    this.head.hexNode = node;
    this.head.onmouseover = function () { this.hexNode.className = "hexCurrent"; };
    this.head.onmouseout  = function () { this.hexNode.className = "hex"; };
    node.asn1 = this;
    node.onmouseover = function () {
        var current = !root.selected;
        if (current) {
            root.selected = this.asn1;
            this.className = "hexCurrent";
        }
        this.asn1.fakeHover(current);
    };
    node.onmouseout  = function () {
        var current = (root.selected == this.asn1);
        this.asn1.fakeOut(current);
        if (current) {
            root.selected = null;
            this.className = "hex";
        }
    };
    this.toHexDOM_sub(node, "tag", this.stream, this.posStart(), this.posStart() + 1);
    this.toHexDOM_sub(node, (this.length >= 0) ? "dlen" : "ulen", this.stream, this.posStart() + 1, this.posContent());
    if (this.sub === null)
        node.appendChild(DOM.text(
            this.stream.hexDump(this.posContent(), this.posEnd())));
    else if (this.sub.length > 0) {
        var first = this.sub[0];
        var last = this.sub[this.sub.length - 1];
        this.toHexDOM_sub(node, "intro", this.stream, this.posContent(), first.posStart());
        for (var i = 0, max = this.sub.length; i < max; ++i)
            node.appendChild(this.sub[i].toHexDOM(root));
        this.toHexDOM_sub(node, "outro", this.stream, last.posEnd(), this.posEnd());
    }
    return node;
};
ASN1.prototype.toHexString = function (root) {
    return this.stream.hexDump(this.posStart(), this.posEnd(), true);
};
ASN1.decodeLength = function (stream) {
    var buf = stream.get(),
        len = buf & 0x7F;
    if (len == buf)
        return len;
    if (len > 3)
        throw "Length over 24 bits not supported at position " + (stream.pos - 1);
    if (len === 0)
        return -1; // undefined
    buf = 0;
    for (var i = 0; i < len; ++i)
        buf = (buf << 8) | stream.get();
    return buf;
};
ASN1.hasContent = function (tag, len, stream) {
    if (tag & 0x20) // constructed
        return true;
    if ((tag < 0x03) || (tag > 0x04))
        return false;
    var p = new Stream(stream);
    if (tag == 0x03) p.get(); // BitString unused bits, must be in [0, 7]
    var subTag = p.get();
    if ((subTag >> 6) & 0x01) // not (universal or context)
        return false;
    try {
        var subLength = ASN1.decodeLength(p);
        return ((p.pos - stream.pos) + subLength == len);
    } catch (exception) {
        return false;
    }
};
ASN1.decode = function (stream) {
    if (!(stream instanceof Stream))
        stream = new Stream(stream, 0);
    var streamStart = new Stream(stream),
        tag = stream.get(),
        len = ASN1.decodeLength(stream),
        header = stream.pos - streamStart.pos,
        sub = null;
    if (ASN1.hasContent(tag, len, stream)) {
        // it has content, so we decode it
        var start = stream.pos;
        if (tag == 0x03) stream.get(); // skip BitString unused bits, must be in [0, 7]
        sub = [];
        if (len >= 0) {
            // definite length
            var end = start + len;
            while (stream.pos < end)
                sub[sub.length] = ASN1.decode(stream);
            if (stream.pos != end)
                throw "Content size is not correct for container starting at offset " + start;
        } else {
            // undefined length
            try {
                for (;;) {
                    var s = ASN1.decode(stream);
                    if (s.tag === 0)
                        break;
                    sub[sub.length] = s;
                }
                len = start - stream.pos;
            } catch (e) {
                throw "Exception while decoding undefined length content: " + e;
            }
        }
    } else
        stream.pos += len; // skip content
    return new ASN1(streamStart, header, len, tag, sub);
};
ASN1.test = function () {
    var test = [
        { value: [0x27],                   expected: 0x27     },
        { value: [0x81, 0xC9],             expected: 0xC9     },
        { value: [0x83, 0xFE, 0xDC, 0xBA], expected: 0xFEDCBA }
    ];
    for (var i = 0, max = test.length; i < max; ++i) {
        var pos = 0,
            stream = new Stream(test[i].value, 0),
            res = ASN1.decodeLength(stream);
        if (res != test[i].expected)
            document.write("In test[" + i + "] expected " + test[i].expected + " got " + res + "\n");
    }
};

// export globals
window.ASN1 = ASN1;
})();/**
 * Retrieve the hexadecimal value (as a string) of the current ASN.1 element
 * @returns {string}
 * @public
 */
ASN1.prototype.getHexStringValue = function () {
  var hexString = this.toHexString();
  var offset = this.header * 2;
  var length = this.length * 2;
  return hexString.substr(offset, length);
};

/**
 * Method to parse a pem encoded string containing both a public or private key.
 * The method will translate the pem encoded string in a der encoded string and
 * will parse private key and public key parameters. This method accepts public key
 * in the rsaencryption pkcs #1 format (oid: 1.2.840.113549.1.1.1).
 *
 * @todo Check how many rsa formats use the same format of pkcs #1.
 *
 * The format is defined as:
 * PublicKeyInfo ::= SEQUENCE {
 *   algorithm       AlgorithmIdentifier,
 *   PublicKey       BIT STRING
 * }
 * Where AlgorithmIdentifier is:
 * AlgorithmIdentifier ::= SEQUENCE {
 *   algorithm       OBJECT IDENTIFIER,     the OID of the enc algorithm
 *   parameters      ANY DEFINED BY algorithm OPTIONAL (NULL for PKCS #1)
 * }
 * and PublicKey is a SEQUENCE encapsulated in a BIT STRING
 * RSAPublicKey ::= SEQUENCE {
 *   modulus           INTEGER,  -- n
 *   publicExponent    INTEGER   -- e
 * }
 * it's possible to examine the structure of the keys obtained from openssl using
 * an asn.1 dumper as the one used here to parse the components: http://lapo.it/asn1js/
 * @argument {string} pem the pem encoded string, can include the BEGIN/END header/footer
 * @private
 */
RSAKey.prototype.parseKey = function (pem) {
  try {
    var modulus = 0;
    var public_exponent = 0;
    var reHex = /^\s*(?:[0-9A-Fa-f][0-9A-Fa-f]\s*)+$/;
    var der = reHex.test(pem) ? Hex.decode(pem) : Base64.unarmor(pem);
    var asn1 = ASN1.decode(der);
    if (asn1.sub.length === 9) {

      // Parse the private key.
      modulus = asn1.sub[1].getHexStringValue(); //bigint
      this.n = parseBigInt(modulus, 16);

      public_exponent = asn1.sub[2].getHexStringValue(); //int
      this.e = parseInt(public_exponent, 16);

      var private_exponent = asn1.sub[3].getHexStringValue(); //bigint
      this.d = parseBigInt(private_exponent, 16);

      var prime1 = asn1.sub[4].getHexStringValue(); //bigint
      this.p = parseBigInt(prime1, 16);

      var prime2 = asn1.sub[5].getHexStringValue(); //bigint
      this.q = parseBigInt(prime2, 16);

      var exponent1 = asn1.sub[6].getHexStringValue(); //bigint
      this.dmp1 = parseBigInt(exponent1, 16);

      var exponent2 = asn1.sub[7].getHexStringValue(); //bigint
      this.dmq1 = parseBigInt(exponent2, 16);

      var coefficient = asn1.sub[8].getHexStringValue(); //bigint
      this.coeff = parseBigInt(coefficient, 16);

    }
    else if (asn1.sub.length === 2) {

      // Parse the public key.
      var bit_string = asn1.sub[1];
      var sequence = bit_string.sub[0];

      modulus = sequence.sub[0].getHexStringValue();
      this.n = parseBigInt(modulus, 16);
      public_exponent = sequence.sub[1].getHexStringValue();
      this.e = parseInt(public_exponent, 16);

    }
    else {
      return false;
    }
    return true;
  }
  catch (ex) {
    return false;
  }
};

/**
 * Translate rsa parameters in a hex encoded string representing the rsa key.
 *
 * The translation follow the ASN.1 notation :
 * RSAPrivateKey ::= SEQUENCE {
 *   version           Version,
 *   modulus           INTEGER,  -- n
 *   publicExponent    INTEGER,  -- e
 *   privateExponent   INTEGER,  -- d
 *   prime1            INTEGER,  -- p
 *   prime2            INTEGER,  -- q
 *   exponent1         INTEGER,  -- d mod (p1)
 *   exponent2         INTEGER,  -- d mod (q-1)
 *   coefficient       INTEGER,  -- (inverse of q) mod p
 * }
 * @returns {string}  DER Encoded String representing the rsa private key
 * @private
 */
RSAKey.prototype.getPrivateBaseKey = function () {
  var options = {
    'array': [
      new KJUR.asn1.DERInteger({'int': 0}),
      new KJUR.asn1.DERInteger({'bigint': this.n}),
      new KJUR.asn1.DERInteger({'int': this.e}),
      new KJUR.asn1.DERInteger({'bigint': this.d}),
      new KJUR.asn1.DERInteger({'bigint': this.p}),
      new KJUR.asn1.DERInteger({'bigint': this.q}),
      new KJUR.asn1.DERInteger({'bigint': this.dmp1}),
      new KJUR.asn1.DERInteger({'bigint': this.dmq1}),
      new KJUR.asn1.DERInteger({'bigint': this.coeff})
    ]
  };
  var seq = new KJUR.asn1.DERSequence(options);
  return seq.getEncodedHex();
};

/**
 * base64 (pem) encoded version of the DER encoded representation
 * @returns {string} pem encoded representation without header and footer
 * @public
 */
RSAKey.prototype.getPrivateBaseKeyB64 = function () {
  return hex2b64(this.getPrivateBaseKey());
};

/**
 * Translate rsa parameters in a hex encoded string representing the rsa public key.
 * The representation follow the ASN.1 notation :
 * PublicKeyInfo ::= SEQUENCE {
 *   algorithm       AlgorithmIdentifier,
 *   PublicKey       BIT STRING
 * }
 * Where AlgorithmIdentifier is:
 * AlgorithmIdentifier ::= SEQUENCE {
 *   algorithm       OBJECT IDENTIFIER,     the OID of the enc algorithm
 *   parameters      ANY DEFINED BY algorithm OPTIONAL (NULL for PKCS #1)
 * }
 * and PublicKey is a SEQUENCE encapsulated in a BIT STRING
 * RSAPublicKey ::= SEQUENCE {
 *   modulus           INTEGER,  -- n
 *   publicExponent    INTEGER   -- e
 * }
 * @returns {string} DER Encoded String representing the rsa public key
 * @private
 */
RSAKey.prototype.getPublicBaseKey = function () {
  var options = {
    'array': [
      new KJUR.asn1.DERObjectIdentifier({'oid': '1.2.840.113549.1.1.1'}), //RSA Encryption pkcs #1 oid
      new KJUR.asn1.DERNull()
    ]
  };
  var first_sequence = new KJUR.asn1.DERSequence(options);

  options = {
    'array': [
      new KJUR.asn1.DERInteger({'bigint': this.n}),
      new KJUR.asn1.DERInteger({'int': this.e})
    ]
  };
  var second_sequence = new KJUR.asn1.DERSequence(options);

  options = {
    'hex': '00' + second_sequence.getEncodedHex()
  };
  var bit_string = new KJUR.asn1.DERBitString(options);

  options = {
    'array': [
      first_sequence,
      bit_string
    ]
  };
  var seq = new KJUR.asn1.DERSequence(options);
  return seq.getEncodedHex();
};

/**
 * base64 (pem) encoded version of the DER encoded representation
 * @returns {string} pem encoded representation without header and footer
 * @public
 */
RSAKey.prototype.getPublicBaseKeyB64 = function () {
  return hex2b64(this.getPublicBaseKey());
};

/**
 * wrap the string in block of width chars. The default value for rsa keys is 64
 * characters.
 * @param {string} str the pem encoded string without header and footer
 * @param {Number} [width=64] - the length the string has to be wrapped at
 * @returns {string}
 * @private
 */
RSAKey.prototype.wordwrap = function (str, width) {
  width = width || 64;
  if (!str) {
    return str;
  }
  var regex = '(.{1,' + width + '})( +|$\n?)|(.{1,' + width + '})';
  return str.match(RegExp(regex, 'g')).join('\n');
};

/**
 * Retrieve the pem encoded private key
 * @returns {string} the pem encoded private key with header/footer
 * @public
 */
RSAKey.prototype.getPrivateKey = function () {
  var key = "-----BEGIN RSA PRIVATE KEY-----\n";
  key += this.wordwrap(this.getPrivateBaseKeyB64()) + "\n";
  key += "-----END RSA PRIVATE KEY-----";
  return key;
};

/**
 * Retrieve the pem encoded public key
 * @returns {string} the pem encoded public key with header/footer
 * @public
 */
RSAKey.prototype.getPublicKey = function () {
  var key = "-----BEGIN PUBLIC KEY-----\n";
  key += this.wordwrap(this.getPublicBaseKeyB64()) + "\n";
  key += "-----END PUBLIC KEY-----";
  return key;
};

/**
 * Check if the object contains the necessary parameters to populate the rsa modulus
 * and public exponent parameters.
 * @param {Object} [obj={}] - An object that may contain the two public key
 * parameters
 * @returns {boolean} true if the object contains both the modulus and the public exponent
 * properties (n and e)
 * @todo check for types of n and e. N should be a parseable bigInt object, E should
 * be a parseable integer number
 * @private
 */
RSAKey.prototype.hasPublicKeyProperty = function (obj) {
  obj = obj || {};
  return (
    obj.hasOwnProperty('n') &&
    obj.hasOwnProperty('e')
  );
};

/**
 * Check if the object contains ALL the parameters of an RSA key.
 * @param {Object} [obj={}] - An object that may contain nine rsa key
 * parameters
 * @returns {boolean} true if the object contains all the parameters needed
 * @todo check for types of the parameters all the parameters but the public exponent
 * should be parseable bigint objects, the public exponent should be a parseable integer number
 * @private
 */
RSAKey.prototype.hasPrivateKeyProperty = function (obj) {
  obj = obj || {};
  return (
    obj.hasOwnProperty('n') &&
    obj.hasOwnProperty('e') &&
    obj.hasOwnProperty('d') &&
    obj.hasOwnProperty('p') &&
    obj.hasOwnProperty('q') &&
    obj.hasOwnProperty('dmp1') &&
    obj.hasOwnProperty('dmq1') &&
    obj.hasOwnProperty('coeff')
  );
};

/**
 * Parse the properties of obj in the current rsa object. Obj should AT LEAST
 * include the modulus and public exponent (n, e) parameters.
 * @param {Object} obj - the object containing rsa parameters
 * @private
 */
RSAKey.prototype.parsePropertiesFrom = function (obj) {
  this.n = obj.n;
  this.e = obj.e;

  if (obj.hasOwnProperty('d')) {
    this.d = obj.d;
    this.p = obj.p;
    this.q = obj.q;
    this.dmp1 = obj.dmp1;
    this.dmq1 = obj.dmq1;
    this.coeff = obj.coeff;
  }
};

/**
 * Create a new JSEncryptRSAKey that extends Tom Wu's RSA key object.
 * This object is just a decorator for parsing the key parameter
 * @param {string|Object} key - The key in string format, or an object containing
 * the parameters needed to build a RSAKey object.
 * @constructor
 */
var JSEncryptRSAKey = function (key) {
  // Call the super constructor.
  RSAKey.call(this);
  // If a key key was provided.
  if (key) {
    // If this is a string...
    if (typeof key === 'string') {
      this.parseKey(key);
    }
    else if (
      this.hasPrivateKeyProperty(key) ||
      this.hasPublicKeyProperty(key)
    ) {
      // Set the values for the key.
      this.parsePropertiesFrom(key);
    }
  }
};

// Derive from RSAKey.
JSEncryptRSAKey.prototype = new RSAKey();

// Reset the contructor.
JSEncryptRSAKey.prototype.constructor = JSEncryptRSAKey;


/**
 *
 * @param {Object} [options = {}] - An object to customize JSEncrypt behaviour
 * possible parameters are:
 * - default_key_size        {number}  default: 1024 the key size in bit
 * - default_public_exponent {string}  default: '010001' the hexadecimal representation of the public exponent
 * - log                     {boolean} default: false whether log warn/error or not
 * @constructor
 */
var JSEncrypt = function (options) {
  options = options || {};
  this.default_key_size = parseInt(options.default_key_size) || 1024;
  this.default_public_exponent = options.default_public_exponent || '010001'; //65537 default openssl public exponent for rsa key type
  this.log = options.log || false;
  // The private and public key.
  this.key = null;
};

/**
 * Method to set the rsa key parameter (one method is enough to set both the public
 * and the private key, since the private key contains the public key paramenters)
 * Log a warning if logs are enabled
 * @param {Object|string} key the pem encoded string or an object (with or without header/footer)
 * @public
 */
JSEncrypt.prototype.setKey = function (key) {
  if (this.log && this.key) {
    console.warn('A key was already set, overriding existing.');
  }
  this.key = new JSEncryptRSAKey(key);
};

/**
 * Proxy method for setKey, for api compatibility
 * @see setKey
 * @public
 */
JSEncrypt.prototype.setPrivateKey = function (privkey) {
  // Create the key.
  this.setKey(privkey);
};

/**
 * Proxy method for setKey, for api compatibility
 * @see setKey
 * @public
 */
JSEncrypt.prototype.setPublicKey = function (pubkey) {
  // Sets the public key.
  this.setKey(pubkey);
};

/**
 * Proxy method for RSAKey object's decrypt, decrypt the string using the private
 * components of the rsa key object. Note that if the object was not set will be created
 * on the fly (by the getKey method) using the parameters passed in the JSEncrypt constructor
 * @param {string} string base64 encoded crypted string to decrypt
 * @return {string} the decrypted string
 * @public
 */
JSEncrypt.prototype.decrypt = function (string) {
  // Return the decrypted string.
  try {
    return this.getKey().decrypt(b64tohex(string));
  }
  catch (ex) {
    return false;
  }
};

/**
 * Proxy method for RSAKey object's encrypt, encrypt the string using the public
 * components of the rsa key object. Note that if the object was not set will be created
 * on the fly (by the getKey method) using the parameters passed in the JSEncrypt constructor
 * @param {string} string the string to encrypt
 * @return {string} the encrypted string encoded in base64
 * @public
 */
JSEncrypt.prototype.encrypt = function (string) {
  // Return the encrypted string.
  try {
    return hex2b64(this.getKey().encrypt(string));
  }
  catch (ex) {
    return false;
  }
};

/**
 * Getter for the current JSEncryptRSAKey object. If it doesn't exists a new object
 * will be created and returned
 * @param {callback} [cb] the callback to be called if we want the key to be generated
 * in an async fashion
 * @returns {JSEncryptRSAKey} the JSEncryptRSAKey object
 * @public
 */
JSEncrypt.prototype.getKey = function (cb) {
  // Only create new if it does not exist.
  if (!this.key) {
    // Get a new private key.
    this.key = new JSEncryptRSAKey();
    if (cb && {}.toString.call(cb) === '[object Function]') {
      this.key.generateAsync(this.default_key_size, this.default_public_exponent, cb);
      return;
    }
    // Generate the key.
    this.key.generate(this.default_key_size, this.default_public_exponent);
  }
  return this.key;
};

/**
 * Returns the pem encoded representation of the private key
 * If the key doesn't exists a new key will be created
 * @returns {string} pem encoded representation of the private key WITH header and footer
 * @public
 */
JSEncrypt.prototype.getPrivateKey = function () {
  // Return the private representation of this key.
  return this.getKey().getPrivateKey();
};

/**
 * Returns the pem encoded representation of the private key
 * If the key doesn't exists a new key will be created
 * @returns {string} pem encoded representation of the private key WITHOUT header and footer
 * @public
 */
JSEncrypt.prototype.getPrivateKeyB64 = function () {
  // Return the private representation of this key.
  return this.getKey().getPrivateBaseKeyB64();
};


/**
 * Returns the pem encoded representation of the public key
 * If the key doesn't exists a new key will be created
 * @returns {string} pem encoded representation of the public key WITH header and footer
 * @public
 */
JSEncrypt.prototype.getPublicKey = function () {
  // Return the private representation of this key.
  return this.getKey().getPublicKey();
};

/**
 * Returns the pem encoded representation of the public key
 * If the key doesn't exists a new key will be created
 * @returns {string} pem encoded representation of the public key WITHOUT header and footer
 * @public
 */
JSEncrypt.prototype.getPublicKeyB64 = function () {
  // Return the private representation of this key.
  return this.getKey().getPublicBaseKeyB64();
};

exports.JSEncrypt = JSEncrypt;
})(JSEncryptExports);
var JSEncrypt = JSEncryptExports.JSEncrypt;

var isArray = function(a) {
	return Object.prototype.toString.call(a) === '[object Array]';
};

var isNumeric = function(n) {
	return !isArray(n) && (n - parseFloat(n) + 1) >= 0;
};

PagarMe.Validator = {
	getCardBrand: function(cardNumber) {
		if(!cardNumber) {
			return null;
		}

		cardNumber = cardNumber.replace(/[^0-9]/g, '');

		var cardStartRules = [
			['elo', ['401178','401179','431274','438935','451416','457393','457631','457632','498405','498410','498411','498412','498418','498419','498420','498421','498422','498427','498428','498429','498432','498433','498472','498473','498487','498493','498494','498497','498498','504175','506699','506700','506701','506702','506703','506704','506705','506706','506707','506708','506709','506710','506711','506712','506713','506714','506715','506716','506717','506718','506719','506720','506721','506722','506723','506724','506725','506726','506727','506728','506729','506730','506731','506732','506733','506734','506735','506736','506737','506738','506739','506740','506741','506742','506743','506744','506745','506746','506747','506748','506749','506750','506751','506752','506753','506754','506755','506756','506757','506758','506759','506760','506761','506762','506763','506764','506765','506766','506767','506768','506769','506770','506771','506772','506773','506774','506775','506776','506777','506778','509000','509001','509002','509003','509004','509005','509006','509007','509008','509009','509010','509011','509012','509013','509014','509015','509016','509017','509018','509019','509020','509021','509022','509023','509024','509025','509026','509027','509028','509029','509030','509031','509032','509033','509034','509035','509036','509037','509038','509039','509040','509041','509042','509043','509044','509045','509046','509047','509048','509049','509050','509051','509052','509053','509054','509055','509056','509057','509058','509059','509060','509061','509062','509063','509064','509065','509066','509067','509068','509069','509070','509071','509072','509073','509074','509075','509076','509077','509078','509079','509080','509081','509082','509083','509084','509085','509086','509087','509088','509089','509090','509091','509092','509093','509094','509095','509096','509097','509098','509099','509100','509101','509102','509103','509104','509105','509106','509107','509108','509109','509110','509111','509112','509113','509114','509115','509116','509117','509118','509119','509120','509121','509122','509123','509124','509125','509126','509127','509128','509129','509130','509131','509132','509133','509134','509135','509136','509137','509138','509139','509140','509141','509142','509143','509144','509145','509146','509147','509148','509149','509150','509151','509152','509153','509154','509155','509156','509157','509158','509159','509160','509161','509162','509163','509164','509165','509166','509167','509168','509169','509170','509171','509172','509173','509174','509175','509176','509177','509178','509179','509180','509181','509182','509183','509184','509185','509186','509187','509188','509189','509190','509191','509192','509193','509194','509195','509196','509197','509198','509199','509200','509201','509202','509203','509204','509205','509206','509207','509208','509209','509210','509211','509212','509213','509214','509215','509216','509217','509218','509219','509220','509221','509222','509223','509224','509225','509226','509227','509228','509229','509230','509231','509232','509233','509234','509235','509236','509237','509238','509239','509240','509241','509242','509243','509244','509245','509246','509247','509248','509249','509250','509251','509252','509253','509254','509255','509256','509257','509258','509259','509260','509261','509262','509263','509264','509265','509266','509267','509268','509269','509270','509271','509272','509273','509274','509275','509276','509277','509278','509279','509280','509281','509282','509283','509284','509285','509286','509287','509288','509289','509290','509291','509292','509293','509294','509295','509296','509297','509298','509299','509300','509301','509302','509303','509304','509305','509306','509307','509308','509309','509310','509311','509312','509313','509314','509315','509316','509317','509318','509319','509320','509321','509322','509323','509324','509325','509326','509327','509328','509329','509330','509331','509332','509333','509334','509335','509336','509337','509338','509339','509340','509341','509342','509343','509344','509345','509346','509347','509348','509349','509350','509351','509352','509353','509354','509355','509356','509357','509358','509359','509360','509361','509362','509363','509364','509365','509366','509367','509368','509369','509370','509371','509372','509373','509374','509375','509376','509377','509378','509379','509380','509381','509382','509383','509384','509385','509386','509387','509388','509389','509390','509391','509392','509393','509394','509395','509396','509397','509398','509399','509400','509401','509402','509403','509404','509405','509406','509407','509408','509409','509410','509411','509412','509413','509414','509415','509416','509417','509418','509419','509420','509421','509422','509423','509424','509425','509426','509427','509428','509429','509430','509431','509432','509433','509434','509435','509436','509437','509438','509439','509440','509441','509442','509443','509444','509445','509446','509447','509448','509449','509450','509451','509452','509453','509454','509455','509456','509457','509458','509459','509460','509461','509462','509463','509464','509465','509466','509467','509468','509469','509470','509471','509472','509473','509474','509475','509476','509477','509478','509479','509480','509481','509482','509483','509484','509485','509486','509487','509488','509489','509490','509491','509492','509493','509494','509495','509496','509497','509498','509499','509500','509501','509502','509503','509504','509505','509506','509507','509508','509509','509510','509511','509512','509513','509514','509515','509516','509517','509518','509519','509520','509521','509522','509523','509524','509525','509526','509527','509528','509529','509530','509531','509532','509533','509534','509535','509536','509537','509538','509539','509540','509541','509542','509543','509544','509545','509546','509547','509548','509549','509550','509551','509552','509553','509554','509555','509556','509557','509558','509559','509560','509561','509562','509563','509564','509565','509566','509567','509568','509569','509570','509571','509572','509573','509574','509575','509576','509577','509578','509579','509580','509581','509582','509583','509584','509585','509586','509587','509588','509589','509590','509591','509592','509593','509594','509595','509596','509597','509598','509599','509600','509601','509602','509603','509604','509605','509606','509607','509608','509609','509610','509611','509612','509613','509614','509615','509616','509617','509618','509619','509620','509621','509622','509623','509624','509625','509626','509627','509628','509629','509630','509631','509632','509633','509634','509635','509636','509637','509638','509639','509640','509641','509642','509643','509644','509645','509646','509647','509648','509649','509650','509651','509652','509653','509654','509655','509656','509657','509658','509659','509660','509661','509662','509663','509664','509665','509666','509667','509668','509669','509670','509671','509672','509673','509674','509675','509676','509677','509678','509679','509680','509681','509682','509683','509684','509685','509686','509687','509688','509689','509690','509691','509692','509693','509694','509695','509696','509697','509698','509699','509700','509701','509702','509703','509704','509705','509706','509707','509708','509709','509710','509711','509712','509713','509714','509715','509716','509717','509718','509719','509720','509721','509722','509723','509724','509725','509726','509727','509728','509729','509730','509731','509732','509733','509734','509735','509736','509737','509738','509739','509740','509741','509742','509743','509744','509745','509746','509747','509748','509749','509750','509751','509752','509753','509754','509755','509756','509757','509758','509759','509760','509761','509762','509763','509764','509765','509766','509767','509768','509769','509770','509771','509772','509773','509774','509775','509776','509777','509778','509779','509780','509781','509782','509783','509784','509785','509786','509787','509788','509789','509790','509791','509792','509793','509794','509795','509796','509797','509798','509799','509800','509801','509802','509803','509804','509805','509806','509807','509808','509809','509810','509811','509812','509813','509814','509815','509816','509817','509818','509819','509820','509821','509822','509823','509824','509825','509826','509827','509828','509829','509830','509831','509832','509833','509834','509835','509836','509837','509838','509839','509840','509841','509842','509843','509844','509845','509846','509847','509848','509849','509850','509851','509852','509853','509854','509855','509856','509857','509858','509859','509860','509861','509862','509863','509864','509865','509866','509867','509868','509869','509870','509871','509872','509873','509874','509875','509876','509877','509878','509879','509880','509881','509882','509883','509884','509885','509886','509887','509888','509889','509890','509891','509892','509893','509894','509895','509896','509897','509898','509899','509900','509901','509902','509903','509904','509905','509906','509907','509908','509909','509910','509911','509912','509913','509914','509915','509916','509917','509918','509919','509920','509921','509922','509923','509924','509925','509926','509927','509928','509929','509930','509931','509932','509933','509934','509935','509936','509937','509938','509939','509940','509941','509942','509943','509944','509945','509946','509947','509948','509949','509950','509951','509952','509953','509954','509955','509956','509957','509958','509959','509960','509961','509962','509963','509964','509965','509966','509967','509968','509969','509970','509971','509972','509973','509974','509975','509976','509977','509978','509979','509980','509981','509982','509983','509984','509985','509986','509987','509988','509989','509990','509991','509992','509993','509994','509995','509996','509997','509998','509999','627780','636297','636368','650031','650032','650033','650035','650036','650037','650038','650039','650040','650041','650042','650043','650044','650045','650046','650047','650048','650049','650050','650051','650405','650406','650407','650408','650409','650410','650411','650412','650413','650414','650415','650416','650417','650418','650419','650420','650421','650422','650423','650424','650425','650426','650427','650428','650429','650430','650431','650432','650433','650434','650435','650436','650437','650438','650439','650485','650486','650487','650488','650489','650490','650491','650492','650493','650494','650495','650496','650497','650498','650499','650500','650501','650502','650503','650504','650505','650506','650507','650508','650509','650510','650511','650512','650513','650514','650515','650516','650517','650518','650519','650520','650521','650522','650523','650524','650525','650526','650527','650528','650529','650530','650531','650532','650533','650534','650535','650536','650537','650538','650541','650542','650543','650544','650545','650546','650547','650548','650549','650550','650551','650552','650553','650554','650555','650556','650557','650558','650559','650560','650561','650562','650563','650564','650565','650566','650567','650568','650569','650570','650571','650572','650573','650574','650575','650576','650577','650578','650579','650580','650581','650582','650583','650584','650585','650586','650587','650588','650589','650590','650591','650592','650593','650594','650595','650596','650597','650598','650700','650701','650702','650703','650704','650705','650706','650707','650708','650709','650710','650711','650712','650713','650714','650715','650716','650717','650718','650720','650721','650722','650723','650724','650725','650726','650727','650901','650902','650903','650904','650905','650906','650907','650908','650909','650910','650911','650912','650913','650914','650915','650916','650917','650918','650919','650920','651652','651653','651654','651655','651656','651657','651658','651659','651660','651661','651662','651663','651664','651665','651666','651667','651668','651669','651670','651671','651672','651673','651674','651675','651676','651677','651678','651679','655000','655001','655002','655003','655004','655005','655006','655007','655008','655009','655010','655011','655012','655013','655014','655015','655016','655017','655018','655019','655021','655022','655023','655024','655025','655026','655027','655028','655029','655030','655031','655032','655033','655034','655035','655036','655037','655038','655039','655040','655041','655042','655043','655044','655045','655046','655047','655048','655049','655050','655051','655052','655053','655054','655055','655056','655057','655058']],
			['discover', ['6011', '622', '64', '65']],
			['hipercard', ['384100', '384140', '384160', '60']],
			['diners', ['301', '305', '36', '38']],
			['amex', ['34', '37']],
			['aura', ['50']],
			['jcb', ['35']],
			['visa', ['4']],
			['mastercard', ['5']]
		];

		for (var i = 0; i < cardStartRules.length; i++) {
			var cardStartRule = cardStartRules[i][1];
			for (var j = 0; j < cardStartRule.length; j++) {
				var start = cardStartRule[j];
				if (cardNumber.substring(0, start.length) == start) {
					return cardStartRules[i][0];
				}
			}
		}

		return "unknown";
	},
	isValidCardNumber: function(cardNumber) {
		if (!cardNumber) {
			return false;
		}

		cardNumber = cardNumber.replace(/[^0-9]/g, '');

		var luhnDigit = parseInt(cardNumber.substring(cardNumber.length-1, cardNumber.length));
		var luhnLess = cardNumber.substring(0, cardNumber.length-1);

		var sum = 0;

		for (i = 0; i < luhnLess.length; i++) {
			sum += parseInt(luhnLess.substring(i, i+1));
		}

		var delta = new Array (0,1,2,3,4,-4,-3,-2,-1,0);

		for (i = luhnLess.length - 1; i >= 0; i -= 2) {
			var deltaIndex = parseInt(luhnLess.substring(i, i+1));
			var deltaValue = delta[deltaIndex];
			sum += deltaValue;
		}

		var mod10 = sum % 10;
		mod10 = 10 - mod10;

		if (mod10 == 10) {
			mod10 = 0;
		}

		return (mod10 == parseInt(luhnDigit));
	},
	isValidExpirationMonth: function(expirationMonth) {
		if (!expirationMonth) {
			return false;
		}

		if (!isNumeric(expirationMonth)) {
			return false;
		}

		expirationMonth = parseInt(expirationMonth);

		if (expirationMonth <= 0 || expirationMonth > 12) {
			return false;
		}

		return true;
	},
	isValidExpirationYear: function(expirationYear) {
		if (!expirationYear) {
			return false;
		}

		if (!isNumeric(expirationYear)) {
			return false;
		}

		expirationYear = expirationYear.toString();

		if (expirationYear.length !== 2 && expirationYear.length !== 4) {
			return false;
		}

		return true;
	},
	isValidExpirationDate: function(cardDate) {
		cardDate = cardDate.replace('/', '');

		if (cardDate.length != 4) {
			return false;
		}

		var month = cardDate.substring(0, 2);
		var year = cardDate.substring(2, 4);
		var nowdate = new Date();
		var nowyear = nowdate.getFullYear()%1000;
		var nowmonth = nowdate.getMonth() + 1;

		if (!isNumeric(month) || !isNumeric(year)) {
			return false;
		}

		if  (year < nowyear || (year == nowyear && month < nowmonth)) {
			return false;
		}

		month = parseInt(month);
		return month <= 12 && month > 0;
	},
	isValidCvv: function(cvv, brand) {
		if (!cvv || !isNumeric(cvv)) {
			return false;
		}

		if (brand == 'amex' && cvv.length != 4) {
			return false;
		} else if (brand != 'amex' && cvv.length != 3) {
			return false;
		}

		return true;
	},
	isValidEmail: function(email) {
		var filter = /^([a-zA-Z0-9_\.\-\+])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/;
		return filter.test(email);
	},
	isValidCpf: function(cpfNumber) {
		cpfNumber = cpfNumber.replace(/[^0-9]+/g, '');

		if (cpfNumber.length != 11) {
			return false;
		}

		var sum = 0;
		var div;

		for (var i = 0; i < 9; i++) {
			sum += parseInt(cpfNumber.charAt(i)) * (10 - i);
		}

		div = (sum % 11 < 2) ? 0 : 11 - (sum % 11);

		if (div != parseInt(cpfNumber.charAt(9))) {
			return false;
		}

		sum = 0;

		for (var i = 0; i < 10; i++) {
			sum += parseInt(cpfNumber.charAt(i)) * (11 - i);
		}

		div = (sum % 11 < 2) ? 0 : 11 - (sum % 11);

		if (div != parseInt(cpfNumber.charAt(10))) {
			return false;
		}

		return true;
	},
	isValidCnpj: function(cnpjNumber) {
		cnpjNumber = cnpjNumber.replace(/[^0-9]+/g, '');

		if (cnpjNumber.length != 14) {
			return false;
		}

		var sum = 0;
		var div;
		var coef = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

		for (var i = 0; i < 12; i++) {
			sum += parseInt(cnpjNumber.charAt(i)) * coef[i];
		}

		div = (sum % 11 < 2) ? 0 : 11 - (sum % 11);

		if (div != parseInt(cnpjNumber.charAt(12))) {
			return false;
		}

		sum = 0;
		coef.unshift(6);

		for (var i = 0; i < 13; i++) {
			sum += parseInt(cnpjNumber.charAt(i)) * coef[i];
		}

		div = (sum % 11 < 2) ? 0 : 11 - (sum %11);

		if (div != parseInt(cnpjNumber.charAt(13))) {
			return false;
		}

		return true;
	},
	isValidDDD: function(ddd) {
		return isNumeric(ddd) && ddd.length == 2;
	},
	isValidPhoneNumber: function(number) {
		number = number.replace(/[^0-9]+/g, '');

		if (number.length != 8 && number.length != 9) {
			return false;
		}

		return true;
	},
	isValidZipCode: function(zipcode) {
		zipcode = zipcode.replace(/[^0-9]+/g, '');

		return zipcode.length == 8;
	}
};

// Helpers
var ieVersion = function () {
	var ua = window.navigator.userAgent;
	var msie = ua.indexOf("MSIE ");

	if ( msie > 0 )      // If Internet Explorer, return version number
		return parseInt(ua.substring(msie + 5, ua.indexOf(".", msie)));
	else                 // If another browser, return 0
		return 0;
};

var objectSize = function(obj) {
	var objectSize = 0;
	for (var key in obj) {
		if (obj.hasOwnProperty(key)) {
			objectSize++;
		}
	}
	return objectSize;
};

var jsonpRequest = function (url, callback) {
	var now = new Date();
	var functionName = 'pagarme_jsonp_' + now.getTime();

	global[functionName] = function(json) {
		if (json.status == 200) {
			callback(json.body);
		}

		try {
			delete global[functionName];
		} catch(e) {
			global[functionName] = undefined;
		}
	};

	if (url.indexOf('?') > -1) {
		url += '&callback=' + functionName;
	} else {
		url += '?callback=' + functionName;
	}

	var script = document.createElement('script');
	script.type = 'text/javascript';
	script.src = url;

	document.getElementsByTagName('head')[0].appendChild(script);
};

var ajaxRequest = function (url, callback) {
	var httpRequest,
	xmlDoc;

	if (window.XMLHttpRequest) {
		httpRequest = new XMLHttpRequest();
	} else {
		httpRequest = new ActiveXObject("Microsoft.XMLHTTP");
	}

	httpRequest.onreadystatechange = function () {
		if (httpRequest.readyState != 4) {
			return;
		}

		if (httpRequest.status != 200 && httpRequest.status != 304) {
			return;
		}
		callback(JSON.parse(httpRequest.responseText));
	};

	httpRequest.open("GET", url, true);
	httpRequest.send(null);
};

var request = function(params, callback) {
	var ie = ieVersion();
	var baseUrl = 'https://api.pagar.me/1';

	params.query = params.query || {};

	if (ie && ie <= 9) {
		var queryParams = {};

		for (var key in params.query) {
			queryParams['query[' + key + ']'] = params.query[key];
		}

		queryParams.method = 'get';
		queryParams.path = encodeURIComponent(params.path);
		queryParams.encryption_key = params.query.encryption_key;

		var url = baseUrl + '/jsonp' + queryString(queryParams);
		jsonpRequest(url, callback);
	} else {
		var url = baseUrl + params.path + queryString(params.query);
		ajaxRequest(url, callback);
	}
};

var queryString = function(obj) {
	if (!obj || !objectSize(obj)) {
		return '';
	}

	return '?' + paramsAsString(obj);
};

var paramsAsString = function(obj) {
	var parametersArray = [];
	for(var key in obj) {
		// Values should be on UTF-8
		parametersArray.push(key + "=" + unescape(encodeURIComponent(obj[key])));
	}

	return parametersArray.join("&");
};


// Credit card

PagarMe.CreditCard = function PagarMeCreditCard() {
	this.cardNumber = null;
	this.cardHolderName = null;
	this.cardExpirationMonth = null;
	this.cardExpirationYear = null;
	this.cardCVV = null;
};

PagarMe.CreditCard.prototype.brand = function() {
	if(!this.cardNumber) {
		return null;
	}

	var cardNumber = this.cardNumber.replace(/[^0-9]/g, '');

	var cardStartRules = [
		['elo', ['401178','401179','431274','438935','451416','457393','457631','457632','498405','498410','498411','498412','498418','498419','498420','498421','498422','498427','498428','498429','498432','498433','498472','498473','498487','498493','498494','498497','498498','504175','506699','506700','506701','506702','506703','506704','506705','506706','506707','506708','506709','506710','506711','506712','506713','506714','506715','506716','506717','506718','506719','506720','506721','506722','506723','506724','506725','506726','506727','506728','506729','506730','506731','506732','506733','506734','506735','506736','506737','506738','506739','506740','506741','506742','506743','506744','506745','506746','506747','506748','506749','506750','506751','506752','506753','506754','506755','506756','506757','506758','506759','506760','506761','506762','506763','506764','506765','506766','506767','506768','506769','506770','506771','506772','506773','506774','506775','506776','506777','506778','509000','509001','509002','509003','509004','509005','509006','509007','509008','509009','509010','509011','509012','509013','509014','509015','509016','509017','509018','509019','509020','509021','509022','509023','509024','509025','509026','509027','509028','509029','509030','509031','509032','509033','509034','509035','509036','509037','509038','509039','509040','509041','509042','509043','509044','509045','509046','509047','509048','509049','509050','509051','509052','509053','509054','509055','509056','509057','509058','509059','509060','509061','509062','509063','509064','509065','509066','509067','509068','509069','509070','509071','509072','509073','509074','509075','509076','509077','509078','509079','509080','509081','509082','509083','509084','509085','509086','509087','509088','509089','509090','509091','509092','509093','509094','509095','509096','509097','509098','509099','509100','509101','509102','509103','509104','509105','509106','509107','509108','509109','509110','509111','509112','509113','509114','509115','509116','509117','509118','509119','509120','509121','509122','509123','509124','509125','509126','509127','509128','509129','509130','509131','509132','509133','509134','509135','509136','509137','509138','509139','509140','509141','509142','509143','509144','509145','509146','509147','509148','509149','509150','509151','509152','509153','509154','509155','509156','509157','509158','509159','509160','509161','509162','509163','509164','509165','509166','509167','509168','509169','509170','509171','509172','509173','509174','509175','509176','509177','509178','509179','509180','509181','509182','509183','509184','509185','509186','509187','509188','509189','509190','509191','509192','509193','509194','509195','509196','509197','509198','509199','509200','509201','509202','509203','509204','509205','509206','509207','509208','509209','509210','509211','509212','509213','509214','509215','509216','509217','509218','509219','509220','509221','509222','509223','509224','509225','509226','509227','509228','509229','509230','509231','509232','509233','509234','509235','509236','509237','509238','509239','509240','509241','509242','509243','509244','509245','509246','509247','509248','509249','509250','509251','509252','509253','509254','509255','509256','509257','509258','509259','509260','509261','509262','509263','509264','509265','509266','509267','509268','509269','509270','509271','509272','509273','509274','509275','509276','509277','509278','509279','509280','509281','509282','509283','509284','509285','509286','509287','509288','509289','509290','509291','509292','509293','509294','509295','509296','509297','509298','509299','509300','509301','509302','509303','509304','509305','509306','509307','509308','509309','509310','509311','509312','509313','509314','509315','509316','509317','509318','509319','509320','509321','509322','509323','509324','509325','509326','509327','509328','509329','509330','509331','509332','509333','509334','509335','509336','509337','509338','509339','509340','509341','509342','509343','509344','509345','509346','509347','509348','509349','509350','509351','509352','509353','509354','509355','509356','509357','509358','509359','509360','509361','509362','509363','509364','509365','509366','509367','509368','509369','509370','509371','509372','509373','509374','509375','509376','509377','509378','509379','509380','509381','509382','509383','509384','509385','509386','509387','509388','509389','509390','509391','509392','509393','509394','509395','509396','509397','509398','509399','509400','509401','509402','509403','509404','509405','509406','509407','509408','509409','509410','509411','509412','509413','509414','509415','509416','509417','509418','509419','509420','509421','509422','509423','509424','509425','509426','509427','509428','509429','509430','509431','509432','509433','509434','509435','509436','509437','509438','509439','509440','509441','509442','509443','509444','509445','509446','509447','509448','509449','509450','509451','509452','509453','509454','509455','509456','509457','509458','509459','509460','509461','509462','509463','509464','509465','509466','509467','509468','509469','509470','509471','509472','509473','509474','509475','509476','509477','509478','509479','509480','509481','509482','509483','509484','509485','509486','509487','509488','509489','509490','509491','509492','509493','509494','509495','509496','509497','509498','509499','509500','509501','509502','509503','509504','509505','509506','509507','509508','509509','509510','509511','509512','509513','509514','509515','509516','509517','509518','509519','509520','509521','509522','509523','509524','509525','509526','509527','509528','509529','509530','509531','509532','509533','509534','509535','509536','509537','509538','509539','509540','509541','509542','509543','509544','509545','509546','509547','509548','509549','509550','509551','509552','509553','509554','509555','509556','509557','509558','509559','509560','509561','509562','509563','509564','509565','509566','509567','509568','509569','509570','509571','509572','509573','509574','509575','509576','509577','509578','509579','509580','509581','509582','509583','509584','509585','509586','509587','509588','509589','509590','509591','509592','509593','509594','509595','509596','509597','509598','509599','509600','509601','509602','509603','509604','509605','509606','509607','509608','509609','509610','509611','509612','509613','509614','509615','509616','509617','509618','509619','509620','509621','509622','509623','509624','509625','509626','509627','509628','509629','509630','509631','509632','509633','509634','509635','509636','509637','509638','509639','509640','509641','509642','509643','509644','509645','509646','509647','509648','509649','509650','509651','509652','509653','509654','509655','509656','509657','509658','509659','509660','509661','509662','509663','509664','509665','509666','509667','509668','509669','509670','509671','509672','509673','509674','509675','509676','509677','509678','509679','509680','509681','509682','509683','509684','509685','509686','509687','509688','509689','509690','509691','509692','509693','509694','509695','509696','509697','509698','509699','509700','509701','509702','509703','509704','509705','509706','509707','509708','509709','509710','509711','509712','509713','509714','509715','509716','509717','509718','509719','509720','509721','509722','509723','509724','509725','509726','509727','509728','509729','509730','509731','509732','509733','509734','509735','509736','509737','509738','509739','509740','509741','509742','509743','509744','509745','509746','509747','509748','509749','509750','509751','509752','509753','509754','509755','509756','509757','509758','509759','509760','509761','509762','509763','509764','509765','509766','509767','509768','509769','509770','509771','509772','509773','509774','509775','509776','509777','509778','509779','509780','509781','509782','509783','509784','509785','509786','509787','509788','509789','509790','509791','509792','509793','509794','509795','509796','509797','509798','509799','509800','509801','509802','509803','509804','509805','509806','509807','509808','509809','509810','509811','509812','509813','509814','509815','509816','509817','509818','509819','509820','509821','509822','509823','509824','509825','509826','509827','509828','509829','509830','509831','509832','509833','509834','509835','509836','509837','509838','509839','509840','509841','509842','509843','509844','509845','509846','509847','509848','509849','509850','509851','509852','509853','509854','509855','509856','509857','509858','509859','509860','509861','509862','509863','509864','509865','509866','509867','509868','509869','509870','509871','509872','509873','509874','509875','509876','509877','509878','509879','509880','509881','509882','509883','509884','509885','509886','509887','509888','509889','509890','509891','509892','509893','509894','509895','509896','509897','509898','509899','509900','509901','509902','509903','509904','509905','509906','509907','509908','509909','509910','509911','509912','509913','509914','509915','509916','509917','509918','509919','509920','509921','509922','509923','509924','509925','509926','509927','509928','509929','509930','509931','509932','509933','509934','509935','509936','509937','509938','509939','509940','509941','509942','509943','509944','509945','509946','509947','509948','509949','509950','509951','509952','509953','509954','509955','509956','509957','509958','509959','509960','509961','509962','509963','509964','509965','509966','509967','509968','509969','509970','509971','509972','509973','509974','509975','509976','509977','509978','509979','509980','509981','509982','509983','509984','509985','509986','509987','509988','509989','509990','509991','509992','509993','509994','509995','509996','509997','509998','509999','627780','636297','636368','650031','650032','650033','650035','650036','650037','650038','650039','650040','650041','650042','650043','650044','650045','650046','650047','650048','650049','650050','650051','650405','650406','650407','650408','650409','650410','650411','650412','650413','650414','650415','650416','650417','650418','650419','650420','650421','650422','650423','650424','650425','650426','650427','650428','650429','650430','650431','650432','650433','650434','650435','650436','650437','650438','650439','650485','650486','650487','650488','650489','650490','650491','650492','650493','650494','650495','650496','650497','650498','650499','650500','650501','650502','650503','650504','650505','650506','650507','650508','650509','650510','650511','650512','650513','650514','650515','650516','650517','650518','650519','650520','650521','650522','650523','650524','650525','650526','650527','650528','650529','650530','650531','650532','650533','650534','650535','650536','650537','650538','650541','650542','650543','650544','650545','650546','650547','650548','650549','650550','650551','650552','650553','650554','650555','650556','650557','650558','650559','650560','650561','650562','650563','650564','650565','650566','650567','650568','650569','650570','650571','650572','650573','650574','650575','650576','650577','650578','650579','650580','650581','650582','650583','650584','650585','650586','650587','650588','650589','650590','650591','650592','650593','650594','650595','650596','650597','650598','650700','650701','650702','650703','650704','650705','650706','650707','650708','650709','650710','650711','650712','650713','650714','650715','650716','650717','650718','650720','650721','650722','650723','650724','650725','650726','650727','650901','650902','650903','650904','650905','650906','650907','650908','650909','650910','650911','650912','650913','650914','650915','650916','650917','650918','650919','650920','651652','651653','651654','651655','651656','651657','651658','651659','651660','651661','651662','651663','651664','651665','651666','651667','651668','651669','651670','651671','651672','651673','651674','651675','651676','651677','651678','651679','655000','655001','655002','655003','655004','655005','655006','655007','655008','655009','655010','655011','655012','655013','655014','655015','655016','655017','655018','655019','655021','655022','655023','655024','655025','655026','655027','655028','655029','655030','655031','655032','655033','655034','655035','655036','655037','655038','655039','655040','655041','655042','655043','655044','655045','655046','655047','655048','655049','655050','655051','655052','655053','655054','655055','655056','655057','655058']],
		['discover', ['6011', '622', '64', '65']],
		['diners', ['301', '305', '36', '38']],
		['amex', ['34', '37']],
		['aura', ['50']],
		['jcb', ['35']],
		['hipercard', ['38', '60']],
		['visa', ['4']],
		['mastercard', ['5']]
	];

	for (var i = 0; i < cardStartRules.length; i++) {
		var cardStartRule = cardStartRules[i][1];
		for (var j = 0; j < cardStartRule.length; j++) {
			var start = cardStartRule[j];
			if (cardNumber.substring(0, start.length) == start) {
				return cardStartRules[i][0];
			}
		}
	}

	return 'unknown';
};

PagarMe.CreditCard.prototype.fieldErrors = function() {
	var errors = {};

	if (!PagarMe.Validator.isValidCardNumber(this.cardNumber)) {
		errors['card_number'] = 'Número do cartão inválido.';
	}

	if (!this.cardHolderName || this.cardHolderName.length == 0 || !isNaN(this.cardHolderName)) {
		errors['card_holder_name'] = 'Nome do portador inválido.';
	}

	if (!PagarMe.Validator.isValidExpirationMonth(this.cardExpirationMonth)) {
		errors['card_expiration_month'] = 'Mês de expiração inválido.';
	}

	if (!PagarMe.Validator.isValidExpirationYear(this.cardExpirationYear)) {
		errors['card_expiration_year'] = 'Ano de expiração inválido.';
	}

	if (!PagarMe.Validator.isValidCvv(this.cardCVV, this.brand())) {
		errors['card_cvv'] = 'Código de segurança inválido.';
	}

	return errors;
};

PagarMe.CreditCard.prototype.stringifyParameters_ = function() {
	var encryptionHash = {
		'card_number': this.cardNumber,
		'card_holder_name': this.cardHolderName,
		'card_expiration_date': "" + (this.cardExpirationMonth.length == 1 ? "0" : "") + this.cardExpirationMonth + ((this.cardExpirationYear.length > 2) ? this.cardExpirationYear.substr(-2) : this.cardExpirationYear),
		'card_cvv': this.cardCVV
	};

	if(PagarMe.sessionId) {
		encryptionHash['session_id'] = PagarMe.sessionId;
	}

	var parametersArray = [];
	for(var key in encryptionHash) {
		// Values should be on UTF-8
		parametersArray.push(key + "=" + unescape(encodeURIComponent(encryptionHash[key])));
	}

	return parametersArray.join("&");
};

PagarMe.CreditCard.prototype.generateHash = function(callback) {
	if (!PagarMe.encryption_key) {
		alert('Erro: Você não configurou sua encryption_key. Por favor, sete a chave em PagarMe.encryption_key. Para mais informações, visite: https://pagar.me/docs/restful-api/card-hash/');
		return;
	}

	if (PagarMe.encryption_key.substring(0, 2) == "ak") {
		alert("Erro: Você está usando a api_key ao invés da encryption_key. Por favor, verifique se a chave inserida é a encryption_key disponível em seu dashboard. Para mais informações, visite: https://pagar.me/docs/restful-api/card-hash/");
		return;
	}

	var stringifiedParameters = this.stringifyParameters_();

	request({
		path: '/transactions/card_hash_key',
		query: {
			encryption_key: encodeURIComponent(PagarMe.encryption_key)
		}
	}, function(data) {
		var crypt = new JSEncrypt();
		crypt.setPublicKey(data['public_key']);
		var encryptedString = data.id + "_" + crypt.encrypt(stringifiedParameters);

		callback(encryptedString);
	});
};

PagarMe.creditCard = PagarMe.CreditCard;
PagarMe.creditCard.prototype = PagarMe.CreditCard.prototype;

})(PagarMe, window);

/**
 * jquery.mask.js
 * @version: v1.6.4
 * @author: Igor Escobar
 *
 * Created by Igor Escobar on 2012-03-10. Please report any bug at http://blog.igorescobar.com
 *
 * Copyright (c) 2012 Igor Escobar http://blog.igorescobar.com
 *
 * The MIT License (http://www.opensource.org/licenses/mit-license.php)
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without
 * restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following
 * conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 * OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 * OTHER DEALINGS IN THE SOFTWARE.
 */
/*jshint laxbreak: true */
/* global define */

// UMD (Universal Module Definition) patterns for JavaScript modules that work everywhere.
// https://github.com/umdjs/umd/blob/master/jqueryPlugin.js
(function (factory) {
    if (typeof define === "function" && define.amd) {
        // AMD. Register as an anonymous module.
        define(["jquery"], factory);
    } else {
        // Browser globals
        factory(window.jQuery || window.Zepto);
    }
}(function ($) {
    "use strict";
    var Mask = function (el, mask, options) {
        var jMask = this, old_value;
        el = $(el);

        mask = typeof mask === "function" ? mask(el.val(), undefined, el,  options) : mask;

        jMask.init = function() {
            options = options || {};

            jMask.byPassKeys = [9, 16, 17, 18, 36, 37, 38, 39, 40, 91];
            jMask.translation = {
                '0': {pattern: /\d/},
                '9': {pattern: /\d/, optional: true},
                '#': {pattern: /\d/, recursive: true},
                'A': {pattern: /[a-zA-Z0-9]/},
                'S': {pattern: /[a-zA-Z]/}
            };

            jMask.translation = $.extend({}, jMask.translation, options.translation);
            jMask = $.extend(true, {}, jMask, options);

            el.each(function() {
                if (options.maxlength !== false) {
                    el.attr('maxlength', mask.length);
                }

                if (options.placeholder) {
                    el.attr('placeholder' , options.placeholder);
                }
                
                el.attr('autocomplete', 'off');
                p.destroyEvents();
                p.events();
                
                var caret = p.getCaret();

                p.val(p.getMasked());
                p.setCaret(caret + p.getMaskCharactersBeforeCount(caret, true));
            });
        };

        var p = {
            getCaret: function () {
                var sel,
                    pos = 0,
                    ctrl = el.get(0),
                    dSel = document.selection,
                    cSelStart = ctrl.selectionStart;

                // IE Support
                if (dSel && !~navigator.appVersion.indexOf("MSIE 10")) {
                    sel = dSel.createRange();
                    sel.moveStart('character', el.is("input") ? -el.val().length : -el.text().length);
                    pos = sel.text.length;
                }
                // Firefox support
                else if (cSelStart || cSelStart === '0') {
                    pos = cSelStart;
                }
                
                return pos;
            },
            setCaret: function(pos) {
                if (el.is(":focus")) {
                    var range, ctrl = el.get(0);

                    if (ctrl.setSelectionRange) {
                        ctrl.setSelectionRange(pos,pos);
                    } else if (ctrl.createTextRange) {
                        range = ctrl.createTextRange();
                        range.collapse(true);
                        range.moveEnd('character', pos);
                        range.moveStart('character', pos);
                        range.select();
                    }
                }
            },
            events: function() {
                el.on('keydown.mask', function() {
                    old_value = p.val();
                });
                el.on('keyup.mask', p.behaviour);
                el.on("paste.mask drop.mask", function() {
                    setTimeout(function() {
                        el.keydown().keyup();
                    }, 100);
                });
                el.on("change.mask", function() {
                    el.data("changeCalled", true);
                });
                el.on("blur.mask", function(e){
                    var el = $(e.target);
                    if (el.prop("defaultValue") !== el.val()) {
                        el.prop("defaultValue", el.val());
                        if (!el.data("changeCalled")) {
                            el.trigger("change");
                        }
                    }
                    el.data("changeCalled", false);
                });

                // clear the value if it not complete the mask
                el.on("focusout.mask", function() {
                    if (options.clearIfNotMatch && p.val().length < mask.length) {
                       p.val('');
                   }
                });
            },
            destroyEvents: function() {
                el.off('keydown.mask keyup.mask paste.mask drop.mask change.mask blur.mask focusout.mask').removeData("changeCalled");
            },
            val: function(v) {
                var isInput = el.is('input');
                return arguments.length > 0 
                    ? (isInput ? el.val(v) : el.text(v)) 
                    : (isInput ? el.val() : el.text());
            },
            getMaskCharactersBeforeCount: function(index, onCleanVal) {
                for (var count = 0, i = 0, maskL = mask.length; i < maskL && i < index; i++) {
                    if (!jMask.translation[mask.charAt(i)]) {
                        index = onCleanVal ? index + 1 : index;
                        count++;
                    }
                }
                return count;
            },
            determineCaretPos: function (originalCaretPos, oldLength, newLength, maskDif) {
                var translation = jMask.translation[mask.charAt(Math.min(originalCaretPos - 1, mask.length - 1))];

                return !translation ? p.determineCaretPos(originalCaretPos + 1, oldLength, newLength, maskDif)
                                    : Math.min(originalCaretPos + newLength - oldLength - maskDif, newLength);
            },
            behaviour: function(e) {
                e = e || window.event;
                var keyCode = e.keyCode || e.which;

                if ($.inArray(keyCode, jMask.byPassKeys) === -1) {

                    var caretPos = p.getCaret(),
                        currVal = p.val(),
                        currValL = currVal.length,
                        changeCaret = caretPos < currValL,
                        newVal = p.getMasked(),
                        newValL = newVal.length,
                        maskDif = p.getMaskCharactersBeforeCount(newValL - 1) - p.getMaskCharactersBeforeCount(currValL - 1);
                   
                    if (newVal !== currVal) {
                        p.val(newVal);
                    }

                    // change caret but avoid CTRL+A
                    if (changeCaret && !(keyCode === 65 && e.ctrlKey)) {
                        // Avoid adjusting caret on backspace or delete
                        if (!(keyCode === 8 || keyCode === 46)) {
                            caretPos = p.determineCaretPos(caretPos, currValL, newValL, maskDif);
                        }
                        p.setCaret(caretPos);
                    }

                    return p.callbacks(e);
                }
            },
            getMasked: function (skipMaskChars) {
                var buf = [],
                    value = p.val(),
                    m = 0, maskLen = mask.length,
                    v = 0, valLen = value.length,
                    offset = 1, addMethod = "push",
                    resetPos = -1,
                    lastMaskChar,
                    check;

                if (options.reverse) {
                    addMethod = "unshift";
                    offset = -1;
                    lastMaskChar = 0;
                    m = maskLen - 1;
                    v = valLen - 1;
                    check = function () {
                        return m > -1 && v > -1;
                    };
                } else {
                    lastMaskChar = maskLen - 1;
                    check = function () {
                        return m < maskLen && v < valLen;
                    };
                }

                while (check()) {
                    var maskDigit = mask.charAt(m),
                        valDigit = value.charAt(v),
                        translation = jMask.translation[maskDigit];

                    if (translation) {
                        if (valDigit.match(translation.pattern)) {
                            buf[addMethod](valDigit);
                             if (translation.recursive) {
                                if (resetPos === -1) {
                                    resetPos = m;
                                } else if (m === lastMaskChar) {
                                    m = resetPos - offset;
                                }

                                if (lastMaskChar === resetPos) {
                                    m -= offset;
                                }
                            }
                            m += offset;
                        } else if (translation.optional) {
                            m += offset;
                            v -= offset;
                        }
                        v += offset;
                    } else {
                        if (!skipMaskChars) {
                            buf[addMethod](maskDigit);
                        }
                        
                        if (valDigit === maskDigit) {
                            v += offset;
                        }

                        m += offset;
                    }
                }
                
                var lastMaskCharDigit = mask.charAt(lastMaskChar);
                if (maskLen === valLen + 1 && !jMask.translation[lastMaskCharDigit]) {
                    buf.push(lastMaskCharDigit);
                }
                
                return buf.join("");
            },
            callbacks: function (e) {
                var val = p.val(),
                    changed = p.val() !== old_value;
                if (changed === true) {
                    if (typeof options.onChange === "function") {
                        options.onChange(val, e, el, options);
                    }
                }

                if (changed === true && typeof options.onKeyPress === "function") {
                    options.onKeyPress(val, e, el, options);
                }

                if (typeof options.onComplete === "function" && val.length === mask.length) {
                    options.onComplete(val, e, el, options);
                }
            }
        };

        // public methods
        jMask.remove = function() {
            var caret = p.getCaret(),
                maskedCharacterCountBefore = p.getMaskCharactersBeforeCount(caret);

            p.destroyEvents();
            p.val(jMask.getCleanVal()).removeAttr('maxlength');
            p.setCaret(caret - maskedCharacterCountBefore);
        };

        // get value without mask
        jMask.getCleanVal = function() {
           return p.getMasked(true);
        };

        jMask.init();
    };

    $.fn.mask = function(mask, options) {
        this.unmask();
        return this.each(function() {
            $(this).data('mask', new Mask(this, mask, options));
        });
    };

    $.fn.unmask = function() {
        return this.each(function() {
            try {
                $(this).data('mask').remove();
            } catch (e) {}
        });
    };

    $.fn.cleanVal = function() {
        return $(this).data('mask').getCleanVal();
    };

    // looking for inputs with data-mask attribute
    $('*[data-mask]').each(function() {
        var input = $(this),
            options = {},
            prefix = "data-mask-";

        if (input.attr(prefix + 'reverse') === 'true') {
            options.reverse = true;
        }

        if (input.attr(prefix + 'maxlength') === 'false') {
            options.maxlength = false;
        }

        if (input.attr(prefix + 'clearifnotmatch') === 'true') {
            options.clearIfNotMatch = true;
        }

        input.mask(input.attr('data-mask'), options);
    });

}));
$(document).ready(function() {
	var bridge;
	var injectedVariables;
	var formData = {};
	var acceptedBrands = ['elo', 'discover', 'diners', 'amex', 'aura', 'jcb', 'hipercard', 'mastercard', 'visa'];
	var cardContainer;

	var lastZipcode = '';
	var validZipcode;

	var cvvMask = '000';
	var cardBrand;

	var openSessions = {};

	// Needs to be here so it can change the mask on blur
	var currentMask;

	var historyShouldReload;
	var supportsHistoryApi = function() {
		return !!(window.history && history.pushState) && !isFireFox();
	};

	var sendAnalytics = window.ga || (function(){});

	var pushStepState = function(step) {
		if (supportsHistoryApi()) {
			var stepHistoryObj = {
				step: step
			};

			history.pushState(stepHistoryObj, '');

			openSessions[injectedVariables.scriptId].stepsHistory = openSessions[injectedVariables.scriptId].stepsHistory || {};
			openSessions[injectedVariables.scriptId].stepsHistory.pointer = openSessions[injectedVariables.scriptId].stepsHistory.pointer || 0;
			openSessions[injectedVariables.scriptId].stepsHistory.array = openSessions[injectedVariables.scriptId].stepsHistory.array || [];

			var stepsHistory = openSessions[injectedVariables.scriptId].stepsHistory;

			if (stepsHistory.pointer < stepsHistory.array.length) {
				stepsHistory.array.splice(stepsHistory.pointer);
			}

			stepsHistory.pointer = step;
			stepsHistory.array.push(stepHistoryObj);
		}
	};

	var goToStep = function(step) {
		var stepsManager = openSessions[injectedVariables.scriptId].stepsManager;
		var currentStep = stepsManager.currentStep();

		if (supportsHistoryApi()) {
			if (step > currentStep) {
				stepsManager.goToStep(step);
				pushStepState(stepsManager.currentStep());
			} else {
				history.go(step-currentStep);
			}
		} else {
			stepsManager.goToStep(step);
		}
	};

	var clearHistory = function() {
		if (supportsHistoryApi()) {
			historyShouldReload = false;
			var stepsHistory = openSessions[injectedVariables.scriptId].stepsHistory;
			history.go(-stepsHistory.pointer);
		}
	};

	var reloadHistory = function() {
		if (supportsHistoryApi()) {
			historyShouldReload = true;
			var stepsHistory = openSessions[injectedVariables.scriptId].stepsHistory;

			for (var i = 0; i < stepsHistory.array.length; i++) {
				history.pushState(stepsHistory.array[i], '');
			}

			if (stepsHistory.pointer < stepsHistory.array.length) {
				history.go(stepsHistory.pointer - stepsHistory.array.length);
			}
		}
	};

	$(window).bind('popstate', function(e) {
		if (!historyShouldReload) {
			return;
		}

		openSessions[injectedVariables.scriptId].stepsHistory.pointer = e.originalEvent.state.step;
		openSessions[injectedVariables.scriptId].stepsManager.goToStep(e.originalEvent.state.step);
	});

	var shadeColor2 = function(color, percent) {
		var f=parseInt(color.slice(1),16),t=percent<0?0:255,p=percent<0?percent*-1:percent,R=f>>16,G=f>>8&0x00FF,B=f&0x0000FF;
		return "#"+(0x1000000+(Math.round((t-R)*p)+R)*0x10000+(Math.round((t-G)*p)+G)*0x100+(Math.round((t-B)*p)+B)).toString(16).slice(1);
	};

	var shadeRGBColor = function(color, percent) {
		var f=color.split(","),t=percent<0?0:255,p=percent<0?percent*-1:percent,R=parseInt(f[0].slice(4)),G=parseInt(f[1]),B=parseInt(f[2]);
		return "rgb("+(Math.round((t-R)*p)+R)+","+(Math.round((t-G)*p)+G)+","+(Math.round((t-B)*p)+B)+")";
	};

	var shade = function(color, percent){
		if (color.length > 7 ) return shadeRGBColor(color,percent);
		else return shadeColor2(color,percent);
	};

	var amountToCurrency = function(amount, thousandSeparator, decimalSeparator) {
		thousandSeparator = thousandSeparator || '.';
		decimalSeparator = decimalSeparator || ',';

		var amount = amount.toString();
		var moneyString = '';

		var moneyString = amount.substr(amount.length-2, 2);
		if (moneyString.length == 1) {
			moneyString = '0' + moneyString;
		}

		moneyString = decimalSeparator + moneyString;
		amount = amount.substr(0, amount.length-2);

		if (amount.length) {
			var integerParts = [];
			var mostSignificantPartSize = amount.length % 3;

			if (mostSignificantPartSize) {
				integerParts.push(amount.substr(0, mostSignificantPartSize));
			}

			for (var i = mostSignificantPartSize; i < amount.length; i += 3) {
				integerParts.push(amount.substr(i, 3));
			}

			moneyString = integerParts.join(thousandSeparator) + moneyString;
		} else {
			moneyString = '0' + moneyString;
		}
		return moneyString;
	};

	var inputAnimations = [];
	var animatingInput = false;
	var animateInput = function() {
		var timeout = 70;

		if (animatingInput || !inputAnimations.length) {
			return;
		}

		var animation = inputAnimations.shift();

		animatingInput = true;
		animation();

		setTimeout(function() {
			animatingInput = false;
			animateInput();
		}, timeout);
	};

	var queueInputAnimation = function(animation) {
		inputAnimations.push(animation);
		animateInput();
	};

	var displayInputError = function(el) {
		queueInputAnimation(function() {
			$(el)
			.parents('.pagarme-checkout-input-container')
			.removeClass('pagarme-success')
			.addClass('pagarme-error');
		});
	};

	var displayInputSuccess = function(el) {
		queueInputAnimation(function() {
			$(el)
			.parents('.pagarme-checkout-input-container')
			.removeClass('pagarme-error')
			.addClass('pagarme-success');
		});
	};

	var clearInputValidation = function(el, type) {
		var element = $(el).parents('.pagarme-checkout-input-container');

		if (!type || type == 'error') {
			element.removeClass('pagarme-error');
		}

		if (!type || type == 'success') {
			element.removeClass('pagarme-success');
		}
	};

	var clearCardData = function() {
		var ccNumberField = $('input[name="pagarme-credit-card-number"]');
		var ccExpirationField = $('input[name="pagarme-credit-card-expiration"]');
		var ccNameField = $('input[name="pagarme-credit-card-name"]');
		var ccCvvField = $('input[name="pagarme-credit-card-cvv"]');
		var ccInstallmentsField = $('select[name="pagarme-installments"]');

		clearInputValidation(ccNumberField.val(''));
		clearInputValidation(ccExpirationField.val(''));
		clearInputValidation(ccNameField.val(''));
		clearInputValidation(ccCvvField.val(''));
		clearInputValidation(ccInstallmentsField);

		cardContainer.clear();
	};

	var focusOnFirstBlank = function(parent) {
		if (isMobile()) { return }

		parent.find('input').filter(function() {
			return !this.value;
		}).first().focus();
	};

	var validateBlank = function(val) {
		return val;
	};

	var getInputErrors = function(input) {
		var input = $(input);
		var inputName = input.attr('name');
		var val = input.val();

		var field = fields[inputName];

		if (!field || !field.validation) {
			return [];
		}

		var errors = [];

		for (var i = 0; i < field.validation.length; i++) {
			var validationObj = field.validation[i];

			if (!validationObj.validate(val)) {
				errors.push(validationObj.message);
			}
		}

		return errors;
	};

	var getInputsInStep = function(step) {
		if (step.inputs) {
			return step.inputs;
		}

		var f = [];

		$(step.selector).find('input[name], select[name]').each(function() {
			var input = $(this);
			var name = input.attr('name');

			if (fields[name]) {
				f.push(input);
			}
		});

		step.inputs = f;
		return f;
	};

	var validateStep = function(step) {
		var stepValidated = true;
		var includedFields = getInputsInStep(step);

		for (var i = 0; i < includedFields.length; i++) {
			var field = includedFields[i];
			var errors = getInputErrors(field);

			if (errors.length && !field.hasClass('novalidate')) {
				stepValidated = false;
				displayInputError(field);
			}
		}

		return stepValidated;
	};

	var stepWillChange = function(step) {
		var includedInputs = getInputsInStep(step);

		for (var i = 0; i < includedInputs.length; i++) {
			var input = includedInputs[i];
			var field = fields[input.attr('name')];

			var val = field.processVal ? field.processVal(input.val()) : input.val();

			if((input.attr('name') != 'pagarme-installments' && injectedVariables.defaultInstallment) || (!injectedVariables.defaultInstallment)) {
				setValueForPath(formData, field.metadata.name, val);
			}
		}
	};

	var cpfMaskOptions = {
		translation: {
			x: { pattern: /[0-9\.]/ }
		},
		onChange: (function() {
			var cnpjMask = '00.000.000/0000-00';
			var cpfMask = '000.000.000-000';
			var changedFromLength = false;

			var applyMask = function(element, options) {
				element.mask(currentMask, options);
			};

			return function(documentNumber, event, element, options) {
                documentNumber = documentNumber.replace(/[^0-9]/g, '')
                if(documentNumber.length <= 11){
                    currentMask = cpfMask;
                    applyMask(element, options);
                }
                else{
                    currentMask = cnpjMask;
                    applyMask(element, options);
                }
			};
		})()
	};

	var loadAddressFromZipcode = function() {
		var zipcodeInput = $('input[name="pagarme-customer-address-zipcode"]');
		var zipcodeVal = zipcodeInput.val();

		if (zipcodeVal !== lastZipcode) {
			validZipcode = null;
		}

		var errors = getInputErrors(zipcodeInput);

		if (!errors.length && zipcodeVal !== lastZipcode) {
			var zip = zipcodeInput.val().replace(/[^0-9]/g, '');

			var stateInput = $('input[name="pagarme-customer-address-state"]');
			var cityInput = $('input[name="pagarme-customer-address-city"]');
			var neighborhoodInput = $('input[name="pagarme-customer-address-neighborhood"]');
			var streetInput = $('input[name="pagarme-customer-address-street"]');
			var numberInput = $('input[name="pagarme-customer-address-number"]');

			//Get values from data-customer before they get flushed
			var dataState = stateInput.val();
			var dataCity = cityInput.val();
			var dataNeighborhood = neighborhoodInput.val();
			var dataStreet = streetInput.val();

			zipcodeInput.parent('.pagarme-checkout-input-container').addClass('pagarme-loading');

			clearInputValidation(stateInput);
			clearInputValidation(cityInput);
			clearInputValidation(neighborhoodInput);
			clearInputValidation(streetInput);
			clearInputValidation(numberInput);

			stateInput.val('').prop('readonly', true).parent('.pagarme-checkout-input-container').addClass('readonly');
			cityInput.val('').prop('readonly', true).parent('.pagarme-checkout-input-container').addClass('readonly');
			neighborhoodInput.val('').prop('readonly', true).parent('.pagarme-checkout-input-container').addClass('readonly');
			streetInput.val('').prop('readonly', true).parent('.pagarme-checkout-input-container').addClass('readonly');

			var validZipcode = function(data) {
				validZipcode = true;

				zipcodeInput.parent('.pagarme-checkout-input-container').removeClass('pagarme-loading');
				displayInputSuccess(zipcodeInput);

				if (data.street) {
					streetInput.val(data.street);
					displayInputSuccess(streetInput);

					if (!isMobile()) {
						numberInput.focus();
					}
				} else if(dataStreet) {
					streetInput.val(dataStreet);
					if(getInputErrors(streetInput).length === 0){
						displayInputSuccess(streetInput);
					}else{
						displayInputError(streetInput);
					}

					if (!isMobile()) {
						numberInput.focus();
					}
				}else{
					if (!isMobile()) {
						streetInput.focus();
					}
					streetInput.prop('readonly', false).parent('.pagarme-checkout-input-container').removeClass('readonly');
					clearInputValidation(streetInput);
				}

				if (data.neighborhood) {
					neighborhoodInput.val(data.neighborhood);
					displayInputSuccess(neighborhoodInput);
				} else if(dataNeighborhood) {
					neighborhoodInput.val(dataNeighborhood);
					if(getInputErrors(neighborhoodInput).length === 0){
						displayInputSuccess(neighborhoodInput);
					}else{
						displayInputError(neighborhoodInput);
					}
				}else{
					neighborhoodInput.prop('readonly', false).parent('.pagarme-checkout-input-container').removeClass('readonly');
					clearInputValidation(neighborhoodInput);
				}

				if (data.city) {
					cityInput.val(data.city);
					displayInputSuccess(cityInput);
				} else if(dataCity) {
					cityInput.val(dataCity);
					if(getInputErrors(cityInput).length === 0){
						displayInputSuccess(cityInput);
					}else{
						displayInputError(cityInput);
					}
				}else{
					cityInput.prop('readonly', false).parent('.pagarme-checkout-input-container').removeClass('readonly');
					clearInputValidation(cityInput);
				}

				if (data.state) {
					stateInput.val(data.state);
					displayInputSuccess(stateInput);
				} else if(dataState) {
					stateInput.val(dataState);
					if(getInputErrors(stateInput).length === 0){
						displayInputSuccess(stateInput);
					}else{
						displayInputError(stateInput);
					}
				}else{
					stateInput.prop('readonly', false).parent('.pagarme-checkout-input-container').removeClass('readonly');
					clearInputValidation(stateInput);
				}
			};

			var wrongZipcode = function() {
				validZipcode = false;

				zipcodeInput.parent('.pagarme-checkout-input-container').removeClass('pagarme-loading');
				if (!isMobile()) {
					zipcodeInput.focus();
				}
				displayInputError(zipcodeInput);

				stateInput.val('').prop('readonly', false).parent('.pagarme-checkout-input-container').removeClass('readonly');
				cityInput.val('').prop('readonly', false).parent('.pagarme-checkout-input-container').removeClass('readonly');
				neighborhoodInput.val('').prop('readonly', false).parent('.pagarme-checkout-input-container').removeClass('readonly');
				streetInput.val('').prop('readonly', false).parent('.pagarme-checkout-input-container').removeClass('readonly');

				clearInputValidation(stateInput);
				clearInputValidation(cityInput);
				clearInputValidation(neighborhoodInput);
				clearInputValidation(streetInput);
			};

			$.get('https://api.pagar.me/1/jsonp?live=1&method=get&path=%2Fzipcodes%2F' + zip, function(data) {
				if (data.status === 200) {
					validZipcode(data.body);
				} else {
					wrongZipcode();
				}
			}, 'jsonp');
		}

		lastZipcode = zipcodeVal;
	};

  var createTransaction = function() {
		var body = [];

		if (formData.payment_method == 'credit_card') {
			body.push('body[payment_method]=credit_card');
			body.push('body[card_hash]=' + encodeURIComponent(formData.card_hash));

			if (formData.installments) {
				body.push('body[installments]=' + formData.installments);
			}
		} else {
			body.push('body[payment_method]=boleto');
		}

		if (formData.amount && (!injectedVariables.boletoInstallment || (injectedVariables.boletoInstallment && formData.payment_method == 'credit_card'))) {
			body.push('body[amount]=' + formData.amount);
		}

		if (injectedVariables.postbackUrl) {
			body.push('body[postback_url]=' + encodeURIComponent(injectedVariables.postbackUrl));
		}

		if(injectedVariables.metadataDiscountAmount !== undefined && (!injectedVariables.boletoInstallment || (injectedVariables.boletoInstallment && formData.payment_method == 'credit_card'))) {
			body.push('body[metadata][discount_amount]=' + injectedVariables.metadataDiscountAmount);
		}

		// temporary
		if(injectedVariables.metadataGrossAmount !== undefined) {
			body.push('body[metadata][gross_amount]=' + injectedVariables.metadataGrossAmount);
		}

		if(injectedVariables.tracking && injectedVariables.boletoInstallment) {
			body.push('body[metadata][tracking]=' + encodeURIComponent(injectedVariables.tracking));
		}

    if (injectedVariables.boletoExpirationDate && formData.payment_method == 'boleto' && !injectedVariables.boletoInstallment) {
			body.push('body[boleto_expiration_date]=' + encodeURIComponent(injectedVariables.boletoExpirationDate));
    }

    if (injectedVariables.orderId) {
      body.push('body[order_id]=' + encodeURIComponent(injectedVariables.orderId));
    }

		if (formData.customer) {
			if (formData.customer.name) {
				body.push('body[customer][name]=' + encodeURIComponent(formData.customer.name));
			}

			if (formData.customer.document_number) {
				body.push('body[customer][document_number]=' + encodeURIComponent(formData.customer.document_number));
			}

			if (formData.customer.email) {
				body.push('body[customer][email]=' + encodeURIComponent(formData.customer.email));
			}

			if (formData.customer.address) {
				if (formData.customer.address.street) {
					body.push('body[customer][address][street]=' + encodeURIComponent(formData.customer.address.street));
				}

				if (formData.customer.address.street_number) {
					body.push('body[customer][address][street_number]=' + encodeURIComponent(formData.customer.address.street_number));
				}

				if (formData.customer.address.complementary) {
					body.push('body[customer][address][complementary]=' + encodeURIComponent(formData.customer.address.complementary));
				}

				if (formData.customer.address.neighborhood) {
					body.push('body[customer][address][neighborhood]=' + encodeURIComponent(formData.customer.address.neighborhood));
				}

				if (formData.customer.address.zipcode) {
					body.push('body[customer][address][zipcode]=' + encodeURIComponent(formData.customer.address.zipcode));
				}
			}

			if (formData.customer.phone) {
				body.push('body[customer][phone][ddd]=' + encodeURIComponent(formData.customer.phone.ddd));
				body.push('body[customer][phone][number]=' + encodeURIComponent(formData.customer.phone.number));
			}
		}

		body.push('body[encryption_key]=' + injectedVariables.encryptionKey);
		body.push('encryption_key=' + injectedVariables.encryptionKey);

		if(injectedVariables.boletoInstallment && formData.payment_method == 'boleto') {
			var calculateBoletoInstallments = function(amount, maxInstallments, firstInstallment) {
				var amounts = {};
				var restAmount = firstInstallment ? amount - firstInstallment : amount;
				var boletoDiscount = injectedVariables.boletoDiscount ? parseInt(injectedVariables.boletoDiscount) : 0;

				for(var i = 1; i <= maxInstallments; i++) {
					var sum = 0;
					amounts[i] = {};

					for(var j = 1; j <= i; j++) {
						if(i == 1 && j == 1) {
							amounts[i][j] = (parseInt(amount, 10) - boletoDiscount).toString();
						} else if(firstInstallment) {
							if(j == 1) {
								amounts[i][j] = firstInstallment;
							} else {
								amounts[i][j] = Math.floor(restAmount/(i-1)).toString();
							}
						} else {
							amounts[i][j] = Math.floor(restAmount/i).toString();
						}

						sum += parseInt(amounts[i][j], 10);
					}

					amounts[i][1] = parseInt(amounts[i][1], 10) + parseInt(amount - (sum + boletoDiscount), 10);

					if(i != 1) {
						amounts[i][1] = amounts[i][1] + boletoDiscount;
					}

					amounts[i][1] = amounts[i][1].toString();
				}

				return amounts;
			};

			var url = 'https://api.pagar.me/1/jsonp?method=post&path=%2Ftransactions&';
			var boletoMaxInstallments = parseInt(injectedVariables.boletoMaxInstallments) || 5;
			var boletoInstallments = calculateBoletoInstallments(formData.amount, boletoMaxInstallments, injectedVariables.boletoFirstInstallmentAmount);
			var bodies = {};
			var today = new Date();
			var discountSum = 0;
			var totalDiscount = injectedVariables.metadataDiscountAmount !== undefined ? injectedVariables.metadataDiscountAmount : 0;
			totalDiscount = injectedVariables.boletoDiscount && formData.boletoInstallment == 1 ? parseInt(totalDiscount, 10) + parseInt(injectedVariables.boletoDiscount, 10) : totalDiscount;

			body.push('body[metadata][total_amount]=' + encodeURIComponent(formData.amount));
			body.push('body[metadata][total_installments]=' + encodeURIComponent(formData.boletoInstallment));

			for(var i = formData.boletoInstallment; i >= 1; i--) {
				var request = JSON.parse(JSON.stringify(body));
				var expirationDate = new Date();
				var discountAmount = injectedVariables.metadataDiscountAmount !== undefined ? Math.floor((boletoInstallments[formData.boletoInstallment][i] * injectedVariables.metadataDiscountAmount)/formData.amount) : 0;
				discountSum += parseInt(discountAmount, 10);

				request.push('body[metadata][installment]=' + encodeURIComponent(i));
				request.push('body[metadata][installment_amount]=' + encodeURIComponent(boletoInstallments[formData.boletoInstallment][i]));
				request.push('body[amount]=' + boletoInstallments[formData.boletoInstallment][i]);
				request.push('body[metadata][total_discount]=' + totalDiscount);


				if(i == 1) {
					if(injectedVariables.boletoExpirationDate) {
						request.push('body[boleto_expiration_date]=' + encodeURIComponent(injectedVariables.boletoExpirationDate));
					} else {
						expirationDate = expirationDate.setDate(expirationDate.getDate() + (7 + (i-1) * 30));
						request.push('body[boleto_expiration_date]=' + encodeURIComponent(expirationDate));
					}

					discountSum = parseInt(injectedVariables.metadataDiscountAmount, 10) - discountSum;
					discountAmount  = formData.boletoInstallment > 1 ? parseInt(discountAmount, 10) + discountSum : parseInt(discountAmount, 10) + discountSum + injectedVariables.boletoDiscount;
					request.push('body[metadata][discount_amount]=' + encodeURIComponent(discountAmount));
				} else {
					expirationDate = expirationDate.setDate(expirationDate.getDate() + (7 + (i-1) * 30));
					request.push('body[boleto_expiration_date]=' + encodeURIComponent(expirationDate));
					request.push('body[metadata][discount_amount]=' + encodeURIComponent(discountAmount));
				}

				bodies[i] = request;
			}

			var totalBoletos = formData.boletoInstallment;
			var currentBoleto = 1;
			var tokens = [];

			var createBoleto = function(params) {
				$.get(url + params.join('&'), function(data) {
					var body = data.body;

					if (data.status == 200 && (body.status == 'authorized' || body.status === 'paid')) {
						tokens.push({
							installment: currentBoleto,
							token: body.token
						});

						if(currentBoleto == totalBoletos) {
							// finish installment boletos
							PagarMe.Checkout.Animations.endAuthorization({
								step: $('.pagarme-checkout-step:not(.hidden)')
							},
							function() {
								sendAnalytics('pagarmecheckout.send', 'event', 'checkout', 'authorized');

								PagarMe.Checkout.Animations.success({
									step: $('.pagarme-checkout-step:not(.hidden)'),
									boleto: formData.payment_method == 'boleto'
								},
								function() {
									PagarMe.Checkout.Animations.closeModal(function() {
										sendAnalytics('pagarmecheckout.send', 'event', 'checkout', 'finish', {
											sessionControl: 'end'
										});

										bridge.submitForm(injectedVariables.scriptId, {
											payment_method: formData.payment_method,
											total_installments: totalBoletos,
											tokens: JSON.stringify(tokens)
										});

										window.location.reload(true);
									});
								});
							});
						} else {
							currentBoleto++;
							createBoleto(bodies[currentBoleto]);
						}
					} else {
						var firstStep = $('.pagarme-checkout-step:not(.hidden)');
						var message;

						sendAnalytics('pagarmecheckout.send', 'event', 'checkout', 'declined');

						message = 'Ocorreu um erro ao criar o seu boleto, tente novamente mais tarde.';

						firstStep.find('.error-message').html('<span>Sua transação anterior não foi autorizada.</span> ' + message);
						$('#pagarme-checkout-error-container #pagarme-checkout-error-body').html(message);

						PagarMe.Checkout.Animations.error({
							step: $('.pagarme-checkout-step:not(.hidden)')
						}, function() {
							// firstStep.find('.error-message').show();
						});
					}
				}, 'jsonp');
			};

			createBoleto(bodies[currentBoleto]);

		} else {
			if(injectedVariables.boletoInstallment) {
				body.push('body[metadata][total_amount]=' + encodeURIComponent(formData.amount));
				body.push('body[metadata][total_installments]=' + encodeURIComponent(1));
				body.push('body[metadata][installment]=' + encodeURIComponent(1));
				body.push('body[metadata][installment_amount]=' + encodeURIComponent(formData.amount));
			}

      if (formData.payment_method == 'boleto') {
        var maxInterval = 120000;
        var interval = maxInterval/3;
        var intervalCount = 0;
        var intervalMessages = {
          40000: 'Isso está levando um pouco mais de tempo do que o de costume...',
          80000: 'Espere só mais um pouquinho...',
          120000: 'O tempo de espera acabou :('
        }

        var requestInterval = setInterval(function(){
          intervalCount += interval;

          if(intervalCount >= maxInterval) {
            clearInterval(requestInterval);

            $('#pagarme-checkout-error-header').text('Erro');
            $('#pagarme-checkout-error-container #pagarme-checkout-error-body').text('Ocorreu um erro ao gerar o boleto. Quer tentar novamente?');
            $('#pagarme-checkout-error-back-button').text('Tentar novamente');

            PagarMe.Checkout.Animations.error({
              step: $('.pagarme-checkout-step:not(.hidden)'),
              boleto: formData.payment_method == 'boleto'
            }, function(){});
          }

          $('#pagarme-checkout-step-title').text(intervalMessages[intervalCount])
        }, interval);
      }

      var url = 'https://api.pagar.me/1/jsonp?method=post&path=%2Ftransactions&' + body.join('&');

			$.get(url, function(data) {
				var body = data.body;

        if (requestInterval) {
          clearInterval(requestInterval)
        }

				PagarMe.Checkout.Animations.endAuthorization({
					step: $('.pagarme-checkout-step:not(.hidden)')
				},
				function() {
					if (data.status == 200 && (body.status == 'authorized'|| body.status === 'paid' || body.status === 'waiting_payment')) {
						sendAnalytics('pagarmecheckout.send', 'event', 'checkout', 'authorized');

						PagarMe.Checkout.Animations.success({
							step: $('.pagarme-checkout-step:not(.hidden)'),
							boleto: formData.payment_method == 'boleto'
						},
						function() {
							PagarMe.Checkout.Animations.closeModal(function() {
								sendAnalytics('pagarmecheckout.send', 'event', 'checkout', 'finish', {
									sessionControl: 'end'
								});

                var params = {
                  token: body.token,
									payment_method: formData.payment_method
                };

                if(body.boleto_url && body.boleto_barcode) {
                  params.boleto_url = body.boleto_url;
                  params.boleto_barcode = body.boleto_barcode;
                }

								bridge.submitForm(injectedVariables.scriptId, params);

								window.location.reload(true);
							});
						});
					} else {
						var firstStep = $('.pagarme-checkout-step:not(.hidden)');

						if (body.status == 'processing') {
							sendAnalytics('pagarmecheckout.send', 'event', 'checkout', 'processing');

							$('#pagarme-checkout-error-header').html('Em Análise');
							$('#pagarme-checkout-error-header').css({'background-color': 'rgb(26, 110, 225)'});
							$('#pagarme-checkout-error-container #pagarme-checkout-error-body').html('A transação foi encaminhada para análise e será processada em breve');
							$('#pagarme-checkout-error-back-button').hide()

							PagarMe.Checkout.Animations.error({
								step: $('.pagarme-checkout-step:not(.hidden)')
							}, function() {});

						} else {
							sendAnalytics('pagarmecheckout.send', 'event', 'checkout', 'declined');

							if (data.status == 200) {
								body.issuer = body.issuer || {};

								if (body.issuer_error) {
									message = 'Contate seu banco ';

									if (body.issuer.name) {
										message += '(' + body.issuer.name + ') ';
									} else {
										message += 'emissor ';
									}

									if (body.issuer.phones) {
										message += 'no telefone <b>' + body.issuer.phones.main + '</b>';

										if (body.issuer.phones.non_capitals) {
											message += ' (capitais e regiões metropolitanas) ou <b>' + body.issuer.phones.non_capitals + '</b> (demais cidades) ';
										}

									} else {
										message += 'pelo número disponível atrás do seu cartão de crédito ';
									}

									message += ' para resolver o problema.';
								} else {
									message = 'Verifique os dados digitados e tente novamente.';
								}
							} else {
								message = 'Ocorreu um erro ao processar sua transação, tente novamente mais tarde.';
							}

							firstStep.find('.error-message').html('<span>Sua transação anterior não foi autorizada.</span> ' + message);
							$('#pagarme-checkout-error-container #pagarme-checkout-error-body').html(message);

							PagarMe.Checkout.Animations.error({
								step: $('.pagarme-checkout-step:not(.hidden)')
							}, function() {});
						}
					}
				});
		  }, 'jsonp');
    }
	};

	var finish = function() {
		var currentStep = $('.pagarme-checkout-step:not(.hidden)');
		currentStep.find('.error-message').slideUp();

		openSessions[injectedVariables.scriptId].stepsManager.block();

		PagarMe.Checkout.Animations.beginAuthorization({
			step: currentStep
		},
		function() {
			var next = function() {
				if (injectedVariables.createToken) {
					createTransaction();
				} else {
					PagarMe.Checkout.Animations.closeModal(function() {
						sendAnalytics('pagarmecheckout.send', 'event', 'checkout', 'finish', {
							sessionControl: 'end'
						});

						bridge.submitForm(injectedVariables.scriptId, formData);
						window.location.reload(true);
					});
				}
			};

			if (formData.payment_method == 'credit_card') {
				PagarMe.encryption_key = injectedVariables.encryptionKey;

				var card = new PagarMe.CreditCard();
				card.cardHolderName = formData.card_holder_name;
				card.cardNumber = formData.card_number;
				card.cardCVV = formData.card_cvv;
				card.cardExpirationMonth = formData.card_expiration_date.substring(0, 2);
				card.cardExpirationYear = formData.card_expiration_date.substring(2, 4);

				clearCardData();

				var ccNumberField = $('input[name="pagarme-credit-card-number"]').addClass('novalidate').blur();
				var ccExpirationField = $('input[name="pagarme-credit-card-expiration"]').addClass('novalidate').blur();
				var ccNameField = $('input[name="pagarme-credit-card-name"]').addClass('novalidate').blur();
				var ccCvvField = $('input[name="pagarme-credit-card-cvv"]').addClass('novalidate').blur();
				var ccInstallmentsField = $('select[name="pagarme-installments"]').addClass('novalidate').blur();

				card.generateHash(function(cardHash) {
					ccNumberField.removeClass('novalidate');
					ccExpirationField.removeClass('novalidate');
					ccNameField.removeClass('novalidate');
					ccCvvField.removeClass('novalidate');
					ccInstallmentsField.removeClass('novalidate');

					delete formData.card_holder_name;
					delete formData.card_number;
					delete formData.card_cvv;
					delete formData.card_expiration_date;

					formData.card_hash = cardHash;
					next();
				});
			} else {
				next();
			}
		});
	};

	var changeCardMask = (function() {
		var mask16 = '0000 0000 0000 0000';
		var visa = '0000 0000 0000 0AAA';
		var amex = '0000 000000 00000';
		var aura = '0000000000000000000';
		var diners = '0000 000000 0000 AA';
		var hipercard = '0000000000000AAAAAA';
		var currentMask = '0000000000000000AAA';

		var maskForBrands = {
			visa: visa,
			mastercard: mask16,
			diners: diners,
			elo: mask16,
			amex: amex,
			discover: mask16,
			aura: aura,
			jcb: mask16,
			hipercard: hipercard,
			unknown: mask16
		};

		return function(cardNumber) {
			var $input = $('input[name="pagarme-credit-card-number"]');
			var brand = PagarMe.Validator.getCardBrand(cardNumber);
			cardBrand = brand;

			if (brand) {
				var mask = maskForBrands[brand];

				if (mask != $input.data('mask')) {
					$input.mask(mask, cardNumberMaskOptions);
					$input.data('mask', mask);
				}
			}

			if (brand == 'amex' && cvvMask != '0000') {
				cvvMask = '0000';
				$('input[name="pagarme-credit-card-cvv"]').mask(cvvMask);
			} else if (brand != 'amex' && cvvMask != '000') {
				cvvMask = '000';
				$('input[name="pagarme-credit-card-cvv"]').mask(cvvMask);
			}
		};
	}());

	var cardNumberMaskOptions = {
		onChange: function(cardNumber, event, element, options) {
			changeCardMask(cardNumber);
		}
	};

	var validateCardFields = function () {
		var errorDiv = $('#pagarme-modal-box-step-credit-card-information .error-message');
		var cardNumber = $('#pagarme-modal-box-credit-card-number').val();
		var holderName = $('#pagarme-modal-box-credit-card-name').val();
		var cardExpiration = $('#pagarme-modal-box-credit-card-expiration').val()
		var cardCvv = $('#pagarme-modal-box-credit-card-cvv').val();

		function showError () {
			errorDiv.html('Os dados do cartão parecem estar incorretos.');
			errorDiv.slideDown();
		}

		if (cardNumber) {
			cardNumber = cardNumber.replace(/\s/g, '');
			var cardBrand = PagarMe.Validator.getCardBrand(cardNumber);
		} else {
			showError();
			return false;
		}

		function number (number) {
			return PagarMe.Validator.isValidCardNumber(number);
		}

		function brand (brand) {
			if (brand == 'unknown') return false;
			if ($.inArray(brand, acceptedBrands) == -1) return false;

			return true;
		}

		function expirationDate (number) {
			return PagarMe.Validator.isValidExpirationDate(number);
		}

		function cvv (number, brand) {
			return PagarMe.Validator.isValidCvv(number, brand);
		}

		function holder (holder) {
			return holder !== '';
		}

		if (
			!number(cardNumber) ||
			!brand(cardBrand) ||
			!expirationDate(cardExpiration) ||
			!cvv(cardCvv, cardBrand) ||
			!holder(holderName)
		) {
			showError()
			return false;
		} else {
			errorDiv.html('');
			errorDiv.slideUp();
			return true;
		}
	};

	var fields = {
		'pagarme-credit-card-number': {
			metadata: {
				name: 'card_number'
			},
			processVal: function(val) {
				return val.replace(/[^0-9]/g, '');
			},
			validation: [{
				validate: PagarMe.Validator.isValidCardNumber
			},
			{
				validate: function(val) {
					if (!val) {
						return;
					}

					var isValidCardNumber = PagarMe.Validator.isValidCardNumber(val);
					var errorDiv = $('#pagarme-modal-box-step-credit-card-information .error-message');

					if (isValidCardNumber) {
						errorDiv.html('');
						errorDiv.slideUp();
						return true
					} else {
						return false
					}
				}
			}],
			events: {
				'keydown.pgm-checkout': function() {
					changeCardMask($('input[name="pagarme-credit-card-number"]').val());
				},
				'keyup.pgm-checkout': function() {
					$('.brand-error').slideUp().removeClass('brand-error');
				}
			},
			mask: {
				defaultMask: '0000000000000000AAA',
				options: cardNumberMaskOptions
			}
		},
		'pagarme-credit-card-expiration': {
			metadata: {
				name: 'card_expiration_date'
			},
			processVal: function(val) {
				return val.replace(/[^0-9]/g, '');
			},
			validation: [{
				validate: PagarMe.Validator.isValidExpirationDate
			},
			{
				validate: function (val) {
					if (!val) {
						return
					}

					var validate = PagarMe.Validator.isValidExpirationDate(val)
					var errorDiv = $('#pagarme-modal-box-step-credit-card-information .error-message');

					if (validate) {
						errorDiv.html();
						errorDiv.slideUp()
						return true
					} else {
						return false
					}
				}
			}],
			mask: {
				defaultMask: '00/00'
			}
		},
		'pagarme-credit-card-cvv': {
			metadata: {
				name: 'card_cvv'
			},
			validation: [{
				validate: function(val) {
					var isValidCvv = PagarMe.Validator.isValidCvv(val, cardBrand);
					var errorDiv = $('#pagarme-modal-box-step-credit-card-information .error-message');

					if (isValidCvv) {
						errorDiv.html('')
						errorDiv.slideUp()
						return true
					} else {
						return false
					}
				}
			}],
			mask: {
				defaultMask: cvvMask
			}
		},
		'pagarme-installments': {
			metadata: {
				name: 'installments'
			},
			validation: [{
				validate: function(val) {
					return val != '';
				},
				message: 'A quantidade de parcelas está incorreta.'
			}]
		},
		'pagarme-credit-card-name': {
			metadata: {
				name: 'card_holder_name'
			},
			validation: [{
				validate: validateBlank
			},
			{
				validate: function (val) {
					var errorDiv = $('#pagarme-modal-box-step-credit-card-information .error-message');

					if (val) {
						errorDiv.html('')
						errorDiv.slideUp()
						return true
					} else {
						return false
					}
				}
			}],
      events: {
        'blur.pgm-checkout': function(event) {
          var val = event.target.value

          val = val.replace(/[^a-zA-Z\s\.]/g, '')
          val = val.replace(/[\s]+/g, ' ')
          val = $.trim(val)

          event.target.value = val
				}
      },
			mask: {
				defaultMask: '*',
				options: {
					translation: {
						'*': {
							pattern: /[a-zA-Z \.]/,
							recursive: true
						}
					},
					maxlength: false
				}
			}
		},
		'pagarme-buyer-name': {
			metadata: {
				name: 'customer.name'
			},
			validation: [{
				validate: validateBlank
			},
			{
				validate: function (val) {
					var errorDiv = $('#pagarme-modal-box-step-buyer-information .error-message');

					if (!val) {
						errorDiv.html('Lembre-se de preencher o campo Nome.');
						errorDiv.slideDown();
						return false
					}

					errorDiv.html('')
					errorDiv.slideUp()

					return true
				}
			}]
		},
		'pagarme-buyer-email': {
			metadata: {
				name: 'customer.email'
			},
			validation: [{
				validate: PagarMe.Validator.isValidEmail
			},
			{
				validate: function (val) {
					var errorDiv = $('#pagarme-modal-box-step-buyer-information .error-message');

					if (!PagarMe.Validator.isValidEmail(val)) {
						errorDiv.html('O e-mail que você digitou parece incorreto.');
						errorDiv.slideDown();
						return false
					}

					errorDiv.html('')
					errorDiv.slideUp()

					return true
				}
			}]
		},
		'pagarme-buyer-document-number': {
			metadata: {
				name: 'customer.document_number'
			},
			processVal: function(val) {
				return val.replace(/[^0-9]/g, '');
			},
			validation: [{
				validate: function(val) {
					val = val.replace(/[^0-9]/g, '');
          var isAllZeros = val === '00000000000' || val === '00000000000000';

          if (injectedVariables.disableZeroDocumentNumber === 'true' && isAllZeros) {
            return false;
          }

					var errorDiv = $('#pagarme-modal-box-step-buyer-information .error-message');

					if (val.length <= 11) {
						if (!PagarMe.Validator.isValidCpf(val)) {
							errorDiv.html('O número do CPF parece estar incorreto.');
							errorDiv.slideDown();
							return false
						}
					}

					if (val.length > 11) {
						if (!PagarMe.Validator.isValidCnpj(val)) {
							errorDiv.html('O número do CNPJ parece estar incorreto.');
							errorDiv.slideDown();
							return false
						}
					}

					errorDiv.html('')
					errorDiv.slideUp()

					return true
				}
			}],
			mask: {
	      defaultMask: function() {
	        var defaultMask = '00xx0000000000'
	        var cnpjMask = '00.000.000/0000-00';
	        var cpfMask = '000.000.000-00';

	        if (!injectedVariables.customerDocumentNumber || !injectedVariables.customerDocumentNumber.length) {
	            return defaultMask;
	        }

	        if (injectedVariables.customerDocumentNumber.length === 11) {
	            return cpfMask;
	        }

	        if (injectedVariables.customerDocumentNumber.length === 14) {
	            return cnpjMask;
	        }

	        return defaultMask;
	      },
				options: cpfMaskOptions
			},
			events: {
				'blur.pgm-checkout-field': function() {
					var input = $(this);

					if (input.val().length === 11) {
						currentMask = '000.000.000-00';
						input.mask(currentMask, cpfMaskOptions);
					}
				}
			}
		},
		'pagarme-buyer-ddd': {
			metadata: {
				name: 'customer.phone.ddd'
			},
			validation: [{
				validate: PagarMe.Validator.isValidDDD
			},
			{
				validate: function(val) {
					var errorDiv = $('#pagarme-modal-box-step-buyer-information .error-message');

					if (!PagarMe.Validator.isValidDDD(val)) {
						errorDiv.html('O DDD que você digitou parece incorreto.');
						errorDiv.slideDown();
						return false
					}

					errorDiv.html('')
					errorDiv.slideUp()

					return true
				}
			}],
			mask: {
				defaultMask: 'x0',
				options: {
					translation: {
						x: { pattern: /[1-9]/ }
					}
				}
			}
		},
		'pagarme-buyer-number': {
			metadata: {
				name: 'customer.phone.number'
			},
			processVal: function(val) {
				return val.replace(/[^0-9]/g, '');
			},
			validation: [{
				validate: PagarMe.Validator.isValidPhoneNumber
			},
			{
				validate: function(val) {
					var errorDiv = $('#pagarme-modal-box-step-buyer-information .error-message');

					if (!PagarMe.Validator.isValidPhoneNumber(val)) {
						errorDiv.html('O número de telefone parece incorreto.');
						errorDiv.slideDown();
						return false
					}

					errorDiv.html('')
					errorDiv.slideUp()

					return true
				}
			}],
			mask: {
				defaultMask: '0000-00009',
				options: {
					onChange: (function() {
						var defaultMask = '0000-00009';
						var celMask = '00000-0000';
						var mask = defaultMask;

						return function(number, event, element, options) {
							if (mask == defaultMask) {
								if (number.length == 10) {
									mask = celMask;
									element.mask(mask, options);
								}
							} else {
								if (number.length < 10) {
									mask = defaultMask;
									element.mask(mask, options);
								}
							}
						};
					})()
				}
			}
		},
		'pagarme-customer-address-zipcode': {
			metadata: {
				name: 'customer.address.zipcode'
			},
			processVal: function(val) {
				return val.replace(/[^0-9]/g, '');
			},
			skipValidationOnBlur: function(input) {
				return input.val() !== lastZipcode && getInputErrors(input).length == 0;
			},
			validation: [{
				validate: function(val) {
					var errorDiv = $('#pagarme-modal-box-step-customer-address-information .error-message');

					if (!PagarMe.Validator.isValidZipCode(val) && validZipcode !== false) {
						errorDiv.html('O CEP que você digitou parece incorreto.');
						errorDiv.slideDown();
						return false
					}

					errorDiv.html('')
					errorDiv.slideUp()

					return true
				}
			}],
			mask: {
				defaultMask: '00000-000',
				options: {
					onComplete: function() {
						loadAddressFromZipcode();
					}
				}
			},
			events: {
				'blur.pgm-checkout-field': function(events) {
					loadAddressFromZipcode();
				}
			}
		},
		'pagarme-customer-address-street': {
			metadata: {
				name: 'customer.address.street'
			},
			validation: [{
				validate: validateBlank
			},
			{
				validate: function(val) {
					var errorDiv = $('#pagarme-modal-box-step-customer-address-information .error-message');

					if (!val) {
						errorDiv.html('Lembre-se de preencher o campo Rua.');
						errorDiv.slideDown();
						return false
					}

					errorDiv.html('')
					errorDiv.slideUp()

					return true
				}
			}]
		},
		'pagarme-customer-address-number': {
			metadata: {
				name: 'customer.address.street_number'
			},
			validation: [{
				validate: validateBlank
			},
			{
				validate: function(val) {
					var errorDiv = $('#pagarme-modal-box-step-customer-address-information .error-message');

					if (!val) {
						errorDiv.html('Lembre-se de preencher o campo Número.');
						errorDiv.slideDown();
						return false
					}

					errorDiv.html('')
					errorDiv.slideUp()

					return true
				}
			}],
			mask: {
				defaultMask: '0#',
				options: {
					maxlength: false
				}
			}
		},
		'pagarme-customer-address-complementary': {
			metadata: {
				name: 'customer.address.complementary'
			}
		},
		'pagarme-customer-address-neighborhood': {
			metadata: {
				name: 'customer.address.neighborhood'
			},
			validation: [{
				validate: validateBlank,
			},
			{
				validate: function(val) {
					var errorDiv = $('#pagarme-modal-box-step-customer-address-information .error-message');

					if (!val) {
						errorDiv.html('Lembre-se de preencher o campo Bairro.');
						errorDiv.slideDown();
						return false
					}

					errorDiv.html('')
					errorDiv.slideUp()

					return true
				}
			}]
		},
		'pagarme-customer-address-city': {
			metadata: {
				name: 'customer.address.city'
			},
			validation: [{
				validate: validateBlank
			},
			{
				validate: function(val) {
					var errorDiv = $('#pagarme-modal-box-step-customer-address-information .error-message');

					if (!val) {
						errorDiv.html('Lembre-se de preencher o campo Cidade.');
						errorDiv.slideDown();
						return false
					}

					errorDiv.html('')
					errorDiv.slideUp()

					return true
				}
			}]
		},
		'pagarme-customer-address-state': {
			metadata: {
				name: 'customer.address.state'
			},
			validation: [{
				validate: validateBlank
			},
			{
				validate: function(val) {
					var errorDiv = $('#pagarme-modal-box-step-customer-address-information .error-message');

					if (val.length !== 2) {
						errorDiv.html('O campo Estado deve ter apenas duas letras.');
						errorDiv.slideDown();
						return false
					}

					errorDiv.html('')
					errorDiv.slideUp()

					return true
				}
			}],
			mask: {
				defaultMask: 'SS'
			}
		}
	};

	var showBullets = function() {
		var bullets = $('.pagarme-checkout-step-indicator:visible .step-indicator-bullet');

		var animateBullet = function(i) {
			if (i > bullets.length-1) {
				return;
			}

			bullets.eq(i).animate({
				marginTop: 0
			}, 250, $.bez([0, 0, 0.58, 1]));

			setTimeout(function() {
				animateBullet(i+1);
			}, 100);
		};

		animateBullet(0);
	};

	var steps = {
		chooseMethod: {
			name: 'choose-payment-method',
			title: '<span class="no-mobile">Qual a </span><span class="mobile-capitalized">forma</span> de pagamento<span class="no-mobile">?</span>',
			selector: '#pagarme-modal-box-step-choose-method',
			proceedOnEnter: false,
			prepareUI: function(callback) {
				var bullets = $('.pagarme-checkout-step-indicator:visible .step-indicator-bullet');

				var animateBullet = function(i) {
					if (i < 0) {
						return;
					}

					bullets.eq(i).animate({
						marginTop: -100
					}, 250, $.bez([0.42, 0, 1, 1]));

					setTimeout(function() {
						animateBullet(i-1);
					}, 100);
				};

				animateBullet(bullets.length-1);

				sendAnalytics('pagarmecheckout.send', 'pageview', '/choose-payment-method');

				if (callback) {
					callback();
				}
			},
			willChange: function(callback) {
				showBullets();

				if (callback) {
					callback();
				}
			}
		},
		creditCard: {
			name: 'credit-card-information',
			title: '<span class="no-mobile">Informe seus </span><span class="mobile-capitalized">dados</span> de cartão',
			selector: '#pagarme-modal-box-step-credit-card-information',
			prepareUI: function(callback) {
				sendAnalytics('pagarmecheckout.send', 'pageview', '/credit-card');

				if (callback) {
					callback();
				}
			}
		},
		boletoOnly: {
			name: 'boleto-only',
			title: '<span class="no-mobile">Clique no </span><span class="mobile-capitalized">botão abaixo</span> para gerar seu boleto.',
			selector: '#pagarme-modal-box-step-boleto-only',
			prepareUI: function(callback) {
				sendAnalytics('pagarmecheckout.send', 'pageview', '/boleto-only');

				if (callback) {
					callback();
				}
			}
		},
		boletoInstallment: {
			name: 'boleto-installment-information',
			title: '<span class="no-mobile">Selecione o parcelamento do </span><span class="mobile-capitalized">boleto</span>',
			selector: '#pagarme-modal-box-step-boleto-installment-information',
			prepareUi: function(callback) {
				sendAnalytics('pagarmecheckout.send', 'pageview', '/boleto-installment');

				if (callback) {
					callback();
				}
			}
		},
		buyerInformation: {
			name: 'step-buyer-information',
			title: '<span class="no-mobile">Informe seus </span><span class="mobile-capitalized">dados</span> pessoais',
			selector: '#pagarme-modal-box-step-buyer-information',
			prepareUI: function(callback) {
				sendAnalytics('pagarmecheckout.send', 'pageview', '/customer-data');

				if (callback) {
					callback();
				}
			}
		},
		customerAddressInformation: {
			name: 'customer-address-information',
			title: '<span class="no-mobile">Informe seu </span><span class="mobile-capitalized">endereço</span>',
			selector: '#pagarme-modal-box-step-customer-address-information',
			prepareUI: function(callback) {
				var $input = $('input[name="pagarme-customer-address-zipcode"]');

				if ($input.val()) {
					loadAddressFromZipcode();
				}

				sendAnalytics('pagarmecheckout.send', 'pageview', '/customer-address');

				if (callback) {
					callback();
				}
			}
		}
	};

	var flows = {
		cardOnly: [steps.creditCard],
		cardAndCustomerData: [steps.buyerInformation, steps.customerAddressInformation, steps.creditCard],
		cardAndBoletoAndCustomerData: [steps.chooseMethod, steps.buyerInformation, steps.customerAddressInformation, steps.creditCard],
		cardAndBoleto: [steps.chooseMethod, steps.creditCard],
		boletoOnly: [steps.boletoOnly],
		boletoAndCustomerData: [steps.buyerInformation, steps.customerAddressInformation],
		cardAndBoletoInstallment: [steps.chooseMethod, steps.creditCard, steps.boletoInstallment],
		cardAndBoletoInstallmentAndCustomerdata: [steps.chooseMethod, steps.buyerInformation, steps.customerAddressInformation, steps.creditCard, steps.boletoInstallment],
		boletoInstallmentAndCustomerData: [steps.buyerInformation, steps.customerAddressInformation, steps.boletoInstallment],
		boletoInstallment: [steps.boletoInstallment]
	};

  var isDefaultInstalmentTheFirstInstallment = function() {
      return injectedVariables.defaultInstallment && injectedVariables.defaultInstallment === 1
  }

	var stepsManagerBuilder = function(flow) {
		var step = 1;
		var steps = flow.slice(0);
		var blocked = false;
		var removedSteps = [];

		var hideNonActive = function(step) {
			for (var i = 0; i < steps.length; i++) {
				if (i < step-1) {
					$(steps[i].selector).removeClass('next').addClass('previous hidden');
				} else if (i > step-1) {
					$(steps[i].selector).removeClass('previous').addClass('next hidden');
				} else {
					$(steps[i].selector).removeClass('previous next hidden');
				}
			}

			for (var i = 0; i < removedSteps.length; i++) {
				$(removedSteps[i].selector).addClass('hidden').css({
					opacity: 0
				}).hide();
			}
		};

		var updateSurroundingUI = function() {
			// Clear all bullets
			$('.pagarme-checkout-step-indicator').html('');

			// Load bullets for steps
			if (steps.length > 1) {
				var width = 0;

				$('.pagarme-checkout-step-indicator').addClass('show');

				for (var i = 0; i < steps.length; i++) {
					var bullet = $('<li href="#">&bull;</li>');
					bullet.addClass('pagarme-checkout-' + steps[i].name + '-bullet');
					bullet.addClass('step-indicator-bullet')
					bullet.data('step', i+1);

					bullet.css('margin-top', -100);

					if (i+1 == step) {
						bullet.addClass('active');
					}

					$('.pagarme-checkout-step-indicator').append(bullet);

					width += bullet.width();
				}
			} else {
				$('.pagarme-checkout-step-indicator').removeClass('show');
			}

			showBullets()

			//Recover all buttons' names and set the last one
			$('.pagarme-modal-box-next-step').each(function() {
				var button = $(this);

				if (button.data('original-name')) {
					button.html(button.data('original-name'));
					button.data('origina-name', '');
				}
			});

			var calculateBoletoInstallments = function(amount, maxInstallments, firstInstallment) {
				var amounts = {};
				var restAmount = firstInstallment ? amount - firstInstallment : amount;
				var boletoDiscount = injectedVariables.boletoDiscount ? parseInt(injectedVariables.boletoDiscount) : 0;

				for(var i = 1; i <= maxInstallments; i++) {
					var sum = 0;
					amounts[i] = {};

					for(var j = 1; j <= i; j++) {
						if(i == 1 && j == 1) {
							amounts[i][j] = (parseInt(amount, 10) - boletoDiscount).toString();
						} else if(firstInstallment) {
							if(j == 1) {
								amounts[i][j] = firstInstallment;
							} else {
								amounts[i][j] = Math.floor(restAmount/(i-1)).toString();
							}
						} else {
							amounts[i][j] = Math.floor(restAmount/i).toString();
						}

						sum += parseInt(amounts[i][j], 10);
					}

					amounts[i][1] = parseInt(amounts[i][1], 10) + parseInt(amount - (sum + boletoDiscount), 10);

					if(i != 1) {
						amounts[i][1] = amounts[i][1] + boletoDiscount;
					}

					amounts[i][1] = amounts[i][1].toString();
				}

				return amounts;
			};

			function calculateDiscountAmount(injectedVariables) {
				if (injectedVariables.creditCardDiscountAmount) {
					return calculateDiscountByValue(injectedVariables.amount, injectedVariables.creditCardDiscountAmount)
				} else if (injectedVariables.creditCardDiscountPercentage){
					return calculateDiscountByPercentage(injectedVariables.amount, injectedVariables.creditCardDiscountPercentage)
				}

				return injectedVariables.amount
			}

			// Add installment boleto buttons, if applicable
			if(injectedVariables.boletoInstallment) {
				var buttons = '';
				var boletoMaxInstallments = parseInt(injectedVariables.boletoMaxInstallments) || 5;
				var installmentAmount = injectedVariables.amount;
				var firstInstallment = injectedVariables.boletoFirstInstallmentAmount;

				var stepsManager;

				if (openSessions[injectedVariables.scriptId]) {
					stepsManager = openSessions[injectedVariables.scriptId].stepsManager;
				} else {
					openSessions[injectedVariables.scriptId] = openSessions[injectedVariables.scriptId] || {};
					openSessions[injectedVariables.scriptId].stepsManager = stepsManager;
				}

				var installmentsAmount = calculateBoletoInstallments(installmentAmount, boletoMaxInstallments, firstInstallment);

				for(var i = 1; i <= boletoMaxInstallments; i++) {
					if(!firstInstallment) {
						if(i == 1 && injectedVariables.boletoDiscountPercentage) {
							buttons += '<button data-installment="' + i + '" class="form-group pagarme-modal-box-next-step brand-background-color boleto-installment-button">' + i  + 'x de R$'+ amountToCurrency(installmentsAmount[i][i]) + ' (' + injectedVariables.boletoDiscountPercentage + '% de desconto) <span class="icon-pg-checkout-continue"></span></button>';
						} else {
							buttons += '<button data-installment="' + i + '" class="form-group pagarme-modal-box-next-step brand-background-color boleto-installment-button">' + i  + 'x de R$'+ amountToCurrency(installmentsAmount[i][i]) + '<span class="icon-pg-checkout-continue"></span></button>';
						}
					} else {
						if(i == 1) {
							if(injectedVariables.boletoDiscountPercentage) {
								buttons += '<button data-installment="' + i + '" class="form-group pagarme-modal-box-next-step brand-background-color boleto-installment-button">' + i  + 'x de R$'+ amountToCurrency(installmentsAmount[i][i]) + ' (' + injectedVariables.boletoDiscountPercentage + '% de desconto) <span class="icon-pg-checkout-continue"></span></button>';
							} else {
								buttons += '<button data-installment="' + i + '" class="form-group pagarme-modal-box-next-step brand-background-color boleto-installment-button">' + i  + 'x de R$'+ amountToCurrency(installmentsAmount[i][i]) + '<span class="icon-pg-checkout-continue"></span></button>';
							}
						} else {
							buttons += '<button data-installment="' + i + '" class="form-group pagarme-modal-box-next-step brand-background-color boleto-installment-button"> R$' + amountToCurrency(installmentsAmount[i]["1"]) + ' + ' + (i - 1) + 'x de R$'+ amountToCurrency(installmentsAmount[i]["2"]) + '<span class="icon-pg-checkout-continue"></span></button>';
						}
					}
				}

				$('#pagarme-modal-box-step-boleto-installment-information').html(buttons);

				$('#pagarme-modal-box-step-boleto-installment-information .brand-background-color').css({
					backgroundColor: injectedVariables.uiColor || '#1a6ee1'
				});

				$('.pagarme-modal-box-next-step.boleto-installment-button').unbind('click.pgm-checkout').bind('click.pgm-checkout', function() {
					formData.boletoInstallment = $(this).data('installment');
					stepsManager.next(true);
				});
			}

			var lastButton = $(steps[steps.length-1].selector).find('.pagarme-modal-box-next-step');
			var icon = lastButton.find('span');
			var buttonString = 'Pagar';

			var supplant = function (str, o) {
				return str.replace(/{([^{}]*)}/g,
				function (a, b) {
					var r = o[b];
					return typeof r === 'string' || typeof r === 'number' ? r : a;
				});
			};

			if(injectedVariables.headerText && formData.payment_method != 'boleto') {
				var span = '<span class="brand-color"></span>';
				var content = supplant(injectedVariables.headerText, { price_info: span });

				$('#pagarme-checkout-amount-information').html(content);

				$('#pagarme-checkout-amount-information .brand-color').css({
					color: injectedVariables.uiColor || '#1a6ee1'
				});
			}

			function isCreditCardStep() {
				var currentStep = openSessions[injectedVariables.scriptId].stepsManager || null;

				if (currentStep) {
					var stepId = currentStep.currentStepId()

					return stepId === 'pagarme-modal-box-step-credit-card-information'
				}
			}

			formData.installments = (
				injectedVariables.defaultInstallment
				|| formData.installments
				|| ''
			).toString()

			if (injectedVariables.amount) {
				formData.amount = injectedVariables.amount;

				if (injectedVariables.defaultInstallment && formData.payment_method != 'boleto') {
					var defaultInstallment = parseInt(injectedVariables.defaultInstallment);
					var freeInstallments = injectedVariables.freeInstallments ? parseInt(injectedVariables.freeInstallments) : 1;
					var interestRate = parseFloat(injectedVariables.interestRate) || 0;
					var currentStep = openSessions[injectedVariables.scriptId].stepsManager ? openSessions[injectedVariables.scriptId].stepsManager.currentStep() : null;

					if (defaultInstallment > freeInstallments) {
						formData.amount = formData.amount * (1 + defaultInstallment * (interestRate / 100));
						formData.amount = Math.round(formData.amount);
					} else if (isCreditCardStep() && formData.payment_method && isDefaultInstalmentTheFirstInstallment()){
						if (injectedVariables.creditCardDiscountAmount) {
							formData.amount = calculateDiscountByValue(injectedVariables.amount, injectedVariables.creditCardDiscountAmount)
						}  else if (injectedVariables.creditCardDiscountPercentage) {
							formData.amount = calculateDiscountByPercentage(injectedVariables.amount, injectedVariables.creditCardDiscountPercentage)
						}
					}
				} else if (isCreditCardStep() && formData.installments == '1') {
					formData.amount = calculateDiscountAmount(injectedVariables)
				}

				if (injectedVariables.creditCardDiscountAmount || injectedVariables.creditCardDiscountPercentage) {
					var discountAmount;

					if (injectedVariables.creditCardDiscountAmount) {
						discountAmount = injectedVariables.creditCardDiscountAmount
					}

					if (injectedVariables.creditCardDiscountPercentage) {
						var percentage = calculateDiscountByPercentage(injectedVariables.amount, injectedVariables.creditCardDiscountPercentage)
						discountAmount = injectedVariables.amount - percentage
					}

					$('#credit-card-discount')
					.empty()
					.append([
						'<br />(desconto de R$',
						amountToCurrency(discountAmount),
						' para pagamentos à vista)'
					].join(''))
				}

				if(formData.payment_method == 'boleto' && !injectedVariables.boletoInstallment) {
					formData.amount = calculateDiscountByValue(injectedVariables.amount, injectedVariables.boletoDiscount)
					var amountInCurrency = amountToCurrency(formData.amount);
					var amountSpan = '<span class="checkout-amount">' + amountInCurrency + '</span>';

					$('#pagarme-checkout-amount-information span').html('R$' + amountSpan);
				}

				if(injectedVariables.showInstallment && formData.payment_method != 'boleto') {
					var currentInstallment = parseInt(injectedVariables.defaultInstallment) || 1;
					var amountPerInstallment = Math.round(formData.amount/currentInstallment).toString();
					amountPerInstallment = amountToCurrency(amountPerInstallment);

					var amountSpan = '<span class="checkout-amount">' + currentInstallment + 'x de R$' + amountPerInstallment + '</span>';
					buttonString += ' (' + amountSpan + ')';

					$('#pagarme-checkout-amount-information span').html(amountSpan);


				} else if(formData.payment_method != 'boleto') {
					var amountInCurrency = amountToCurrency(formData.amount);
					var amountSpan = '<span class="checkout-amount">' + amountInCurrency + '</span>';
					buttonString += ' (R$' + amountSpan + ')';

					$('#pagarme-checkout-amount-information span').html('R$' + amountSpan);
				}

				$('#pagarme-checkout-amount-information').show();
			} else {
				delete formData.amount;
				$('#pagarme-checkout-amount-information').hide();
			}

			if(injectedVariables.paymentButtonText && formData.payment_method != 'boleto') {
				buttonString = injectedVariables.paymentButtonText;
			}

			lastButton.data('original-name', lastButton.html());

			if(formData.payment_method != 'boleto') {
				lastButton.html(buttonString).append(icon);
			}

			if (formData.payment_method != 'boleto' && formData.installments || injectedVariables.defaultInstallments) {
				reconfigInstallments()
			}

		};

		hideNonActive(step);
		updateSurroundingUI();

		// no iOS Safari não tem como dar foco
		// em inputs dessa forma
		if (!isMobile()) {
			$(steps[0].selector).find('input:first').focus();
		}

		pushStepState(1);

		var pagarMeCheckoutUi = $('#pagarme-checkout-ui')

		return {
			reset: function() {
				this.goToStep(1);
			},
			refresh: function(newFlow) {
				if (newFlow) {
					flow = newFlow;
					steps = flow.slice(0);

					if (step > steps.length) {
						step = 1;
					}
				}

				hideNonActive(step);
				updateSurroundingUI();
				this.goToStep(step, true);

				if (steps[step-1].name !== 'choose-payment-method') {
					showBullets();
				}
			},
			block: function() {
				$('.pagarme-checkout-step-indicator, #pagarme-checkout-back-link').animate({
					opacity: 0.3
				}).css({
					cursor: 'not-allowed'
				}).children().css({
					cursor: 'not-allowed'
				});

				blocked = true;
			},
			unblock: function() {
				$('.pagarme-checkout-step-indicator, #pagarme-checkout-back-link').animate({
					opacity: 1
				}).css({
					cursor: 'pointer'
				}).children().css({
					cursor: 'pointer'
				});

				blocked = false;
			},
			currentStep: function() {
				return step;
			},
			currentStepId: function() {
				return $('.pagarme-checkout-step:not(.hidden)').attr('id')
			},
			removeStep: function(stepName) {
				var stepIndex;

				for (var i = 0; i < steps.length; i++) {
					if (steps[i].name == stepName) {
						stepIndex = i;
						break;
					}
				}

				if (stepIndex) {
					removedSteps.push(steps.splice(stepIndex, 1)[0]);
					updateSurroundingUI();
				}
			},
			reinsertSteps: function() {
				steps = flow.slice(0);
				removedSteps = [];
				updateSurroundingUI();
			},
			animateOut_: function(n, direction, cb) {
				PagarMe.Checkout.Animations.stepOut({
					element: $(steps[n-1].selector),
					direction: direction,
					moveUp: isMobile()
				}, cb);
			},
			animateIn_: function(n, cb) {
				var s = steps[n-1];
				$('#pagarme-checkout-step-title').html(s.title);

				$('.pagarme-checkout-step-indicator .active').removeClass('active');
				$('.pagarme-checkout-' + s.name + '-bullet').addClass('active');

				$(getInputsInStep(s)).each(function() {
					clearInputValidation(this, 'error');
				});

				var element = $(s.selector);
				PagarMe.Checkout.Animations.stepIn({
					element: element
				}, function() {
					focusOnFirstBlank(element);
					cb && cb();
				});

				if (n == 1) {
					$('#pagarme-checkout-back-link').css({
						visibility: 'hidden'
					});
				} else {
					$('#pagarme-checkout-back-link').css({
						visibility: 'visible'
					});
				}
			},
			goToStep: function(n, forceAnimation) {
				if (blocked) {
					return;
				}

				var self = this;

				if (step < 1 && step > steps.length-1) {
					return;
				}

				if (step == n && !forceAnimation) {
					return;
				}

				var swap = function(oldStep, newStep) {
					if (oldStep == newStep) {
						return;
					}

					var cbFn = function(c) {
						c();
					};

					var willChange = steps[oldStep-1].willChange || cbFn;
					var prepareUI = steps[newStep-1].prepareUI || cbFn;

					stepWillChange(steps[oldStep-1]);

					willChange(function() {
						prepareUI(function() {
						});
					});

					if (oldStep - newStep > 0) {
						for (var i = newStep + 1; i < oldStep; i++) {
							var s = steps[i-1];
							$(s.selector).removeClass('previous').addClass('next');
						}
					} else {
						for (var i = oldStep + 1; i < newStep; i++) {
							var s = steps[i-1];
							$(s.selector).removeClass('next').addClass('previous');
						}
					}

					self.animateOut_(oldStep, oldStep - newStep, function() {
						if (isMobile()) {
							pagarMeCheckoutUi.scrollTop(0)
						}

						self.animateIn_(newStep, function () {
							if (formData.payment_method === 'credit_card') {
								updateSurroundingUI()
							}
						});
					});
					step = newStep;
				};

				if (n > step) {
					for (var i = 0; i < n-step; i++) {
						if (!validateStep(steps[step+i-1])) {
							swap(step, step+i);
							return;
						} else if (i !== 0) {
							pushStepState(step+i);
						}
					}

					swap(step, n);
				} else {
					swap(step, n);
				}
			},
			next: function(force) {
				if (blocked) {
					return;
				}

				// Check if it can go to next step when pressing enter
				if (steps[step-1].proceedOnEnter === false && !force) {
					return;
				}

				$(steps[step-1].selector).find('input,select,textarea').blur();

				if (step == steps.length) {
					if (validateStep(steps[step-1])) {
						stepWillChange(steps[step-1]);
						finish();
					}
				} else {
					pushStepState(step+1);
					this.goToStep(step+1);
				}
			},
			previous: function() {
				this.goToStep(step-1);
			}
		};
	};

	var validateInput = function($input) {
		var field = fields[$input.attr('name')];

		if ($input.hasClass('novalidate') || (field.skipValidationOnBlur && field.skipValidationOnBlur($input))) {
			return;
		}

		var errors = getInputErrors($input);

		if (errors.length) {
			displayInputError($input);
		} else {
			displayInputSuccess($input);
		}
	};

	var inputBlur = function() {
		var input = $(this);
		validateInput(input);
	};

	var prepareForm = function(flow) {
		// Set the brand color
		var uiColor;

		if (injectedVariables.uiColor) {
			uiColor = injectedVariables.uiColor;
		} else {
			uiColor = '#1a6ee1';
		}

		$('.brand-color').css({
			color: uiColor
		});

		$('.brand-border-color').css('border-bottom-color', shade(uiColor, 0.1));

		$('.brand-background-color').css({
			backgroundColor: uiColor
		});

		$('.brand-background-color.darker-hover').hover(function() {
			if ($(this).hasClass('darker-hover')) {
				$(this).css({
					backgroundColor: shade(uiColor, -0.1)
				});
			}
		},
		function() {
			if ($(this).hasClass('darker-hover')) {
				$(this).css({
					backgroundColor: uiColor
				});
			}
		});
		// Finish setting the brand color

		for (var name in fields) {
			var field = $('[name="' + name + '"]');

			for (var eventName in fields[name].events) {
				field.unbind(eventName).bind(eventName, fields[name].events[eventName]);
			}

			if (fields[name].mask) {
				var mask = fields[name].mask;
				field.mask(mask.defaultMask, mask.options);
				field.data('mask', mask.defaultMask);
			}

			field.unbind('blur.pgm-checkout-form').bind('blur.pgm-checkout-form', inputBlur);
		}

		$('.pagarme-checkout-input-container').unbind('click.pgm-checkout-form').bind('click.pgm-checkout-form', function(e) {
			e.preventDefault();
			focusOnFirstBlank($(this));
		});

		// Begin - installments
		var selectBox = $('#pagarme-modal-box-installments');
		selectBox.html('');

		if (injectedVariables.maxInstallments && injectedVariables.maxInstallments > 1) {
			installmentsLoaded = false;
			getInstallmentsValue(reconfigInstallments);

			$('#pagarme-checkout-credit-card-expiration-container, #pagarme-checkout-credit-card-cvv-container, #pagarme-checkout-installments-container').addClass('has-installments');
			$('.pretty-select-wrap').attr('tabindex', '0');
		} else {
			$('.pretty-select-wrap').attr('tabindex', '-1');
			$('#pagarme-checkout-credit-card-expiration-container, #pagarme-checkout-credit-card-cvv-container, #pagarme-checkout-installments-container').removeClass('has-installments');
		}
		// End - installments

		cardContainer = new PagarMe.CardForm('#pagarme-checkout-card-container', {
			number: {
				input: '#pagarme-modal-box-credit-card-number'
			},
			cvv: {
				input: '#pagarme-modal-box-credit-card-cvv'
			},
			name: {
				input: '#pagarme-modal-box-credit-card-name'
			},
			expiration: {
				input: '#pagarme-modal-box-credit-card-expiration'
			}
		});
		cardContainer.fill();
	};

	var closeModal = function() {
		clearHistory();
		clearCardData();


		PagarMe.Checkout.Animations.dismissError(function() {
			openSessions[injectedVariables.scriptId].stepsManager.unblock();
		});

		PagarMe.Checkout.Animations.closeModal(function() {
			bridge.closeModal();
			$(document).unbind('keyup.pgm-checkout');
			$(document).unbind('keypress.pgm-checkout');
		});

		sendAnalytics('pagarmecheckout.send', 'event', 'checkout', 'close');
	};

	var getFlowFromScript = function() {
		var allPaymentMethods = ['credit_card', 'boleto'];
		var modalPaymentMethods = injectedVariables.paymentMethods ? optionsArrayFromString(injectedVariables.paymentMethods) : allPaymentMethods;
		var card = $.inArray('credit_card', modalPaymentMethods) >= 0;
		var boleto = $.inArray('boleto', modalPaymentMethods) >= 0;
		var customerData = injectedVariables.customerData === undefined || injectedVariables.customerData == 'true';
		var boletoInstallment = injectedVariables.boletoInstallment;
		var customerName = injectedVariables.customerName;
		var customerDocumentNumber = injectedVariables.customerDocumentNumber;

		if (!card) {
			formData.payment_method = 'boleto';
		} else if (!boleto) {
			formData.payment_method = 'credit_card';
		}

		if (card && !customerData && !boleto) {
			return flows.cardOnly;
		} else if (card && customerData && !boleto) {
			return flows.cardAndCustomerData;
		} else if (card && !customerData && boleto && boletoInstallment) {
			return flows.cardAndBoletoInstallment;
		} else if (card && customerData && boleto && boletoInstallment) {
			return flows.cardAndBoletoInstallmentAndCustomerdata;
		} else if (!card && !customerData && boleto && boletoInstallment) {
			return flows.boletoInstallment;
		} else if (!card && customerData && boleto && boletoInstallment) {
			return flows.boletoInstallmentAndCustomerData;
		} else if (card && !customerData && boleto) {
			return flows.cardAndBoleto;
		} else if (!card && customerData && boleto) {
			return flows.boletoAndCustomerData;
		} else if (boleto && !card && !customerData && customerName && customerDocumentNumber) {
			return flows.boletoOnly;
		}

		return flows.cardAndBoletoAndCustomerData;
	};

	var validateBoletoRegistrado = function () {
		var expirationDate = new Date()
		expirationDate = expirationDate.setDate(expirationDate.getDate() + 7)

		if(injectedVariables.boletoExpirationDate){
			expirationDate = new Date(injectedVariables.boletoExpirationDate)
		}

		return !(
			injectedVariables.createToken === true &&
			mustRegisterBoleto(expirationDate, injectedVariables.amount) &&
			(injectedVariables.customerData !== 'true' && !hasNecessaryData())
		);
	}

	var hasNecessaryData = function () {
		return !!injectedVariables.customerName && !!injectedVariables.customerDocumentNumber
	}

	var mustRegisterBoleto = function (date, amount) {
		if (amount >= 200000) {
			return true
		}

		if (date >= new Date("2018/03/24") && amount >= 80000) {
			return true
		}

		if (date >= new Date("2018/05/26") && amount >= 40000) {
			return true
		}

		if (date >= new Date("2018/07/21")) {
			return true
		}

		return false
	}

	var initializeUI = function () {
		$('#pagarme-checkout-close-link').click(function(event) {
			event.preventDefault();
			closeModal();
		});

		$('#pagarme-checkout-error-back-button').click(function(event) {
			event.preventDefault();
      $('#pagarme-checkout-step-title').text('Qual a forma de pagamento?');
			PagarMe.Checkout.Animations.dismissError(function() {
				openSessions[injectedVariables.scriptId].stepsManager.unblock();
			});
		});

		// click no botão de cartão de crédito
		$('#pagarme-checkout-card-button button').click(function() {
			var stepsManager = openSessions[injectedVariables.scriptId].stepsManager;
			formData.payment_method = 'credit_card';
			stepsManager.reinsertSteps();
			openSessions[injectedVariables.scriptId].stepsManager.removeStep('boleto-installment-information');
			stepsManager.next(true);
		});

		$('#pagarme-checkout-boleto-button button').click(function() {
			if(!validateBoletoRegistrado()){
				$('#pagarme-checkout-step-title').text('SISTEMA INDISPONÍVEL');
				$('#pagarme-checkout-error-header').text('Erro');
				$('#pagarme-checkout-error-container #pagarme-checkout-error-body').text('Ocorreu um erro ao gerar o boleto, o sistema está indisponível :(');
				$('#pagarme-checkout-error-back-button').text('Tentar novamente');

				PagarMe.Checkout.Animations.error({
					step: $('.pagarme-checkout-step:not(.hidden)'),
					buttonBuffer: $('#pagarme-checkout-boleto-button')
				}, function(){});
			}else {
				formData.payment_method = 'boleto';
				openSessions[injectedVariables.scriptId].stepsManager.reinsertSteps();
				openSessions[injectedVariables.scriptId].stepsManager.removeStep('credit-card-information');
				openSessions[injectedVariables.scriptId].stepsManager.next(true);
			}
		});

		$('.pagarme-checkout-step-indicator').on('click', '.step-indicator-bullet', function(event) {
			event.preventDefault();
			var step = $(this).data('step');
			goToStep(step);

			if(step === 1){
				formData.amount = injectedVariables.amount
				openSessions[injectedVariables.scriptId].stepsManager.refresh();
				selectOption(injectedVariables.defaultInstallment, false, true, true);
			}

		});

		$('.pagarme-modal-box-previous-step').on('click', function(event) {
			event.preventDefault();

			var stepsManager = openSessions[injectedVariables.scriptId].stepsManager

			var previousStep = stepsManager.currentStep()-1;
			goToStep(previousStep);

			if(previousStep === 1){
				formData.amount = injectedVariables.amount
				stepsManager.refresh();
				if (injectedVariables.defaultInstallment) {
					selectOption(injectedVariables.defaultInstallment, false, true, true);
				}
			}

		});

	};

	var reloadSteps = function() {
		var flow = getFlowFromScript();

		// Load page title
		$('#pagarme-checkout-step-title').html(flow[0].title);

		$('input, select').unbind('focus.pgm-checkout').bind('focus.pgm-checkout', function(e) {

			// faz scroll da view, para deixar o elemento input focado
			// a uma distancia de 30px do topo da página
			if (isMobile()) {
				var pagarMeCheckoutUi = $('#pagarme-checkout-ui');
				pagarMeCheckoutUi.scrollTop( $(this).offset().top - 30 + pagarMeCheckoutUi.scrollTop() );
			}

			if ($(this).parent('.pagarme-checkout-input-container').hasClass('readonly')) {
				e.preventDefault();
				return;
			}

			clearInputValidation($(this));
			$(this).parents('.pagarme-checkout-input-container').addClass('focus');
		}).unbind('blur.pgm-checkout').bind('blur.pgm-checkout', function() {
			$(this).parents('.pagarme-checkout-input-container').removeClass('focus');
		});

		// Hide unused steps
		for (var step in steps) {
			if ($.inArray(steps[step], flow) == -1) {
				$(steps[step].selector).addClass('hidden');

				// IE 7 workaround
				// $(steps[step].selector).css({ visibility: 'hidden' }).css({ visibility: 'visible' });
			} else {
				$(steps[step].selector).removeClass('hidden');
			}
		}

		var stepsManager;

		if (openSessions[injectedVariables.scriptId]) {
			stepsManager = openSessions[injectedVariables.scriptId].stepsManager;
			stepsManager.refresh(flow);
		} else {
			openSessions[injectedVariables.scriptId] = openSessions[injectedVariables.scriptId] || {};
			stepsManager = stepsManagerBuilder(flow);
			openSessions[injectedVariables.scriptId].stepsManager = stepsManager;
		}

		if (flow[stepsManager.currentStep()-1].prepareUI) {
			flow[stepsManager.currentStep()-1].prepareUI();
		}

		if (openSessions[injectedVariables.scriptId].stepsManager.currentStep() == 1) {
			$('#pagarme-checkout-back-link').css({
				visibility: 'hidden'
			});
		}

		$('.pagarme-modal-box-next-step').unbind('click.pgm-checkout').bind('click.pgm-checkout', function() {
			var isLastCardStep = $(this).find('.checkout-amount').length
			if (isLastCardStep) {
				if (!validateCardFields()) {
					return
				}
			}

			stepsManager.next(true);
		});

		prepareForm(flow);

		$('input, select').unbind('keypress.pgm-checkout').bind('keypress.pgm-checkout', function(event) {
			if (event.keyCode == 13) {
				var container = $(this).parent('.pagarme-checkout-input-container');

				var nextEmpty = container.nextAll('.pagarme-checkout-input-container:visible').filter(function() {
					return !$(this).find('input,select option:selected,textarea').val();
				});

				if (nextEmpty.length) {
					if (!isMobile()) {
						nextEmpty.eq(0).children('input,select,textarea').focus();
					}
					return;
				}

				stepsManager.next();
			}
		});
	};

	var setInjectedVariables = function(variables) {
		injectedVariables = variables;
		injectedVariables.boletoDiscount = 0;

		if (injectedVariables.brands) {
			acceptedBrands = optionsArrayFromString(injectedVariables.brands);
		}

		if (injectedVariables.boletoDiscountAmount && injectedVariables.boletoDiscountPercentage) {
			console.error(new Error("Desconto do boleto ambíguo. Defina apenas o percentual ou apenas o valor do desconto."));
			return;
		}

		if (injectedVariables.boletoHelperText) {
				var parentStep = $('.boleto-helper-text').parents('.pagarme-checkout-step')
				if(!parentStep.hasClass('hidden')){
					$('.boleto-helper-text').text(injectedVariables.boletoHelperText);
				}
		}

		if (injectedVariables.creditCardHelperText) {
				$('#credit-card-helper-text').text(injectedVariables.creditCardHelperText);
		}

		if (injectedVariables.boletoDiscountAmount) {
			if(parseFloat(injectedVariables.boletoDiscountAmount, 10) >= parseInt(injectedVariables.amount, 10)) {
				console.error(new Error("Valor do desconto do boleto maior que o valor da transação."));
				return;
			} else {
				injectedVariables.boletoDiscount = injectedVariables.boletoDiscountAmount;

				if(!injectedVariables.boletoInstallment) {
					$('#boleto-discount').text('(desconto de R$' + amountToCurrency(injectedVariables.boletoDiscountAmount) + ')');
				}
			}
		} else if (injectedVariables.boletoDiscountPercentage) {
			if(parseFloat(injectedVariables.boletoDiscountPercentage, 10) >= 100) {
				console.error(new Error("Percentual de desconto do boleto maior que 100%"));
				return;
			} else {
				injectedVariables.boletoDiscount = parseInt(injectedVariables.amount * (injectedVariables.boletoDiscountPercentage / 100), 10);

				if(!injectedVariables.boletoInstallment) {
					$('#boleto-discount').text('(desconto de ' + injectedVariables.boletoDiscountPercentage  + '%)');
				}
			}
		}

		if (injectedVariables.defaultInstallment) {
			var defaultInstallment = parseInt(injectedVariables.defaultInstallment);
			var maxInstallments = parseInt(injectedVariables.maxInstallments) || false;

			if(maxInstallments && defaultInstallment > maxInstallments) {
				defaultInstallment = maxInstallments;
			}

			defaultInstallment = defaultInstallment.toString();

			var installmentsField = {
				field: 'installments',
				inputName: 'pagarme-installments'
			};

			var $select = $('select[name="' + installmentsField.inputName + '"]');
			$select.val(defaultInstallment).change();

			setValueForPath(formData, installmentsField.field, defaultInstallment);

            if ($select.hasClass('novalidate')) {
                $select.removeClass('novalidate');
            }

			validateInput($select);

			$select.addClass('novalidate');

			if (isMobile() || (isIE() && ieVersion() <= 9)) {

			} else {
				selectOption(defaultInstallment, false, true, true);
				optionSelected = defaultInstallment;
			}
		}

		var formDataVariables = {
			customerName: {
				field: 'customer.name',
				inputName: 'pagarme-buyer-name'
			},
			customerDocumentNumber: {
				field: 'customer.document_number',
				inputName: 'pagarme-buyer-document-number'
			},
			customerEmail: {
				field: 'customer.email',
				inputName: 'pagarme-buyer-email'
			},
			customerAddressStreet: {
				field: 'customer.address.street',
				inputName: 'pagarme-customer-address-street'
			},
			customerAddressStreetNumber: {
				field: 'customer.address.street_number',
				inputName: 'pagarme-customer-address-number'
			},
			customerAddressComplementary: {
				field: 'customer.address.complementary',
				inputName: 'pagarme-customer-address-complementary'
			},
			customerAddressNeighborhood: {
				field: 'customer.address.neighborhood',
				inputName: 'pagarme-customer-address-neighborhood'
			},
			customerAddressCity: {
				field: 'customer.address.city',
				inputName: 'pagarme-customer-address-city'
			},
			customerAddressState: {
				field: 'customer.address.state',
				inputName: 'pagarme-customer-address-state'
			},
			customerAddressZipcode: {
				field: 'customer.address.zipcode',
				inputName: 'pagarme-customer-address-zipcode'
			},
			customerPhoneDdd: {
				field: 'customer.phone.ddd',
				inputName: 'pagarme-buyer-ddd'
			},
			customerPhoneNumber: {
				field: 'customer.phone.number',
				inputName: 'pagarme-buyer-number'
			}
		};

		for (var name in formDataVariables) {
			if (injectedVariables[name]) {
				setValueForPath(formData, formDataVariables[name].field, injectedVariables[name]);
				validateInput($('input[name="' + formDataVariables[name].inputName + '"]').val(injectedVariables[name]));
			}
		}

		if (injectedVariables.createToken === undefined) {
			injectedVariables.createToken = true;
		} else {
			if (injectedVariables.createToken == 'false') {
				injectedVariables.createToken = false;
			} else {
				injectedVariables.createToken = true;
			}
		}

		if (injectedVariables.showInstallment === undefined) {
			injectedVariables.showInstallment = false;
		} else {
			if (injectedVariables.showInstallment == 'true') {
				injectedVariables.showInstallment = true;
			} else {
				injectedVariables.showInstallment = false;
			}
		}

		if (injectedVariables.boletoInstallment === undefined) {
			injectedVariables.boletoInstallment = false;
		} else {
			if (injectedVariables.boletoInstallment == 'true') {
				injectedVariables.boletoInstallment = true;
			} else {
				injectedVariables.boletoInstallment = false;
			}
		}

		sendAnalytics('pagarmecheckout.set', 'userId', injectedVariables.encryptionKey);

		reloadSteps();
	};


	bridge = createBridge({
		config: function(params) {
			var camelCasedParams = {};

			for (var k in params) {
				camelCasedParams[makeCamelCase(k)] = params[k];
			}

			setInjectedVariables(camelCasedParams);

			$(document).bind('keyup.pgm-checkout', function(event) {
				if (event.keyCode == 27) {
					closeModal();
				}
			});

			$('#pagarme-checkout-ui').css({
				opacity: 0
			});

			$('#pagarme-modal-box').css({
				top: -200,
				opacity: 0
			});

			$('#pagarme-modal-loading').show();

			reloadHistory();

			return true;
		},
		animateIn: function() {
			if (PagarMe.Checkout.Animations.setup) {
				PagarMe.Checkout.Animations.setup();
			}

			$('#pagarme-checkout-ui').animate({
				opacity: 1
			});

			shouldStart = true;
			tryToDisplayModal();

			return true;
		}
	});

	var shouldStart = false;
	var installmentsLoaded = true;

	var tryToDisplayModal = function() {
		if (shouldStart && installmentsLoaded) {
			$('#pagarme-modal-loading').fadeOut();
			PagarMe.Checkout.Animations.openModal(function() {
				focusOnFirstBlank($('.pagarme-checkout-step:not(.hidden)'));
				$('body').trigger('modalDisplayed', [injectedVariables]);
			});
			shouldStart = false;

			sendAnalytics('pagarmecheckout.send', 'pageview', '/');
		}
	};

	var calculateDiscountByValue = function (amountValue, discountValue) {
		return parseFloat(amountValue - discountValue);
	}

	var calculateDiscountByPercentage = function (amountValue, discountPercentage) {
		return amountValue - parseInt(amountValue * (discountPercentage / 100), 10);
	}

	var createInstallmentsSelectBox = function (data, selectBox) {

		for (var i = 1; i <= injectedVariables.maxInstallments; i++) {

			if (i === 1 && injectedVariables.creditCardDiscountAmount){
				selectBox.append('<option value="' + i + '" data-amount="' + calculateDiscountByValue(data.body.installments[i].amount, injectedVariables.creditCardDiscountAmount) + '">' + i + 'x de R$' + amountToCurrency(calculateDiscountByValue(data.body.installments[i].installment_amount, injectedVariables.creditCardDiscountAmount)) + '</option>');
			} else if (i === 1 && injectedVariables.creditCardDiscountPercentage) {
				selectBox.append('<option value="' + i + '" data-amount="' + calculateDiscountByPercentage(data.body.installments[i].amount, injectedVariables.creditCardDiscountPercentage) + '">' + i + 'x de R$' + amountToCurrency(calculateDiscountByPercentage(data.body.installments[i].installment_amount, injectedVariables.creditCardDiscountPercentage)) + '</option>');
			} else {
				var interestRateText = ''
				if (injectedVariables.interestRate && injectedVariables.defaultInstallment) {
					if (i <= injectedVariables.freeInstallments) {
						interestRateText = ' - sem juros'
					} else {
						interestRateText = ' - com juros ('+ injectedVariables.interestRate +'% a.m.)'
					}
				}
				var option = '<option value="' + i + '" data-amount="' + data.body.installments[i].amount + '">' + i + 'x de R$' + amountToCurrency(data.body.installments[i].installment_amount) + interestRateText +'</option>'
				selectBox.append(option);
			}
		}
	}

	var reconfigInstallments;
	var getInstallmentsValue = function(cb) {
		var ek = injectedVariables.encryptionKey;
		var interestRate = injectedVariables.interestRate || 0;
		var amount = injectedVariables.amount;
		var defaultInstallment = injectedVariables.defaultInstallment;
		var maxInstallments = injectedVariables.maxInstallments;
		var freeInstallments = injectedVariables.freeInstallments || 1;

		var url = 'https://api.pagar.me/1/jsonp?method=get&path=%2Ftransactions%2Fcalculate_installments_amount&body[encryption_key]=' + ek;
		url +=  '&encryption_key=' + ek;
		url += '&body[interest_rate]=' + interestRate;
		url += '&body[amount]=' + amount;
		url += '&body[max_installments]=' + maxInstallments;
		url += '&body[free_installments]=' + freeInstallments;

		var selectBox = $('#pagarme-modal-box-installments');

		$.get(url, function(data) {
			if (data.status == 200) {
				var installments = data.body.installments;
        var defaultAmount;

				selectBox.append('<option data-amount="' + injectedVariables.amount + '" value=""></option>')

				if(injectedVariables.creditCardDiscountAmount && injectedVariables.creditCardDiscountPercentage){
					console.error(new Error("Desconto do cartão de crédito ambíguo. Defina apenas o percentual ou apenas o valor do desconto."))
				}

        createInstallmentsSelectBox(data ,selectBox)

        if (defaultInstallment) {
            defaultAmount = installments[defaultInstallment];
        }

				selectBox.unbind('change.pgm-installments').bind('change.pgm-installments', function() {
					var amount = $(this).find('option:selected').data('amount') || defaultAmount;
					var displayInstallmentText = $(this).find('option:selected').text();

					formData.amount = amount;

					if(injectedVariables.showInstallment) {
						$('.checkout-amount').text(displayInstallmentText);
					} else {
						$('.checkout-amount').text(amountToCurrency(amount));
					}
				});
			}

			installmentsLoaded = true;
			tryToDisplayModal();

			cb && cb();
		}, 'jsonp');
	};

	if (isMobile() || (isIE() && ieVersion() <= 9)) {
		var $installmentsContainer = $('#pagarme-checkout-installments-container');
		var $installmentsSelect = $('.pretty-select-container select');
		var $installmentsSpan = $('.installments-value');

		$installmentsSelect.blur(function() {
			var $select = $(this);
			var selectValue = $select.val() || undefined;

			if (selectValue) {
				$installmentsContainer.addClass('pagarme-success');
				return;
			}

			$installmentsContainer.removeClass('pagarme-success');
		});

		$installmentsSelect.change(function() {
			var selectValue = $(this).val() || undefined;

			if (selectValue) {
				$installmentsSpan.text(selectValue + 'x').removeClass('placeholder');
				setValueForPath(formData, 'installments', selectValue);
				return;
			}

			$installmentsSpan.text('Parcelas').addClass('placeholder');
		});

		reconfigInstallments = function() {
			$installmentsSelect.removeClass('novalidate');

			if (!formData.installments) {
				$installmentsSpan.text('Parcelas').addClass('placeholder');
				return;
			}

			$installmentsSpan.text(formData.installments + 'x').removeClass('placeholder');
			$installmentsContainer.addClass('pagarme-success');
			$installmentsSelect[0].selectedIndex = formData.installments;
			setValueForPath(formData, 'installments', formData.installments);
		};

		var selectOption = function() { }
	} else {
		var $selectContainer = $('<div class="pretty-select-select-container hidden"></div>');
		var $arrow = $('<div class="select-arrow"> </div>');
		var $optionsContainer = $('<ul class="select-options"></ul>');

		$selectContainer.append($arrow);
		$selectContainer.append($optionsContainer);

		$('.pretty-select-container select').hide();
		$('.pretty-select-container').parent('.pagarme-checkout-input-container').wrap('<div tabindex="0" class="pretty-select-wrap"></div>');

		var $wrapDiv = $('.pretty-select-wrap');

		$wrapDiv.click(function() {
			toggleMenu($wrapDiv);
		});

		$wrapDiv.focus(function() {
			$(this).find('.pagarme-checkout-input-container').addClass('focus');

			if (!isMobile()) {
			  $wrapDiv.find('select').focus();
			}

			toggleMenu($(this), 'open');

			$(document).bind('keydown.pgm-select', function(e) {
				var code = e.keyCode;

				if (code >= 49 && code <= 57) {
					e.preventDefault();
					selectOption(code - 48, true, true);
				}

				if (code == 37 || code == 38) {
					e.preventDefault();
					if (!optionSelected) {
						optionSelected = 0;
					}

					selectOption(optionSelected-1, true, true);
				}

				if (code == 39 || code == 40) {
					e.preventDefault();
					if (!optionSelected) {
						optionSelected = 0;
					}

					selectOption(optionSelected+1, true, true);
				}

				if (code == 13 || code == 32) {
					e.preventDefault();
					toggleMenu($wrapDiv);
				}
			});
		}).blur(function() {
			isOpening = true;
			$(this).find('.pagarme-checkout-input-container').removeClass('focus');
			$wrapDiv.find('select').blur();
			toggleMenu($(this), 'close');
			$(document).unbind('keydown.pgm-select');
		});
		$wrapDiv.append($selectContainer);

		var animating = false;
		var toggleMenu = function(parent, action) {
			if (animating) {
				return;
			}
			animating = true;

			var $divToAnimate = parent.find('.pretty-select-select-container');

			if (!action) {
				if ($divToAnimate.hasClass('hidden')) {
					action = 'open';
				} else {
					action = 'close';
				}
			}

			if (action == 'close') {
				$divToAnimate.addClass('hidden');
			} else if (action == 'open') {
				$divToAnimate.removeClass('hidden');

				if (!optionSelected) {
					selectOption(1);
				} else {
					selectOption(optionSelected);
				}
			}

			setTimeout(function() {
				animating = false;
			}, 200);
		};

		var optionSelected;
		var selectOption = function(n, scroll, changeSelectBox, isDefaultInstallment) {
			var length = $wrapDiv.find('.select-option').length;

            if (!isDefaultInstallment) {
                if (n <= 0) {
                    n = length;
                } else if (n > length && length > 0) {
                    n = 1;
                }
            }

			optionSelected = n;
			setValueForPath(formData, 'installments', optionSelected);


			var $option = $wrapDiv.find('.select-option').eq(n-1);
			$option.addClass('active').siblings('.active').removeClass('active');

			if (scroll) {
				$optionsContainer.scrollTop($optionsContainer.scrollTop() + $option.position().top-5);
			}

			if (changeSelectBox) {
				updateSelect($option);
			}
		};

		var updateSelect = function($option) {
			var installmentText = $option.data('value') || optionSelected;
			$wrapDiv.find('select').val(installmentText).change();
			$wrapDiv.find('.installments-value').removeClass('placeholder').text(installmentText + 'x');
		};

		reconfigInstallments = function() {
			if(!formData.installments) {
				optionSelected = null;
				$wrapDiv.find('.installments-value').addClass('placeholder').text('Parcelas');
			}

			var $options = $wrapDiv.find('select option');
			$optionsContainer.html('');
			$options.each(function(i) {
        if (i > injectedVariables.maxInstallments ) { return }
				var $option = $(this);

				if (!$option.val()) {
					return;
				}

				var $optionDiv = $('<li class="select-option" data-value="' + $option.val() + '" data-amount="' + $option.data('amount') + '" data-index="' + i + '">' + $option.html() + '</li>');

				$optionDiv.click(function(e) {
				  	e.stopPropagation();
					selectOption($(this).data('index'), false, true);
					toggleMenu($wrapDiv);
				});

				$optionsContainer.append($optionDiv);
			});
		};

	}

	sendAnalytics('create', 'undefined', 'auto', {
		transport: 'beacon',
		name: 'pagarmecheckout',
		cookieName: 'pagarme.checkout.ga',
		cookieDomain: 'none',
		alwaysSendReferrer: true,
		referrer: document.referrer
	});

	initializeUI();
});
