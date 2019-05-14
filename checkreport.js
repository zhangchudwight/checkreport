import userconfig from './userconfig.json';

let apMetar =
	"METAR ZGSZ 070600Z VRB23GP49MPS 0200 TSRA BKN004 BKN040 17/15 Q1015 BECMG AT0735 12008MPS 0800 BR FG GR +TSRA FEW015 OVC002 BKN025CB=";
//apMetar = "METAR ZGSZ 190830Z 20005MPS CAVOK 23/21 Q1012 NOSIG= ";
apMetar = "METAR ZBSN 100800Z AUTO 20003MPS 160V240 9999 // ///// 18/M13 Q1014=";
let apTaf =
	"TAF ZGSZ 230423Z 230615 04004MPS 5000 BR SCT015 OVC030 TX19/06Z TN17/15Z TEMPO 1014 33008G17MPS 0800 SHRA VV001 FEW020CB BKN030=";
//apTaf="TAF ZGSZ 230321Z 2306/2406 04004MPS 6000 SCT015 OVC030 TX20/2306Z TN16/2321Z TEMPO 2402/2306 SHRA SCT015 FEW025CB OVC030=";


//TAF的初始化key
let tafheads = ["head", "amd", "cor", "airport", "sendtime", "validtime", "tx", "tn"];
let tafitems = ["wd", "ws", "gust", "vis", "weather", "cloud", "tempowd", "tempows", "tempogust", "tempovis",
	"tempoweather", "tempocloud"
];
//METAR的初始化key
let metaritems = ["head", "correct", "sendtime", "auto", "wd", "wv", "ws", "gust", "vis", "rvr", "weather", "cloud",
	"t", "td",
	"qnh", "re",
	"trendcode", "trwd", "trws", "trgust", "trvis", "trweather", "trcloud"
];
//metar为key-value值，taf为数组下的key-value值taf=[]{}
let metar = {},
	taf;
//getMetar getTaf为解析报文部分 getMetar只支持一组趋势报 getTaf若要分析新规范的报文需在getTaf中注释旧方法，反注释新方法。
metar = getMetar(apMetar);
console.log(metar);
console.log(analysisReport(metar));
taf = getTaf(apTaf);
console.log(taf);
console.log(analysisReport(taf[7]));

/*-- analysisReport为分析METAR SPECI TAF是否有红黄色天气要素，天气要素阈值在userconfig.json里设置，默认为default，不同机场使用四字代码作key，例如广州机场需要特殊设置，加入"ZGGG":{}。
JSON文件中"type"对应天气要素，wd风向 ws风速 gust阵风 vis能见度 rvrRVR weather天气现象，
数值区间用~隔开，例如:小于17 ~17 大于30 30~ 20-30 20~30
天气现象写天气现象代码，RA-night RA-day代表夜间中雨和白天中雨
完成检测后返回多维数组，0为red数组，1为yellow数组
red yellow数组每项为需要预警的天气要素，0为天气要素类型及出现的位置，例如检查metar，返回vis为报文能见度，trvis为趋势报能见度 1为具体天气
--*/
function analysisReport(report) {
	let red = new Array(),
		yellow = new Array(),
		key = "";
	let checkitems = ["", "tr", "tempo"];
	let attcode = userconfig[report.airport];
	if (typeof(attcode) == "undefined")
		attcode = userconfig["default"];
	for (let i = 0; i < attcode.length; i++) {
		switch (true) {
			// case /wd/.test(attcode[i]["type"]):
			// 	for (let z = 0; z < checkitems.length; z++) {
			// 		key = checkitems[z] + attcode[i]["type"];
			// 		if (typeof(report[key]) === "undefined" || report[key] == "") continue;
			// 		wd = attcode[i]["info"].split("~");
			// 		if (wd[0] < wd[1]) {
			// 			if (Number(report[key]) >= Number(wd[0]) && Number(report[key]) <= Number(wd[1])) {
			// 				isRed(attcode[i], key, report[key], red, yellow);
			// 			}
			// 		} else {
			// 			if (Number(report[key]) >= Number(wd[0]) || Number(report[key]) <= Number(wd[1])) {
			// 				isRed(attcode[i], key, report[key], red, yellow);
			// 			}
			// 		}
			// 	}
			// 	continue;
			case /ws/.test(attcode[i]["type"]) || /gust/.test(attcode[i]["type"]) || /vis/.test(attcode[i]["type"]):
				for (let z = 0; z < checkitems.length; z++) {
					key = checkitems[z] + attcode[i]["type"];
					if (typeof(report[key]) === "undefined" || report[key] == "")
						continue;
					if (/P/.test(report[key])) {
						report[key] = "50";
					}
					let range = attcode[i]["info"].split("~");
					if (range[1] != "" && range[0] != "") {
						if (Number(report[key]) >= range[0] && Number(report[key]) < range[1]) {
							isRed(attcode[i], key, report[key], red, yellow);
						}
					} else if (range[1] == "" && range[0] != "") {
						if (Number(report[key]) >= range[0])
							isRed(attcode[i], key, report[key], red, yellow);
					} else if (range[0] == "" && range[1] != "") {
						if (Number(report[key]) < range[1])
							isRed(attcode[i], key, report[key], red, yellow);
					}
					if (report[key] === "50") {
						report[key] = "P49";
					}

				}
				continue;
			case /rvr/.test(attcode[i]["type"]):
				for (let z = 0; z < checkitems.length; z++) {
					key = checkitems[z] + attcode[i]["type"];
					if (report[key] == "" || typeof(report[key]) === "undefined") continue;
					let range = attcode[i]["info"].split("~");
					if (range[1] != "" && range[0] != "") {
						if (Number(report[key].substr(4, 4)) >= range[0] && Number(report[key].substr(4, 4)) < range[1] ||
							/M/.test(report[key]))
							isRed(attcode[i], key, report[key], red, yellow);
					} else if (range[1] == "" && range[0] != "") {
						if (Number(report[key].substr(4, 4)) >= range[0] || /M/.test(report[key]))
							isRed(attcode[i], key, report[key], red, yellow);
					} else if (range[0] == "" && range[1] != "") {
						if (Number(report[key].substr(4, 4)) < range[1] || /M/.test(report[key]))
							isRed(attcode[i], key, report[key], red, yellow);
					}

				}
				continue;
			case /weather/.test(attcode[i]["type"]):
				{
					let attweathers = attcode[i]["info"];
					for (let z = 0; z < checkitems.length; z++) {
						key = checkitems[z] + attcode[i]["type"];
						if (typeof(report[key]) === "undefined" || report[key] == "")
							continue;
						let weathers = report[key].split("|");
						for (let k = 0; k < attweathers.length; k++) {
							for (let j = 0; j < weathers.length; j++) {
								if (RegExp(attweathers[k]).test(weathers[j])) {
									isRed(attcode[i], key, weathers[j], red, yellow);
									attweathers[k] = attweathers[k] + "havechecked";
								}
								let ctime;
								if (typeof(report.sendTime) == "undefined")
									ctime = Number(report.currenttime);
								else
									ctime = Number(report.sendTime.substr(2, 2));
								if (attweathers[k].search("RA-night") >= 0 && (weathers[j] == "SHRA" || weathers[j] == "RA")) {

									if (ctime >= 12)
										isRed(attcode[i], key, weathers[j], red, yellow);
								} else if (attweathers[k].search("RA-day") >= 0 && (weathers[j] == "SHRA" || weathers[j] == "RA")) {
									if (ctime < 12)
										isRed(attcode[i], key, weathers[j], red, yellow);
								}
							}
						}
					}
					continue;
				}
			case /cloud/.test(attcode[i]["type"]):
				for (let z = 0; z < checkitems.length; z++) {
					key = checkitems[z] + attcode[i]["type"];
					if (typeof(report[key]) === "undefined" || report[key] == "")
						continue;
					let clouds = report[key].split("|");
					let range = attcode[i]["info"].split("~");
					for (let j = 0; j < clouds.length; j++) {
						if (/[BKNOVC]{3}/.test(clouds[j]) || /VV/.test(clouds[j])) {
							if (range[1] != "" && range[0] != "") {
								if (Number(/\d{3}/.exec(clouds[j])[0]) >= range[0] && Number(/\d{3}/.exec(clouds[j])[0]) < range[1])
									isRed(attcode[i], key, clouds[j], red, yellow);
							} else if (range[1] == "" && range[0] != "") {
								if (Number(/\d{3}/.exec(clouds[j])[0]) >= range[0])
									isRed(attcode[i], key, clouds[j], red, yellow);
							} else if (range[0] == "" && range[1] != "") {
								if (Number(/\d{3}/.exec(clouds[j])[0]) < range[1])
									isRed(attcode[i], key, clouds[j], red, yellow);
							}
						}
					}
				}
				continue;
			default:
				break;
		}
	}
	return [red, yellow];
}

function isRed(code, key, element, red, yellow) {
	if ((key === "ws" || key === "gust") && element === "50") {
		element = "P49";
	}
	if (code["code"] == "red")
		red.push([key, element]);
	else if (code["code"] == "yellow")
		yellow.push([key, element]);
	//eval(code["code"] + ".push([key,element])");
}

function getTaf(apTaf) {
	let rawTaf = apTaf.substr(0, apTaf.length - 1).split(" ");
	let taf = new Array();
	//寻找TAF有效时间
	let n = 0;
	//新报文格式
	// 	while (!/\d{4}\/\d{4}/.test(rawTaf[n])) n++;
	// 	tt = parseInt(rawTaf[n].substr(2, 2), 10);
	// 	validtt = parseInt(rawTaf[n].substr(7, 2), 10) - parseInt(rawTaf[n].substr(2, 2), 10) + 26;	
	// 	//老报文格式
	while (!/\d{6}/.test(rawTaf[n]) || /Z/.test(rawTaf[n])) n++;
	let tt = Number(rawTaf[n].substr(2, 2));
	let validtt = parseInt(rawTaf[n].substr(4, 2), 10) - parseInt(rawTaf[n].substr(2, 2), 10) + 26;
	if (validtt == 35) validtt = 11;
	//创建taf数组
	/*--
	建立有效时间小时数+1的数组
	[0]含有报文不变要素：
	.head 报头
	.amd 修订
	.cor 更正
	.airport 机场代码
	.sendtime 发报时间
	.validtime 有效时间
	.tx 最高温度
	.tn 最低温度
	[n]n为taf报文有效时间里对应的小时序号，内含有预报要素：
	.currenttime n点钟
	.wd 风向
	.ws 风速
	.gust 阵风
	.vis 能见度
	.weather 天气现象
	.cloud 云组
	.tempowd tempo风向
	.tempows tempo风速
	.tempogust tempo阵风
	.tempovis tempo能见度
	.tempoweather tempo天气现象
	.tempocloud tempo云组
	--*/
	//初始化taf
	for (let i = 0; i < tafheads.length; i++) {
		taf[0] = {};
		taf[0][tafheads[i]] = "";
	}
	for (let i = 1; i < validtt; i++) {
		taf[i] = {};
		if (i + tt < 25)
			taf[i].currenttime = i + tt - 1;
		else if (i + tt >= 25) {
			taf[i].currenttime = i + tt - 25;
		}
		for (let j = 0; j < tafitems.length; j++) {
			taf[i][tafitems[j]] = "";
		}
	}

	taf[0].head = "TAF";
	taf[0].amd = apTaf.match(/AMD/);
	taf[0].cor = apTaf.match(/COR/);
	taf[0].airport = apTaf.match(/\w{4}/)[0];
	taf[0].sendtime = /\d{6}Z/.exec(rawTaf)[0];
	//taf[0].validtime=/\d{4}\/\d{4}/.exec(apTaf)[0];
	taf[0].validtime = / \d{6} /.exec(apTaf)[0].substr(1, 6);


	while (rawTaf[n].search("MPS") < 0) n++;
	//记录风向
	for (let i = 1; i < validtt; i++) {
		let warr = getWind(rawTaf[n]);
		taf[i].wd = warr[0];
		taf[i].ws = warr[1];
		taf[i].gust = warr[2];
	}
	n = n + 1;
	//判定是否为CAVOK
	if (rawTaf[n] == "CAVOK") {
		for (let i = 1; i < validtt; i++) {
			taf[i].vis = "CAVOK";
			taf[i].weather = "CAVOK";
			taf[i].cloud = "CAVOK";
		}
		n++;
	} else {
		//能见度
		for (let i = 1; i < validtt; i++) {
			taf[i].vis = rawTaf[n];
		}
		n++;
		//天气现象
		let weathers = new Array();
		while (!/[FEWSCTBKNOVC]{3}\d{3}/i.test(rawTaf[n]) && !/NSC/.test(rawTaf[n]) && !/VV/.test(rawTaf[n])) {
			weathers.push(rawTaf[n]);
			n = n + 1;
		}
		for (let i = 1; i < validtt; i++) {
			taf[i].weather = weathers.join("|");
		}
		//云组
		let clouds = new Array();
		while (/[FEWSCTBKNOVC]{3}\d{3}/i.test(rawTaf[n]) || /NSC/.test(rawTaf[n]) || /VV/.test(rawTaf[n])) {
			clouds.push(rawTaf[n]);
			n = n + 1;
		}
		for (let i = 1; i < validtt; i++) {
			taf[i].cloud = clouds.join("|");
		}
	}
	//新温度组
	// 		let tx = new Array();
	// 		let tn = new Array();
	// 		while (/\d{2}Z/.test(rawTaf[n]) && n < rawTaf.length > 0) {
	// 			if (rawTaf[n].search("TX") >= 0) tx.push(rawTaf[n]);
	// 			else tn.push(rawTaf[n]);
	// 			n++;
	// 		}
	// 		taf[0].tx = tx.join("|");
	// 		taf[0].tn = tn.join("|");
	//旧方法
	taf[0].tx = rawTaf[n];
	n++;
	taf[0].tn = rawTaf[n];
	n++;
	//变化组
	let starttime = 0
	let endtime = 0;
	while (n < rawTaf.length) {
		n++;
		let judge;
		switch (rawTaf[n - 1]) {
			case "FM":
				//旧FM
				starttime = Number(rawTaf[n].substr(0, 2)) - tt;
				// 				//新FM
				// 				starttime = parseInt(rawTaf[n].substr(2, 2), 10) - tt;
				endtime = validtt - 1;
				judge = true;
				break;
			case "BECMG":
				//旧BECMG
				starttime = Number(rawTaf[n].substr(2, 2)) - tt;
				// 				//新BECMG
				// 				starttime = parseInt(rawTaf[n].substr(7, 2), 10) - tt;
				endtime = validtt - 1;
				judge = true;
				break;
			case "TEMPO":
				//旧TEMPO
				starttime = Number(rawTaf[n].substr(0, 2)) - tt;
				endtime = Number(rawTaf[n].substr(2, 2)) - tt + 1;
				// 				//新TEMPO
				// 				starttime = parseInt(rawTaf[n].substr(2, 2), 10) - tt;
				// 				endtime = parseInt(rawTaf[n].substr(7, 2), 10) - tt+1 ;
				judge = false;
				break;
			default:
				break;
		}
		if (starttime < 0) starttime = starttime + validtt - 1;
		if (endtime < starttime) endtime = endtime + validtt - 1;
		starttime++;
		endtime++;

		n++;
		let clouds = new Array();
		let weathers = new Array();
		while (rawTaf[n] != "FM" && rawTaf[n] != "BECMG" && rawTaf[n] != "TEMPO" && n < rawTaf.length) {
			switch (true) {
				case /MPS/.test(rawTaf[n]): //风
					{
						let warr = getWind(rawTaf[n]);
						for (let i = starttime; i < endtime; i++) {
							if (judge) {
								taf[i].wd = warr[0];
								taf[i].ws = warr[1];
								taf[i].gust = warr[2];
							} else {
								taf[i].tempowd = warr[0];
								taf[i].tempows = warr[1];
								taf[i].tempogust = warr[2];
							}
						}
						n++;
						break;
					}
				case /\d{4}/.test(rawTaf[n]): //能见度
					for (let i = starttime; i < endtime; i++) {
						if (judge)
							taf[i].vis = rawTaf[n];
						else
							taf[i].tempovis = rawTaf[n];
					}
					n++;
					break;
				case /[FEWSCTBKNOVC]\d{3}/.test(rawTaf[n]) || /NSC/.test(rawTaf[n]) || /VV\d{3}/.test(rawTaf[n]): //云组
					clouds.push(rawTaf[n]);

					n++;
					break;
				default: //天气现象
					weathers.push(rawTaf[n]);

					n++;
					break;
			}
		}
		for (let i = starttime; i < endtime; i++) {
			if (judge) {
				if (clouds.length > 0) taf[i].cloud = clouds.join("|");
				if (weathers.length > 0) taf[i].weather = weathers.join("|");
			} else {
				if (clouds.length > 0) taf[i].tempocloud = clouds.join("|");
				if (weathers.length > 0) taf[i].tempoweather = weathers.join("|");
			}
		}
	}

	return taf;
}

function getMetar(apMetar) {
	let metar = {};
	for (let i = 0; i < metaritems.length; i++) {
		metar[metaritems[i]] = "";
	}
	let rawMetar = apMetar.substr(0, apMetar.length - 1).split(" ");
	let n = 0;
	/*--getMetar返回的metar中为key-value方式，key值如下：
	.head 报头
	.correct 更正
	.airport 机场代码
	.sendtime 时次
	.auto 自动报标记
	.wd 风向
	.ws 风速
	.gust 阵风
	.wv 风向变化区间
	.vis 能见度
	.weather 天气现象
	.cloud 云组
	.t 温度
	.td 露点
	.qnh 气压
	.re 近时天气
	.trcode 趋势报包头
	.trvalidtime 趋势报有效时间
	.trwd 趋势报风向
	.trws 趋势报风速
	.trgust 趋势报阵风
	.trvis 趋势报能见度
	.trweather 趋势报天气现象
	.trcloud 趋势报云组
	-*/
	//报头
	metar.head = rawMetar[n];
	n = n + 1;
	//判定更正与否
	if (apMetar.search("COR") >= 0) {
		metar.correct = rawMetar[n];
		n = n + 1;
	} else {
		metar.correct = "";
	}
	//机场代码
	metar.airport = rawMetar[n];
	n = n + 1;
	//时间组
	metar.sendtime = rawMetar[n];
	n = n + 1;
	if (/AUTO/.test(rawMetar[n])) {
		metar.auto = rawMetar[n];
		n++;
	}
	//风向风速
	let warr = getWind(rawMetar[n]);
	metar.wd = warr[0];
	metar.ws = warr[1];
	metar.gust = warr[2];
	n = n + 1;
	//风向变化区间
	if (/\d{3}V\d{3}/.test(rawMetar[n])) {
		metar.wv = rawMetar[n];
		n++;
	} else
		metar.wv = "";
	//判断是否为CAVOK
	if (rawMetar[n] === "CAVOK") {
		metar.vis = "CAVOK";
		metar.weather = "CAVOK";
		metar.cloud = "CAVOK";
		n++;
	} else {
		//能见度
		metar.vis = rawMetar[n];
		n = n + 1;
		//RVR
		let rvrs = new Array();
		while (rawMetar[n].search(/[R]\d{2}/i) >= 0) {
			rvrs.push(rawMetar[n]);
			n = n + 1;
		}
		metar.rvr = rvrs.join("|");
		//天气现象
		let weathers = new Array();
		while (!/[FEWSCTBKNOVC]{3}\d{3}/i.test(rawMetar[n]) && !/VV/.test(rawMetar[n]) && !/NSC/.test(rawMetar[n]) && !
			/\/\/\/\/\//.test(rawMetar[n])) {
			weathers.push(rawMetar[n]);
			n = n + 1;
		}
		metar.weather = weathers.join("|");
		//云
		let clouds = new Array();
		while ((/[FEWSCTBKNOVC]{3}\d{3}/.test(rawMetar[n]) || /VV/.test(rawMetar[n]) || /NSC/.test(rawMetar[n]) ||
				/\/\/\/\/\//.test(rawMetar[n])) && n < rawMetar.length) {

			clouds.push(rawMetar[n]);
			n = n + 1;
		}
		metar.cloud = clouds.join("|");
	}
	//气温露点
	metar.t = rawMetar[n].split("/")[0];
	metar.td = rawMetar[n].split("/")[1];
	n = n + 1;
	//气压
	metar.qnh = rawMetar[n].substring(1, 5);
	n = n + 1;
	if (/RE/.test(rawMetar[n])) {
		metar.re = rawMetar[n];
		n++;
	}
	//趋势报
	switch (true) {
		case /NOSIG/.test(rawMetar[n]):
			metar.trcode = "NOSIG";
			return metar;
		case /BECMG/.test(rawMetar[n]):
			metar.trcode = rawMetar[n];
			n++;
			if (/AT/.test(rawMetar[n])) {
				metar.trvalidTime = rawMetar[n];
				n++;
			} else {
				while (/[FMTL]{2}/.test(rawMetar[n])) {
					metar.trvalidTime = metar.trvalidTime + " " + rawMetar[n];
					n++;
				}
			}
			break;
		case /TEMPO/.test(rawMetar[n]):
			metar.trcode = rawMetar[n];
			n = n + 1;
			break;
		default:
			break;
	}

	let clouds = new Array();
	let weathers = new Array();
	for (let i = n; i < rawMetar.length; i++) {
		switch (true) {
			case rawMetar[i].search("MPS") > 0:
				{
					let twarr = getWind(rawMetar[i]);
					metar.trwd = twarr[0];
					metar.trws = twarr[1];
					metar.trgust = twarr[2];
					break;
				}
			case /\d{4}/.test(rawMetar[i]): //能见度
				metar.trvis = rawMetar[i];
				break;
			case /[FEWSCTBKNOVC]\d{3}/.test(rawMetar[i]) || /VV\d{3}/.test(rawMetar[i]) || /NSC/.test(rawMetar[i]): //云组
				clouds.push(rawMetar[i]);
				break;
			default: //天气现象
				weathers.push(rawMetar[i]);
				break;
		}

	}
	metar.trcloud = clouds.join("|");
	metar.trweather = weathers.join("|");
	return metar;
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
	return [wd, ws, gust];
}

export {
	analysisReport,
	getTaf,
	getMetar
};
