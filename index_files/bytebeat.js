function $q(path, root) {
	return (root || document.body).querySelector(path);
}

function $Q(path, root) {
	return (root || document.body).querySelectorAll(path);
}

function $id(id) {
	return document.getElementById(id);
}

function $toggle(el) {
	var isHidden = el.style.display;
	if(isHidden) {
		el.style.removeProperty('display');
	} else {
		el.style.display = 'none';
	}
}

function ByteBeatClass() {
	this.audioRecorder = null;
	this.bufferSize = 8192;
	this.canvas = null;
	this.canvWidth = 0;
	this.canvHeight = 0;
	this.chunks = [];
	this.context = null;
	this.contFixedEl = null;
	this.contScrollEl = null;
	this.ctx = null;
	this.errorEl = null;
	this.imageData = null;
	this.sampletime = 0;
	this.mode = 0;
	this.needUpdate = false;
	this.prev = null;
	this.playing = false;
	this.isff = false;
	this.isSff = false;
	this.isrev = false;
	this.recording = false;
	this.sampleRate = 1000;
	this.sampleSize = 1;
	this.scale = 3;
	this.time = 0;
	this.timePage = -1;
	this.type = 0;
	document.addEventListener('DOMContentLoaded', function() {
		this.contScrollEl = $q('.container-scroll');
		this.contFixedEl = $q('.container-fixed');
		this.setScrollHeight();
		document.defaultView.addEventListener('resize', this.setScrollHeight);
		this.initLibrary();
		this.initInput();
		this.initCanvas();
		this.refeshCalc();
	}.bind(this));
}
ByteBeatClass.prototype = {
	get saveData() {
		var a = document.createElement('a');
		document.body.appendChild(a);
		a.style.display = 'none';
		var fn = function(blob, fileName) {
			url = URL.createObjectURL(blob);
			a.href = url;
			a.download = fileName;
			a.click();
			setTimeout(function() {
				window.URL.revokeObjectURL(url);
			});
		};
		Object.defineProperty(this, 'saveData', { value: fn });
		return fn;
	},
	applySettings: function (settings, useContext) {
		//alert(JSON.stringify(settings));
		var freqBox = $id('input_freq');
		var typeBox = $id('beatType-change');
		freqBox.value = settings.sampleRate;
		typeBox.selectedIndex = settings.type;
		this.setBeatType(settings.type);
		this.setSampleRate(useContext);
	},
/*	changeMode: function() {
		this.mode = +!this.mode;
		this.needUpdate = true;
		if(!this.playing && !this.ff) {
			this.refeshCalc();
		}
	},*/
	changeScale: function(isIncrement) {
		if(!isIncrement && this.scale > 0 || isIncrement && this.scale < 11) {
			this.scale += isIncrement ? 1 : -1;
			this.needUpdate = true;
			if (this.sampletime == 0) {
				this.refeshCalc();
			}
		}
	},
	draw: function(data) {
		// | 0 is faster than Math.floor
		if (this.inputEl.innerText != this.prev) {
			this.needUpdate = true;
        }
		var graphSizeInSamples = (data.length >> 2) >> this.scale;
		var currentSample = this.sampleSize * this.time;
		var page = graphSizeInSamples * ((currentSample / graphSizeInSamples) | 0);
		var width = this.canvWidth;
		var height = this.canvHeight;
		this.timeCursor.style.cssText = this.scale > 5 || this.mode == 2 || this.mode == 3 ? 'display: none;' : 'display: block; left: ' +
			(((page ? currentSample % page : currentSample) * width / graphSizeInSamples) | 0) + 'px';
		this.prev = this.inputEl.innerText
		if(!this.needUpdate && page === this.timePage || this.mode == 10) {
			return;
		}
		this.timePage = page;
		var arr = [];
		var parr = [];
			var dataLen = data.length >> 2;
			for (var t = 0; t < dataLen; ++t) {
				var ts = (t >> this.scale);
				var preresult = this.func(ts + page, this.sampleRate)
				var result = preresult & 255;
				if (this.mode != 0) {
					parr[ts] = preresult;
					arr[ts] = result;
				}
				var pos = (width * (t % height) + ((t / height) | 0)) << 2;
				// data[pos++] = data[pos++] = data[pos++] = this.mode ? 0 : result; // R, G, B
				var initpos = pos;
				data[pos++] = this.mode || preresult > 0  ? 0 : result;
				data[pos++] = this.mode || preresult < 0  ? 0 : result;
				data[pos++] = this.type == 2 || this.mode ? 0 : (Math.abs(preresult>>8))&255;
				data[pos] = 255; // Alpha
			}
		if (this.mode === 1) {
			var arrLen = arr.length;
			for (var i = 0; i < arrLen; i++) {
				var pos = ((256 - arr[i]) * width + (((i * width / arrLen) | 0) || 1)) << 2;
				data[pos++] = parr[i] > 0 ? 0 : 255;
				data[pos++] = parr[i] < 0 ? 0 : 255;
				data[pos++] = 0;
				data[pos--] = 255;
				pos = 2 + (((256 - (parr[i] >> 8) & 255) * width + (((i * width / arrLen) | 0) || 1)) << 2);
				data[pos] = this.type == 2 ? 0 : 255;
			}
		} else if (this.mode === 2) {
			var arrLen = arr.length;
			for (var i = 0; i < arrLen; i++) {
				var pos = (i * (1048576 / arrLen));
				data[pos++] = parr[i] & 255;
				data[pos++] = parr[i] >> 8 & 255;
				data[pos++] = parr[i] >> 16 & 255;
				data[pos++] = 255;
				for (var j = 0; j < (1048576 / arrLen) - 1; j++) {
					data[pos++] = parr[i] & 255;
					data[pos++] = parr[i] >> 8 & 255;
					data[pos++] = parr[i] >> 16 & 255;
					data[pos++] = 128;
				}
			}

		} else if (this.mode === 3) {
			var arrLen = arr.length;
			for (var i = 0; i < arrLen; i++) {
				var pos = (i * (1048576 / arrLen));
				data[pos++] = parr[i] & 255;
				data[pos++] = parr[i+1] & 255;
				data[pos++] = parr[i+2] & 255;
				data[pos++] = 255;
				for (var j = 0; j < (1048576 / arrLen) - 1; j++) {
					data[pos++] = parr[i] & 255;
					data[pos++] = parr[i+1] & 255;
					data[pos++] = parr[i+2] & 255;
					data[pos++] = 128;
				}
			}
		}
		this.ctx.putImageData(this.imageData, 0, 0);
		this.needUpdate = false;
	},
	func: function() {
		return 0;
	},
	initAudioContext: function () {
		var context = this.context = new (window.AudioContext || window.webkitAudioContext ||
			window.mozAudioContext || window.oAudioContext || window.msAudioContext)();
		if(!context.createGain) {
			context.createGain = context.createGainNode;
		}
		if(!context.createDelay) {
			context.createDelay = context.createDelayNode;
		}
		if(!context.createScriptProcessor) {
			context.createScriptProcessor = context.createJavaScriptNode;
		}
		this.sampleSize = this.sampleRate / context.sampleRate;
		var processor = context.createScriptProcessor(this.bufferSize, 1, 1);
		processor.onaudioprocess = function(e) {
			this.draw(this.imageData.data);
			var data = e.outputBuffer.getChannelData(/* channel = */ 0);
			var dataLen = data.length;
			var lastSample = -1;
			var lastOutput = 0;
			for(var i = 0; i < dataLen; ++i) {
				var resampledTime = (this.sampleSize * this.time) | 0;
				if (this.sampletime == 0) {
					data[i] = 0;
				} else if(lastSample !== resampledTime) {
					data[i] = lastOutput = (this.func(resampledTime,this.sampleRate) & 255) / 127 - 1;
				} else {
					data[i] = lastOutput;
				}
				lastSample = resampledTime;
				if (this.time + this.sampletime >= 0) {
					this.time += this.sampletime
				}
			}
		}.bind(this);
		processor.connect(context.destination);

		var mediaDest = context.createMediaStreamDestination();
		var audioRecorder = this.audioRecorder = new MediaRecorder(mediaDest.stream);
		audioRecorder.ondataavailable = function(e) {
			this.chunks.push(e.data);
		}.bind(this);
		audioRecorder.onstop = function(e) {
			var file, type;
			var types = ['audio/webm', 'audio/ogg'];
			var files = ['track.webm', 'track.ogg'];
			var check = (MediaRecorder.isTypeSupported || function(type) {
				return MediaRecorder.canRecordMimeType && MediaRecordercanRecordMimeType(type) === 'probably';
			});
			while((file = files.pop()) && !check(type = types.pop())) {
				if(types.length === 0) {
					console.error('save failed: not supported');
					alert("Saving not supported in this browser!");
					break;
				}
			}
			this.saveData(new Blob(this.chunks, { type: type }), file);
		}.bind(this);
		processor.connect(mediaDest);
	},
	initInput() {
		this.errorEl = $id('error');
		this.inputEl = $id('input');
		this.freqEl = $id('input_freq');
		this.inputEl.addEventListener('onchange', this.refeshCalc.bind(this));
		this.inputEl.addEventListener('onkeyup', this.refeshCalc.bind(this));
		this.inputEl.addEventListener('input', this.refeshCalc.bind(this));
		if (window.location.hash.indexOf('#enBeat-') === 0) {
			var dataObj = JSON.parse(pako.inflateRaw(atob(decodeURIComponent(window.location.hash.substr(8))), { to: 'string' }))
			//alert(JSON.stringify(dataObj))
			this.inputEl.innerText = dataObj.formula;
			this.applySettings(dataObj,false);
		} else if (window.location.hash.indexOf('#v3b64') === 0) {
			var dataObj = JSON.parse(pako.inflateRaw(atob(decodeURIComponent(window.location.hash.substr(6))), { to: 'string' }))
			//alert(JSON.stringify(dataObj))
			this.inputEl.innerText = dataObj.formula;
			this.applySettings(dataObj, false);
		}
	},
	initCanvas: function() {
		this.timeCursor = $id('timecursor');
		this.canvas = $id('canvas-main');
		this.ctx = this.canvas.getContext('2d');
		this.canvWidth = this.canvas.width;
		this.canvHeight = this.canvas.height;
		this.imageData = this.ctx.createImageData(this.canvWidth, this.canvHeight);
	},
	initLibrary() {
		Array.prototype.forEach.call($Q('.button-toggle'), function(el) {
			el.onclick = function() {
				$toggle(el.nextElementSibling);
			};
		});
		var libraryEl = $id('library');
		libraryEl.onclick = function(e) {
			var el = e.target;
			if (el.tagName === 'CODE') {
				if (!this.context) {
					this.initAudioContext();
				}
				this.inputEl.innerText = el.innerText.trim();
				this.applySettings({ "sampleRate": + el.getAttribute('samplerate') || 8000, "type": +el.getAttribute('type') || 0 }, false);
				this.time = 0;
				this.needUpdate = true;
				this.refeshCalc();
				this.play();
			}
			if(el.classList.contains('prettycode-toggle')) {
				el.classList.toggle('prettycode-show');
			}
		}.bind(this);
		libraryEl.onmouseover = function(e) {
			var el = e.target;
			if(el.tagName === 'CODE') {
				el.title = 'Click to hear the music the code generates.';
			}
		};
	},
	play: function() {
		if(!this.context) {
			this.initAudioContext();
		}
		this.sampletime = 1;
	},/*
	ff: function() {
		if(!this.context) {
			this.initAudioContext();
		}
		this.sampletime = 2;
	},
	sff: function () {
		if (!this.context) {
			this.initAudioContext();
		}
		this.sampletime = 4;
	},*/
	rev: function () {
		if (!this.context) {
			this.initAudioContext();
		}
		this.sampletime = -1;
	},/*
	fr: function () {
		if (!this.context) {
			this.initAudioContext();
		}
		this.sampletime = -2;
	},
	Sfr: function () {
		if (!this.context) {
			this.initAudioContext();
		}
		this.sampletime = -4;
	}, */
	up: function () {
		if (!this.context) {
			this.initAudioContext();
		}
		this.sampletime++
	},
	down: function () {
		if (!this.context) {
			this.initAudioContext();
		}
		this.sampletime--
	},
	pause: function () {
		this.sampletime = 0;
	},
	gotostart: function () {
		this.time = 0;
		this.needUpdate = true;
	},
	rec: function() {
		if(this.context && !this.recording) {
			this.audioRecorder.start();
			this.recording = true;
			this.chunks = [];
			if (this.sampletime = 0) {
				this.play();
			}
		}
	},
	refeshCalc: function() {
		var formula = this.inputEl.innerText;
		var funcvars="t, SR"
		var oldF = this.func;
		try {
			var PI = Math.PI;
			int = floor = function (v) { return Math.floor(v) };
			sin = function (v) { return Math.sin(v) };
			cos = function (v) { return Math.cos(v) };
			tan = function (v) { return Math.tan(v) };
			abs = function (v) { return Math.abs(v) };

			sinh = function (v) { return Math.sinh(v) };
			cosh = function (v) { return Math.cosh(v) };
			tanh = function (v) { return Math.tanh(v) };

			asin = function (v) { return Math.asin(v) };
			acos = function (v) { return Math.acos(v) };
			atan = function (v) { return Math.atan(v) };

			sinf = function (v) { return Math.sin(v / (128 / Math.PI)) };
			cosf = function (v) { return Math.cos(v / (128 / Math.PI)) };
			tanf = function (v) { return Math.tan(v / (256 / Math.PI)) };

			asinf = function (v) { return Math.asin(v / (128 / Math.PI)) };
			acosf = function (v) { return Math.acos(v / (128 / Math.PI)) };
			atanf = function (v) { return Math.atan(v / (256 / Math.PI)) };

			sinhf = function (v) { return Math.sinh(v / (128 / Math.PI)) };
			coshf = function (v) { return Math.cosh(v / (128 / Math.PI)) };
			tanhf = function (v) { return Math.tanh(v / (256 / Math.PI)) };

			random = function (v) { return Math.random(v) };
			max = function (v, w) { return Math.max(v, w) };
			min = function (v, w) { return Math.min(v, w) };
			pow = function (v, w) { return Math.pow(v, w) };
			b = (c, d, e) => ((e & c) ? d : 0), br = (u) => b(128, 1, u) + b(64, 2, u) + b(32, 4, u) + b(16, 8, u) + b(8, 16, u) + b(4, 32, u) + b(2, 64, u) + b(1, 128, u);
		
			if (this.type === 0) {
				eval('byteBeat.func = function(' + funcvars + ') { return ' + formula + '; }');
			} else if (this.type === 1) {
				eval('byteBeat.func = function(' + funcvars + ') { return (' + formula + ') +128; }');
			} else if (this.type === 2) {
				eval('byteBeat.func = function(' + funcvars + ') { return max(min(((' + formula + ')* 128 + 128),255),0); }');
			} else if (this.type === 3) {
				eval('byteBeat.func = function(' + funcvars + ') { return ((' + formula + ')&1)*255; }');
			} else if (this.type === 4) {
				eval('byteBeat.func = function(' + funcvars + ') { return sin((' + formula + ')%256-128)*128+128; }');
			} else {
				eval('byteBeat.func = function(' + funcvars + ') { return (' + formula + ') / 4; }');
            }

			this.func(0);
		} catch(err) {
			this.func = oldF;
			this.errorEl.innerText = err.toString();
			return;
		}
		this.errorEl.innerText = '';
		var pData = (JSON.stringify({ sampleRate: this.sampleRate, formula: formula, type: this.type }));
		window.location.hash = '#enBeat-' + btoa(pako.deflateRaw(pData, { to: 'string' }));
		this.draw(this.imageData.data);
		this.setScrollHeight();
	},
	setSampleRate: function(useContext) {
		this.sampleRate = ($id('input_freq').value);
		this.sampleSize = this.sampleRate / (useContext? this.context.sampleRate : 48000);
		this.needUpdate = true;
	},
	setMode: function (selectedmode) {
		this.mode = selectedmode;
		this.needUpdate = true;
	},
	setBeatType: function (selectedmode) {
		this.type = selectedmode;
		this.needUpdate = true;
	},
	setScrollHeight: function() {
		if(this.contScrollEl) {
			this.contScrollEl.style.maxHeight =
				(document.documentElement.clientHeight - this.contFixedEl.offsetHeight - 20) + 'px';
		}
	},
	stop: function() {
		if(!this.context) {
			return;
		}
		if(this.recording) {
			this.audioRecorder.stop();
			this.recording = false;
		}
		this.sampletime = 0;
		this.time = 0;
	}
};

var byteBeat = new ByteBeatClass();
