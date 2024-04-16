const app = require("express")()
const ip = require("ip")
const PORT = 3031
const connectionURL = "mongodb://127.0.0.1:27017"
const MongoClient = require("mongodb").MongoClient
//*******************************
function liste(tabelle){//[{_id}]
	let ans=`<!DOCTYPE html>
<html><head><meta http-equiv="content-type" content="text/html; charset=UTF-8"><title>Einkaufliste</title><style>
*	{font-size:30px;	font-family:sans-serif;}
input	{width:300px;}</style><script>
function ch(k,v){window.location.assign("/liste/upd?k="+k+"&v="+v)}
function add(v){window.location.assign("/liste/add?v="+v)}
</script>
</head><body><ol>`
	tabelle.forEach((x)=>{ans += `<li><input type="text" value="${x._id}" onchange="ch('${x._id}',this.value)"> <button onclick="ch('${x._id}','')">X</button></li>`})
	return ans+`</ol><textarea rows="10" cols="25" onchange="add(this.value.replace(/\\n/gm,','))"></textarea></body></html>`
}
app.get("/liste/add", (req, res)=> {
	(async () => {
		let client = await MongoClient.connect(connectionURL,{useUnifiedTopology:true})
		try {
			const collection = client.db("db").collection("liste")
			await collection.insertMany(req.query.v.replace(/\"/g,'').replace(/\'/g,'').split(',').map(x=>({_id:x})))
			await collection.deleteMany({_id:""})
		} finally {
			client.close()
			res.redirect("/liste")
		}
	})().catch(err => console.error(err))
})
app.get("/liste/upd", (req, res) => {
	(async () => {
		let client = await MongoClient.connect(connectionURL,{useUnifiedTopology:true})
		try {
			const collection = client.db("db").collection("liste")
			await collection.deleteOne({_id:req.query.k})
			if(req.query.v){
				await collection.insertOne({_id:req.query.v})
			}
		} finally {
			client.close()
			res.redirect("/liste")
		}
	})().catch(err => console.error(err))
})
app.get("/liste", (req, res) => {
	(async () => {
		let client = await MongoClient.connect(connectionURL,{useUnifiedTopology:true}), result
		try {
			result = await client.db("db").collection("liste").find().sort({_id:1}).toArray()
		} finally {
			client.close()
			res.send(liste(result))
		}
	})().catch(err => console.error(err))
})
//*******************************
function energie(tabelle){//[{Datum:[Elektro,Gas,Wasser]}]
	return `<!DOCTYPE html>
<html><head><meta http-equiv="content-type" content="text/html; charset=UTF-8">
<title>Energie</title><link rel="stylesheet" href="https://cdn.jsdelivr.net/chartist.js/latest/chartist.min.css">
<script src="https://cdn.jsdelivr.net/chartist.js/latest/chartist.min.js"></script><style>
*	{font-size:30px;	font-family:sans-serif;}
.tfoot td	{font-weight: bold;}
h3	{text-align:center;}
td	{text-align:center;	border:1px solid gray;	min-width:5em;}
input	{text-align:center;	border:2px solid green;	width:5em;}
.Datum	{width:7em;}
.Elektro	{background-color:#ddd;}
.Gas	{background-color:#ffc;}
.Wasser	{background-color:#ccf;}
.submit	{background-color:#cfc;}
</style></head><body>
<h3>Strom</h3><div class="ct-chart" id="chart1"></div>
<h3>Gas</h3><div class="ct-chart" id="chart2"></div>
<h3>Wasser</h3><div class="ct-chart" id="chart3"></div>
<div id="tabelle"></div>
<script>
let Tabelle=${JSON.stringify(tabelle)};
const EGW=["Elektro","Gas","Wasser"]
function h(a){ans += '<th class="'+a+'">'+a+'</th>'}
function d(a,b){ans += '<td class="'+a+'">'+b+'</td>'}
function jaerlich(x){
	ans += '<tr class="tfoot">';let d3=x.Datum.substr(0,5)+'12-31';d("Datum",d3)
	for(let j=0;j<=2;j++){
		let k=0, p=Number(x.EGW[j]), p0=Number(Tabelle[0].EGW[j])
		if(p>0){k=(p-p0)*(new Date(d3)-new Date(Tabelle[0].Datum))/(new Date(x.Datum)-new Date(Tabelle[0].Datum))}
		d(EGW[j],Number(k+p0).toFixed(0))
	}
	ans += '</tr>'
}
let labels=[],series1=[],series2=[],series3=[],a
let ans='<table><tbody><tr>';h("Datum");EGW.forEach(x => h(x));EGW.forEach(x => h(x));ans +='</tr>'
if(Tabelle.length>0){
	ans += '<tr>';d("Datum",Tabelle[0].Datum);for(let j=0; j<=2; j++){d(EGW[j],Tabelle[0].EGW[j])}
	ans += '<td colspan="3" rowspan="1">monatlich</td></tr>'
	for(let i=1;i<Tabelle.length;i++){
		let x=Tabelle[i],d1=(new Date(x.Datum)-new Date(Tabelle[i-1].Datum))/86400000/30.4;labels.push(x.Datum)
		ans += '<tr>';d("Datum",x.Datum);for(j=0;j<=2;j++){d(EGW[j],x.EGW[j])};
		a=((x.EGW[0]-Tabelle[i-1].EGW[0])/d1).toFixed(2);d(EGW[0],a);series1.push(a)
		a=((x.EGW[1]-Tabelle[i-1].EGW[1])/d1).toFixed(2);d(EGW[1],a);series2.push(a)
		a=((x.EGW[2]-Tabelle[i-1].EGW[2])/d1).toFixed(2);d(EGW[2],a);series3.push(a)
		ans += '</tr>'
	}
	jaerlich(Tabelle[Tabelle.length-1])
}
ans += '</tbody></table><form action="upd"><input type="date" class="Datum" name="Datum">'
EGW.forEach(a => {ans += '<input type="number" class="'+a+'" name="'+a+'">'})
ans += '<input type="submit" class="submit" value="Enter"></form>'
document.getElementById("tabelle").innerHTML = ans
let options={height:400,chartPadding: {left:50}}
new Chartist.Line('#chart1',{labels,series:[series1]},options)
new Chartist.Line('#chart2',{labels,series:[series2]},options)
new Chartist.Line('#chart3',{labels,series:[series3]},options)
</script>
</body></html>`
}
app.get("/energie/upd", (req, res) => {
	(async () => {
		let client = await MongoClient.connect(connectionURL,{useUnifiedTopology:true})
		try {
			const collection = client.db("db").collection("energie")
			let a1={Datum:req.query.Datum}, a2={$set:{EGW:[req.query.Elektro,req.query.Gas,req.query.Wasser]}}, result=await collection.find(a1).toArray()
			if (0 == result.length) {await collection.insertOne(a1)}
			await collection.updateOne(a1, a2)
			await collection.deleteOne({EGW:["","",""]})
		} finally {
			client.close()
			res.redirect("/energie")
		}
	})().catch(err => console.error(err))
})
app.get("/energie", (req, res) => {
	(async () => {
		let client = await MongoClient.connect(connectionURL,{useUnifiedTopology:true}), result
		try {
			result = await client.db("db").collection("energie").find({},{projection:{_id:0}}).sort({Datum:1}).toArray()
		} finally {
			client.close()
			res.send(energie(result))
		}
	})().catch(err => console.error(err))
})
//*******************************
function benzin(tabelle){//[{Datum:[Euro,Liter,Km,Zähler]}]
	return `<!DOCTYPE html>
<html><head><meta http-equiv="content-type" content="text/html; charset=UTF-8"><title>Benzin</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/chartist.js/latest/chartist.min.css">
<script src="https://cdn.jsdelivr.net/chartist.js/latest/chartist.min.js"></script><style>
*	{font-size:30px;	font-family:sans-serif;}
h3	{text-align:center;}
td	{text-align:center;	border:1px solid gray;	min-width:4em;}
td:nth-child(5),td:nth-child(6)	{text-align:right;	padding-right:15px;}
input	{text-align:center;	border:2px solid green;	width:4em;}
.em7	{width:7em;}
.tfoot	{font-weight: bold;	background-color:#fed;}
.submit	{font-weight: bold;	background-color:#efe;}
.fst	{background-color:#fff;}
.sec	{background-color:#eee;}
</style></head><body>
<h3>Km</h3><div class="ct-chart" id="chart1"></div>
<h3>L/100Km</h3><div class="ct-chart" id="chart2"></div>
<div id="tabelle"></div><script>
let Tabelle = ${JSON.stringify(tabelle)};
let ans='<table><tbody><tr><th class="em7">Datum</th><th>Euro</th><th>Liter</th><th>Km</th><th>€/Monat</th><th>Km/Monat</th><th>L/100Km</th><th>Cent/Km</th></tr>', cl='fst', s=[], EM=[], KmM=[]
s[0]=new Date(Tabelle[0].Datum).valueOf()
s[1]=s[0]*s[0]
s[2]=Number(Tabelle[0].ELK[2])
s[3]=s[0]*s[2]
s[4]=s[5]=0
let labels=[],series1=[],series2=[],a
for(let i=1; i<Tabelle.length; i++){
	let a=Tabelle[i].Datum;labels.push(a)
	let d=new Date(a).valueOf(), eur=Number(Tabelle[i].ELK[0]), km=Number(Tabelle[i].ELK[2]), JahrMon=Tabelle[i].Datum.substr(0,7)
	series1.push(km)
	let dKm=km-Number(Tabelle[i-1].ELK[2])
	Tabelle[i].L_Km = Number(Tabelle[i].ELK[1])/dKm*100;s[4]+=Tabelle[i].L_Km;series2.push(Tabelle[i].L_Km)
	Tabelle[i].ct_Km = eur/dKm*100;s[5]+=Tabelle[i].ct_Km
	s[0] += d; s[1] += d*d; s[2] += km; s[3] += d*km
	if(EM[JahrMon]){
		EM[JahrMon]+=eur; KmM[JahrMon]+=dKm
	}else{
		EM[JahrMon]=eur; KmM[JahrMon]=dKm
	}
	if(JahrMon==Tabelle[i-1].Datum.substr(0,7)){
		Tabelle[i-1].E_Monat = Tabelle[i-1].Km_Monat = 0
	}else{
		cl=(cl=='fst')?'sec':'fst'
	}
	Tabelle[i].E_Monat = EM[JahrMon]
	Tabelle[i].Km_Monat = KmM[JahrMon]
	Tabelle[i].cl=cl
}
let d=Tabelle[Tabelle.length-1].Datum.substr(0,5)+"12-31"
Tabelle.push({Datum:d,ELK:["","",((Tabelle.length*s[3]-s[0]*s[2])/(Tabelle.length*s[1]-s[0]*s[0])*(new Date(d).valueOf()-s[0]/Tabelle.length)+s[2]/Tabelle.length).toFixed(0)],cl:"tfoot",E_Monat:Object.values(EM).reduce((a,b)=>a+b)/Object.values(EM).length,Km_Monat:Object.values(KmM).reduce((a,b)=>a+b)/Object.values(KmM).length,L_Km:s[4]/(Tabelle.length-1),ct_Km:s[5]/(Tabelle.length-1)})
function td(x,n){
	return '<td>'+(x?Number(x).toFixed(n):'')+'</td>'
}
for(let i=1; i<Tabelle.length; i++){
	ans += '<tr class="'+Tabelle[i].cl+'"><td>' + Tabelle[i].Datum + '</td>' + td(Tabelle[i].ELK[0],2) + td(Tabelle[i].ELK[1],2) + td(Tabelle[i].ELK[2],0) + td(Tabelle[i].E_Monat,2) + td(Tabelle[i].Km_Monat,0) + td(Tabelle[i].L_Km,2) + td(Tabelle[i].ct_Km,2) + '</tr>'
}
ans += '</tbody></table><form action="upd"><input type="date" name="Datum" class="em7"><input type="number" name="Euro" step="0.01"><input type="number" name="Liter" step="0.01"><input type="number" name="Km"><input type="submit" class="submit" value="Enter"></form>'
document.getElementById("tabelle").innerHTML = ans
let options={height:400,chartPadding: {left:50}}
new Chartist.Line('#chart1',{labels,series:[series1]},options)
new Chartist.Line('#chart2',{labels,series:[series2]},options)
</script>
</body></html>`
}
app.get("/benzin/upd", (req, res) => {
	(async () => {
		let client = await MongoClient.connect(connectionURL,{useUnifiedTopology:true})
		try {
			const collection = client.db("db").collection("benzin")
			let a1={Datum:req.query.Datum}, a2={$set:{ELK:[req.query.Euro,req.query.Liter,req.query.Km,req.query.Zaehler]}}, result=await collection.find(a1).toArray()
			if (0 == result.length) {await collection.insertOne(a1)}
			await collection.updateOne(a1, a2)
			await collection.deleteOne({ELK:["","","",""]})
		} finally {
			client.close()
			res.redirect("/benzin")
		}
	})().catch(err => console.error(err))
})
app.get("/benzin", (req, res) => {
	(async () => {
		let client = await MongoClient.connect(connectionURL,{useUnifiedTopology:true}), result
		try {
			result = await client.db("db").collection("benzin").find({},{projection:{_id:0}}).sort({Datum:1}).toArray()
		} finally {
			client.close()
			res.send(benzin(result))
		}
	})().catch(err => console.error(err))
})
//*******************************
function zeit(Datum,Tabelle){//Datum:"Begin,End,Soll"
	return `<!DOCTYPE html><html><head><meta http-equiv="content-type" content="text/html; charset=UTF-8"><title>Zeit</title><style>
*	{font-size:16pt;	font-family:sans-serif;}
tfoot td	{font-weight: bold;	border: none;}
input,select	{background: transparent;}
td	{padding:0 5px;	text-align: center;	border: 1px solid gray;}
input	{width: 7em;	text-align: center;	border: none;}
.cWE, .cwe	{background-color: #ffd;}
.cF	{background-color: #f88;}
.c4	{color: white;	background-color: #808;}
.c4 *	{color: white;}
.c4 select option	{color: black;}
.cP	{color: black;	background-color: #0d0;}
span	{padding: 0 1em;}
table	{margin-bottom: 1em;}</style>
<script src="https://ajax.googleapis.com/ajax/libs/jquery/3.5.1/jquery.min.js"></script>
<script>
const Datum="${Datum}", Tabelle = ${JSON.stringify(Tabelle)};
const Kaffeepause=0.25, Mittagspause=0.5, Prognose=[,,,,4 + Kaffeepause,,,,8 + Kaffeepause + Mittagspause]
let T1=[];Tabelle.forEach((x)=>{T1[x.Datum]=x.BES.split(",")})
function daysInMonth(){return new Date(Datum.substr(0,4), Datum.substr(5,2), 0).getDate()}
function getDay(Tag){return new Date(Datum.substr(0,4), Datum.substr(5,2)-1, Tag).getDay()}
function cl(id){document.getElementById(id).innerHTML=""}
function tr(id,html){document.getElementById(id).innerHTML += html}
function two(s){return ("0"+s).slice(-2)}
function dd(Tag){return Datum+"-"+two(Tag)}
function upd(Tag,idx,v){
	let d=dd(Tag)
	if(typeof(T1[d])=="undefined"){T1[d]=["","",""]}
	T1[d][idx]=v
	$.get("upd?Datum="+d+"&BES="+T1[d])
	cl("TB");cl("TF");tbf()
}
let dt = [	new Date(Datum.substr(0,4), Datum.substr(5,2)-2, 15).toISOString().substr(0,7),
		new Date(Datum.substr(0,4), Datum.substr(5,2)-1, 15).toLocaleDateString('de-DE',{month: 'long', year: 'numeric'}),
		new Date(Datum.substr(0,4), Datum.substr(5,2), 15).toISOString().substr(0,7)]
function tbf(){
	let iRest=gIst=gSoll=0
	for (let Tag=1; Tag<=daysInMonth(); Tag++){
		let Begin=Begin1=End=End1=Ist=Soll=Rest=""
		if(typeof(T1[dd(Tag)])=="undefined"){
			Soll=["we","","","","","","we"][getDay(Tag)]
		}else{
			[Begin,End,Soll]=T1[dd(Tag)]
			if(Begin){
				let begin2=Begin.split(":"), end2
				Begin1=' value="'+Begin+'"'
				if(End){
					end2=End.split(":")
					End1=' value="'+End+'"'
					iIst=Number(end2[0])-Number(begin2[0])+(Number(end2[1])-Number(begin2[1]))/60
					if (Number(begin2[0])+Number(begin2[1])/60 <= 9.25) { iIst -= Kaffeepause }
					if (Number(end2[0])+Number(end2[1])/60 >= 12.00) { iIst -= Mittagspause }
					Ist=iIst.toFixed(2)
					gIst += iIst
					gSoll += Number(Soll)
					iRest += Number(Soll)-iIst
					Rest=iRest.toFixed(2)
				}else{
					End=""
					end2=Number(begin2[0])+Number(begin2[1])/60+Prognose[Soll]+iRest//(Soll!="")?Soll:8
					let stunden=Math.trunc(end2), minuten=Math.round((end2-stunden)*60)
					if(minuten==60){minuten=0;stunden++}
					End1=' value="'+[stunden,minuten].map(two).join(":")+'" class="cP"'
				}
			}else{
				Begin=Begin1=End=End1=""
			}
		}
		tr("TB",'<tr class="c'+Soll+'"><td>'+Tag+'</td><td><input type="time" onchange="upd('+Tag+',0,this.value)" '+Begin1+'></td><td><input type="time" onchange="upd('+Tag+',1,this.value)" '+End1+'></td><td>'+Ist+'</td><td><select name="Soll" onchange="upd('+Tag+',2,this.value)"><option value=""></option>'+[8,4,"F","WE"].map(x=>('<option value="'+x+'" '+((Soll==x)?"selected":"")+'>'+x+'</option>')).join("")+'</select></td><td>'+Rest+'</td></tr>')
	}
	tr("TF",'<tr><td colspan="3" rowspan="1">Gesammt:</td><td>'+gIst.toFixed(2)+'</td><td>'+gSoll.toFixed(2)+'</td></tr>')
}
</script></head><body onload="tbf()">
<table><thead id="TH"></thead><tbody id="TB"></tbody><tfoot id="TF"></tfoot></table>
<span class="c4">Halbtag,</span><span class="cF">Feiertage und Kurz,</span><span class="cWE">Wochenende.</span><script>
tr("TH",'<tr><th><a href="?Datum='+dt[0]+'"><button>&lt;--</button></a></th><th colspan="4" rowspan="1">'+dt[1]+'</th><th><a href="?Datum='+dt[2]+'"><button>--&gt;</button></a></th></tr><tr><th>Datum</th><th>in</th><th>out</th><th>Ist</th><th>Soll</th><th>Rest</th></tr>')
</script></body></html>`
}//End zeit
app.get("/zeit/upd", (req, res) => {
	(async () => {
		let client = await MongoClient.connect(connectionURL,{useUnifiedTopology:true})
		try {
			const collection = client.db("db").collection("zeit")
			let a1={Datum:req.query.Datum}, a2={$set:{BES:req.query.BES}}, result=await collection.find(a1).toArray()
			if (0 == result.length) {await collection.insertOne(a1)}
			await collection.updateOne(a1, a2)
			await collection.deleteOne({BES:{$in:[",,", null]}})//or
		} finally {
			client.close()
		}
	})().catch(err => console.error(err))
	res.end()//res.redirect("/zeit?Datum=" + req.body.Datum.substr(0,7))
})
app.get("/zeit/del", (req, res) => {
	(async () => {
		let client = await MongoClient.connect(connectionURL,{useUnifiedTopology:true})
		try {
			await client.db("db").collection("zeit").deleteMany({Datum:{$regex:req.query.Datum}})
		} finally {
			client.close()
			res.redirect("/zeit?Datum="+req.query.Datum.substr(0,7))
		}
	})().catch(err => console.error(err))
})
app.get("/zeit", (req, res) => {
	let Datum = ""
	if(req.query.Datum && req.query.Datum.length>=6){
		Datum = new Date(req.query.Datum.substr(0,4), req.query.Datum.substr(5,2)-1, 15).toISOString().substr(0,7)
	} else {
		Datum = new Date().toISOString().substr(0,7)
	}
	(async () => {
		let client = await MongoClient.connect(connectionURL,{useUnifiedTopology:true}), result
		try {
			result = await client.db("db").collection("zeit").find({Datum:{$regex:Datum}},{projection:{_id:0}}).toArray()
		} finally {
			client.close()
			res.send(zeit(Datum,result))
		}
	})().catch(err => console.error(err))
})
//*******************************
app.get("/", (req, res) => {
	res.status(404).send("Sorry can't find that!")
})
app.listen(PORT, () => console.log("Server " + ip.address() + ":" + PORT))
