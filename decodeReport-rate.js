const dict = {
	"TAF|METAR|SPECI": "head",
	"AUTO": "auto",
	"AMD": "amd",
	"COR": "cor",
	"\\d{6}Z": "sendtime",
	"\\d{6}|\\d{4}\\/\\d{4}|FM|TL": "validtime",
	"MPS|KT": "wind",
	"\\d{3}V\\d{3}": "wv",
	"Q\\d{4}": "qnh",
	"R\\d{2}": "rvr",
	"CAVOK": "CAVOK",
	"FEW|SCT|BKN|OVC|VV|/////": "cloud",
	"RE": "re",
	"TX\\S\+Z": "tx",
	"TN\\S\+Z": "tn",
	"\\d{2}\\/\\d{2}": "metartemp",
	"BECMG|TEMPO|NOSIG": "trendcode",
	"\\d{4}": "vis",
};
//const fs=require('fs');
// dict=JSON.parse(fs.readFileSync('decodedict.json'))
//fs.writeFile('decodedict.json',JSON.stringify(dict));

const apTaf =
	"TAF AMD VHHH 120936Z 1206/1312 18010KT 8000 FEW015 SCT025 TX31/1306Z TN24/1221Z TEMPO 1209/1215 2500 -TSRA SHRA FEW010CB SCT025 TEMPO 1209/1218 09010KT TEMPO 1218/1221 3500 SHRA FEW012CB SCT025 TEMPO 1221/1303 VRB15G25KT 2500 TSRA SHRA FEW010 SCT020CB BKN040 TEMPO 1306/1312 3500 SHRA FEW012CB SCT025=";
// let apTaf =
// 	"TAF ZGSZ 230423Z 230615 04004MPS 5000 BR SCT015 OVC030 TX19/06Z TN17/15Z TEMPO 1014 33008G17MPS 0800 SHRA VV001 FEW020CB BKN030=";
// 
// const apMetar =
// 	"SPECI ZGSZ 230930Z AUTO 08005MPS 040V110 8000 -SHRA FEW015 FEW020CB BKN040 26/24 Q1008 RESHRA BECMG FM0940 TL1040 TSRA FG GR SCT011 FEW020CB BKN030 TEMPO 33006G12MPS 0800 +TSRA OVC002=";
console.log(decodeReport(apTaf));
//console.log(decodeReport(apMetar));


function decodeReport(report) {
	let raw = report.replace("=", "").split(" "),
		result,
		n = 0;
	if (/METAR|SPECI/.test(report)) {
		result = initMetar();
	} else if (/TAF/.test(report)) {
		result = initTaf(report);
	}
	switch (true) {
		case /METAR|SPECI/.test(raw[0]):
			{
				//报头部分
				result['report'] = report;
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
				result[0]['report'] = report;
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
					n = findindex(raw, 'tx');
				} else {
					if (findindex(raw, 'trendcode'))
						n = findindex(raw, 'trendcode');
					else
						n = raw.length;
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
							starttime = 0,
							endtime = 0;
						obj = report2object(arr.slice(2));
						switch (raw[tr[i]]) {
							case "FM":
								starttime = validtime['starttime'] - tt['starttime'];
								if (validtime['startdate'] > tt['startdate'])
									starttime = starttime + 24;
								endtime = result.length - 1;
								symbol = "";
								break;
							case "BECMG":
								starttime = validtime['endtime'] - tt['starttime'];
								if (validtime['enddate'] > tt['startdate'])
									starttime = starttime + 24;
								endtime = result.length - 1;
								symbol = "";
								break;
							case "TEMPO":
								starttime = validtime['starttime'] - tt['starttime'];
								if (validtime['startdate'] > tt['startdate'])
									starttime = starttime + 24;
								endtime = validtime['endtime'] - tt['starttime'];
								if (validtime['enddate'] > tt['startdate'])
									endtime = endtime + 24;
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
								if (symbol != "" && obj[each] != "") {
									result[j][symbol + each] = {
										"validtime": arr[1],
										"value": obj[each]
									};
								} else
									result[j][each] = obj[each];
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
		let key = elementiswhat(elements[n]),
			element = elementdecode(key, elements[n]);
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
		case /CAVOK/.test(key):
			{
				return {
					"vis": "9999",
					"cloud": "NSC"
				}
			}
		default:
			{
				return code;
			}
	}
}

function elementiswhat(code) {
	for (let element in dict) {
		if (RegExp(element).test(code)) {
			return dict[element];
		}
	}
	return 'weather';
}

function initMetar() {
	let result = {},
		metaritems = ["head", "cor", "sendtime", "auto", "wd", "wv", "ws", "gust", "vis", "rvr", "weather", "cloud",
			"t", "td", "airport", "report",
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
	let tafheads = ["head", "amd", "cor", "airport", "sendtime", "validtime", "tx", "tn", "report"],
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
		result.startdate = Number(time.substr(0, 2));
		result.endtime = Number(time.substr(4, 2));
		result.enddate = 0;
	} else if (/\d{4}\/\d{4}/.test(taf)) {
		let time = /\d{4}\/\d{4}/.exec(taf)[0];
		result.starttime = Number(time.substr(2, 2));
		result.startdate = Number(time.substr(0, 2));
		result.endtime = Number(time.substr(7, 2));
		result.enddate = Number(time.substr(5, 2));
	} else if (/\d{4}/.test(taf)) {
		let time = /\d{4}/.exec(taf)[0];
		result.starttime = Number(time.substr(0, 2));
		result.startdate = 0;
		result.endtime = Number(time.substr(2, 2));
		result.enddate = 0;
	} else if (/\d{6}/.test(taf)) {
		let time = /\d{6}/.exec(taf)[0];
		result.starttime = Number(time.substr(2, 2));
		result.startdate = Number(time.substr(0, 2));
		result.endtime = 25;
		result.enddate = 0;
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
