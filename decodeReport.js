const apTaf =
	"TAF VMMC 231100Z 2312/2418 11010KT 8000 FEW010 SCT020 TEMPO 2312/2321 3500 SHRA FEW006 SCT015CB TEMPO 2321/2403 VRB18G28KT 2000 +TSRA FEW006 SCT012CB BKN040 TEMPO 2403/2412 3500 SHRA FEW006 SCT015CB=";
// let apTaf =
// 	"TAF ZGSZ 230423Z 230615 04004MPS 5000 BR SCT015 OVC030 TX19/06Z TN17/15Z TEMPO 1014 33008G17MPS 0800 SHRA VV001 FEW020CB BKN030=";
// 
const apMetar =
	"SPECI ZGSZ 230930Z AUTO 08005MPS 040V110 8000 -SHRA FEW015 FEW020CB BKN040 26/24 Q1008 RESHRA BECMG FM0940 TL1040 TSRA FG GR SCT011 FEW020CB BKN030 TEMPO 33006G12MPS 0800 +TSRA OVC002=";
console.log(decodeReport(apTaf));

function decodeReport(report) {
	let raw = report.replace("=", "").split(" "),
		result,
		n = 0;
	if (/METAR/.test(report) || /SPECI/.test(report)) {
		result = initMetar();
	} else if (/TAF/.test(report)) {
		result = initTaf(report);
	}
	switch (true) {
		case /METAR/.test(raw[0]) || /SPECI/.test(raw[0]):
			{
				//报头部分
				while (n < findindex(raw, 'wind')) {
					let key = elementiswhat(raw[n]);
					if (key === "weather")
						result['airport'] = raw[n];
					else
						result[key] = elementdecode(key, raw[n]);
					n++;
				}
				//常规部分
				let obj = report2object(raw.slice(findindex(raw, 'wind'), findindex(raw, 'trendcode')));
				for (let each in obj) {
					result[each] = obj[each];
				}
				n = findindex(raw, 'trendcode');
				//趋势报
				let tr = [];
				while (n < raw.length) {
					if (elementiswhat(raw[n]) === 'trendcode')
						tr.push(n);
					n++;
				}
				tr.push(raw.length);
				for (let i = 0; i < tr.length - 1; i++) {
					let trend = initTrend();
					obj = report2object(raw.slice(tr[i], tr[i + 1]));
					for (let each in obj) {
						trend[each] = obj[each];
					}
					result['trend'].push(trend);
				}
				break;
			}
		case /TAF/.test(raw[0]):
			{
				//报头
				while (n < findindex(raw, 'wind')) {
					let key = elementiswhat(raw[n]);
					if (key === "weather")
						result[0]['airport'] = raw[n];
					else
						result[0][key] = elementdecode(key, raw[n]);
					n++;
				}
				n = findindex(raw, 'tx');
				if (n) {
					while (n < raw.length && elementiswhat(raw[n]) != 'trendcode') {
						let key = elementiswhat(raw[n]);
						if (typeof(result[0][key]) != "undefined" && result[0][key] != "")
							result[0][key] = [result[0][key], elementdecode(key, raw[n])].join("|");
						else
							result[0][key] = elementdecode(key, raw[n]);
						n++;
					}
				}else{
					if(findindex(raw,'trendcode'))
						n=findindex(raw,'trendcode');
					else
						n=raw.length;
				}
				//常规报文
				let obj = report2object(raw.slice(findindex(raw, 'wind'), n));
				for (let i = 1; i < result.length; i++) {
					for (let each in obj) {
						result[i][each] = obj[each];
					}
				}
				//变化组
				n = findindex(raw, 'trendcode');
				if (n) {
					let tr = [];
					while (n < raw.length) {
						if (elementiswhat(raw[n]) === 'trendcode') {
							tr.push(Number(n));
						}
						n++;
					}
					tr.push(raw.length);
					let symbol = "";
					for (let i = 0; i < tr.length - 1; i++) {
						let arr = raw.slice(tr[i], tr[i + 1]),
							validtime = getTafValidTime(arr),
							tt = getTafValidTime(report),
							starttime, endtime;
						obj = report2object(arr.slice(2));
						switch (raw[tr[i]]) {
							case "FM":
								starttime = validtime['starttime'] - tt['starttime'];
								endtime = result.length - 1;
								symbol = "";
								break;
							case "BECMG":
								starttime = validtime['endtime'] - tt['starttime'];
								endtime = result.length - 1;
								symbol = "";
								break;
							case "TEMPO":
								starttime = validtime['starttime'] - tt['starttime'];
								endtime = validtime['endtime'] - tt['starttime'];
								symbol = "tempo";
								break;
							default:
								break;
						}
						if (starttime < 0) starttime = starttime + 24;
						if (endtime < starttime) endtime = endtime + 24;
						starttime++;
						endtime++;
						//console.log(validtime, result[starttime].currenttime, result[endtime].currenttime);
						for (let j = starttime; j <= endtime; j++) {
							for (let each in obj) {
								result[j][symbol + each] = obj[each];
							}
						}
					}
				}
				break;
			}
	}
	return result;
}

function report2object(elements) {
	let result = {},
		n = 0;
	while (n < elements.length) {
		let key = elementiswhat(elements[n]);
		let element = elementdecode(key, elements[n]);
		if (typeof(element) == "object") {
			for (let each in element) {
				result[each] = element[each];
			}
		} else {
			if (typeof(result[key]) != "undefined" && result[key] != "")
				result[key] = [result[key], elementdecode(key, elements[n])].join("|");
			else
				result[key] = elementdecode(key, elements[n]);
		}
		n++;
	}
	return result;
}

function elementdecode(key, code) {
	switch (true) {
		case /wind/.test(key):
			{
				return getWind(code);
			}
		case /metartemp/.test(key):
			{
				let temp = code.split("/");
				return {
					"t": temp[0],
					"td": temp[1]
				};
			}
		default:
			{
				return code;
			}
	}
}

function elementiswhat(code) {
	switch (true) {
		case /TAF/.test(code) || /METAR/.test(code) || /SPECI/.test(code):
			{
				return "head";
			}
		case /AUTO/.test(code):
			{
				return "auto";
			}
		case /AMD/.test(code):
			{
				return "amd";
			}
		case /COR/.test(code):
			{
				return "cor";
			}
		case /\d{6}Z/.test(code):
			{
				return "sendtime";
			}
		case /\d{6}/.test(code) || /\d{4}\/\d{4}/.test(code) || /AT/.test(code) || /FM/.test(code) || /TL/.test(code):
			{
				return "validtime";
			}
		case /MPS/.test(code) || /KT/.test(code):
			{
				return "wind";
			}
		case /\d{3}V\d{3}/.test(code):
			{
				return "wv";
			}
		case (/Q/.test(code)):
			{
				return "qnh";
			}
		case (/R\d{2}/.test(code)):
			{
				return "rvr";
			}
		case (/[FEWSCTBKNOVC]{3}\d{3}/.test(code) || /VV/.test(code) || /NSC/.test(code) || /\/\/\/\/\//.test(code)):
			{
				return "cloud";
			}
		case (/RE/.test(code)):
			{
				return "re";
			}
		case (/TX/.test(code)):
			{
				return "tx";
			}
		case (/TN/.test(code)):
			{
				return "tn";
			}
		case (/\d{2}\/\d{2}/.test(code)):
			{
				return "metartemp";
			}
		case /BECMG/.test(code) || /TEMPO/.test(code) || /NOSIG/.test(code):
			{
				return "trendcode";
			}
		case /\d{4}/.test(code):
			{
				return "vis";
			}
		default:
			return "weather";
	}
}

function initMetar() {
	let result = {},
		metaritems = ["head", "cor", "sendtime", "auto", "wd", "wv", "ws", "gust", "vis", "rvr", "weather", "cloud",
			"t", "td", "airport",
			"qnh", "re"
		];
	// 	"trendcode", "trwd", "trws", "trgust", "trvis", "trweather", "trcloud"
	// ];
	for (let i in metaritems) {
		result[metaritems[i]] = ""
	}
	result.trend = [];
	return result;
}

function initTrend() {
	let result = {},
		trenditems = ['trendcode', 'validtime', 'wd', 'ws', 'gust', 'vis', 'weather', 'cloud'];
	for (let i in trenditems) {
		result[trenditems[i]] = "";
	}
	return result;
}

function initTaf(apTaf) {
	let tafheads = ["head", "amd", "cor", "airport", "sendtime", "validtime", "tx", "tn"],
		tafitems = ["wd", "ws", "gust", "vis", "weather", "cloud", "tempowd", "tempows", "tempogust", "tempovis",
			"tempoweather", "tempocloud"
		],
		validtime = getTafValidTime(apTaf),
		length = validtime["endtime"] - validtime["starttime"] + 26,
		result = [];
	if (length === 35) length = 11;
	result[0] = {};
	for (let i in tafheads) {
		result[0][tafheads[i]] = "";
	}
	for (let i = 1; i < length; i++) {
		result[i] = {};
		if (i + validtime["starttime"] < 25) {
			result[i].currenttime = i + validtime["starttime"] - 1;
		} else if (i + validtime["starttime"] >= 25) {
			result[i].currenttime = i + validtime["starttime"] - 25;
		}
		for (let j in tafitems) {
			result[i][tafitems[j]] = ""
		}
	}
	return result;
}

function getTafValidTime(taf) {
	let result = {};
	if (/ \d{6} /.test(taf)) {
		let time = / \d{6} /.exec(taf)[0].replace(' ', '');
		result.starttime = Number(time.substr(2, 2));
		result.endtime = Number(time.substr(4, 2));
	} else if (/\d{4}\/\d{4}/.test(taf)) {
		let time = /\d{4}\/\d{4}/.exec(taf)[0];
		result.starttime = Number(time.substr(2, 2));
		result.endtime = Number(time.substr(7, 2));
	} else if (/\d{4}/.test(taf)) {
		let time = /\d{4}/.exec(taf)[0];
		result.starttime = Number(time.substr(0, 2));
		result.endtime = Number(time.substr(2, 2));
	} else if (/\d{6}/.test(taf)) {
		let time = /\d{6}/.exec(taf)[0];
		result.starttime = Number(time.substr(2, 2));
		result.endtime = 25;
	} else {
		result = false;
	}
	return result;
}

function findindex(array, key) {
	for (let each in array) {
		if (elementiswhat(array[each]) === key)
			return each;
	}
	return false;
}

function getWind(wind) {
	let wd = wind.substr(0, 3); //风向
	let ws, gust;
	if (wind.substr(3, 1) === "P") {
		ws = wind.substr(3, 3); //风速	
	} else {
		ws = wind.substr(3, 2); //风速
	}
	if (wind.search("G") > 0) {
		let z = wind.indexOf("G") + 1;
		if (wind.substr(z, 1) === "P") {
			gust = wind.substr(z, 3); //风速	
		} else {
			gust = wind.substr(z, 2); //风速
		}
	} else {
		gust = "";
	}
	return {
		"wd": wd,
		"ws": ws,
		"gust": gust
	};
}
