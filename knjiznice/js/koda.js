
var baseUrl = 'https://rest.ehrscape.com/rest/v1';
var queryUrl = baseUrl + '/query';

var username = "ois.seminar";
var password = "ois4fri";
var pacientId = "";


/**
 * Prijava v sistem z privzetim uporabnikom za predmet OIS in pridobitev
 * enolične ID številke za dostop do funkcionalnosti
 * @return enolični identifikator seje za dostop do funkcionalnosti
 */
function getSessionId() {
    var response = $.ajax({
        type: "POST",
        url: baseUrl + "/session?username=" + encodeURIComponent(username) +
                "&password=" + encodeURIComponent(password),
        async: false
    });
    return response.responseJSON.sessionId;
}


/**
 * Generator podatkov za novega pacienta, ki bo uporabljal aplikacijo. Pri
 * generiranju podatkov je potrebno najprej kreirati novega pacienta z
 * določenimi osebnimi podatki (ime, priimek in datum rojstva) ter za njega
 * shraniti nekaj podatkov o vitalnih znakih.
 * @param stPacienta zaporedna številka pacienta (1, 2 ali 3)
 * @return ehrId generiranega pacienta
 */
function generirajPodatke(stPacienta, callback) {
   var ehrId = "";
   
   switch (stPacienta) {
       case 1:
           kreirajEHRzaBolnika("Janez", "Kranjski", "1980-05-10", function(id) {
               for (var i = 0; i < 4; i++) {
                   dodajMeritveVitalnihZnakov(id, osebeZnaki[0][i]);
               }
               callback(id);
           });
           break;
       case 2:
           kreirajEHRzaBolnika("Mojca", "Testna", "1990-05-12", function(id) {
               for (var i = 0; i < 4; i++) {
                   dodajMeritveVitalnihZnakov(id, osebeZnaki[1][i]);
               }
               callback(id);
           });
           break;
       case 3:
           kreirajEHRzaBolnika("Mulc", "Mali", "2005-06-15", function(id) {
               for (var i = 0; i < 4; i++) {
                   dodajMeritveVitalnihZnakov(id, osebeZnaki[2][i]);
               }
               callback(id);
           });
           break;
   }

   return ehrId;
}



function generiraj() {
    zacetek();
    var el = "<select id='selObj' class='form-control' onchange='spremeniPacienta(this.value)'>\
    <option value='0'>Izberi pacienta</option>\
    </select>";
    $("#patientSelectBtn").remove();
    $("#selDiv").empty();
    $("#selDiv").append(el);
    $("#status").html("Dodani ehrIdji: <br>");
    for (var i = 1; i <= 3; i++) {
      generirajPodatke(i, function(ehrId){
          generirajSelect(ehrId, function(opt) {
            $("#selObj").append(opt);
            $("#status").append(ehrId+"<br>");
        });
      });
    }
}

function generirajSelect(ehrId, callback) {
    osnovniPodatkiPacienta(ehrId, function(party) {
         callback("<option value='"+ehrId+"'>"+party.firstNames+" "+party.lastNames+"</option>");
    });
}


function osnovniPodatkiPacienta(ehrId, callback) {
    sessionId = getSessionId();
    
    
    $.ajax({
		url: baseUrl + "/demographics/ehr/" + ehrId + "/party",
		type: 'GET',
		headers: {"Ehr-Session": sessionId},
    	success: function (data) {
			var party = data.party;
			callback(party);
		}
	});
    
}


function spremeniPacienta(val) {
    if (val != 0) {
        pacientId = val;
        $("#ehrIdInput").val(pacientId);
    } else {
        pacientId = "";
        alert("Izberi pacienta!");
    }
}


function prijava() {
    var ehrId = $("#ehrIdInput").val();
    if (ehrId) {
        pacientId = ehrId;
        $("#startPage").hide();
        $("#secondPage").show();
        naloziStran();
    } else {
        pacientId = "";
        alert("Izberi pacienta!");
    }
}


function zacetek() {
    $("#startPage").show();
    $("#secondPage").hide();
}


function naloziStran() {
    $("#contentDiv").empty();
    preberiEHRodBolnika(function(party){
        $(".name").html(party.firstNames+" "+party.lastNames);
    });
    
    
    naloziTabelo();
    
    var visina, teza;
    
    preberiMeritveVitalnihZnakov("height", function(res) {
        if(res.length > 0) {
            $("#visina").html(res[0].height+res[0].unit);
            visina = res[0].height;
        } else {
            $("#visina").html("Ni podatkov.");
        }
    });
    
    preberiMeritveVitalnihZnakov("weight", function(res) {
        if(res.length > 0) {
            $("#teza").html(res[0].weight+res[0].unit);
            teza = res[0].weight;
            
            setTimeout(function(){
               if(visina && teza) {
                   visina = visina/100.0;
                   $("#itm").html((teza/(visina*visina)).toFixed(1));
               } 
            }, 500);
            
        } else {
            $("#teza").html("Ni podatkov.");
        }
    });
    
    
    preberiMeritveVitalnihZnakov("blood_pressure", function(res) {
        if(res.length > 0) {
            naloziGrafe(res);
        } else {
            $("#graphDiv").html("Ni podatkov.");
        }
    });
    
    
}



function naloziGrafe(inData) {
    var margin = {top:20, right:30, bottom:30, left:40},
    width=600-margin.left - margin.right, 
    height=400-margin.top-margin.bottom;


    var x = d3.scale.ordinal().rangeRoundBands([0, width], .1);
    
   
    var y = d3.scale.linear().range([height, 0]);
    
    var chart = d3.select("#contentDiv")  
                  .append("svg")  
                  .attr("width", width+(2*margin.left)+margin.right)  
                  .attr("height", height+margin.top+margin.bottom); 
    
    var xAxis = d3.svg.axis()
                  .scale(x)
                  .orient("bottom"); 
    
    var yAxis = d3.svg.axis()
                  .scale(y)
                  .orient("left");
    
    data = inData;
    x.domain(data.map(function(d){ return moment(d.time).format("D.M")}));
    y.domain([0, d3.max(data, function(d){return d.systolic})]);
    
    var bar = chart.selectAll("g")
                    .data(data)
                  .enter()
                    .append("g")
                    .attr("transform", function(d, i){
                      return "translate("+x(moment(d.time).format("D.M"))+", 0)";
                    });
    
    bar.append("rect")
      .attr("y", function(d) { 
        return y(d.systolic); 
      })
      .attr("x", function(d,i){
        return x.rangeBand()+(margin.left/2);
      })
      .attr("height", function(d) { 
        return height - y(d.systolic); 
      })
      .attr("width", x.rangeBand());  //set width base on range on ordinal data
    
    
    chart.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate("+margin.left+","+ height+")")        
        .call(xAxis);
    
    chart.append("g")
        .attr("class", "y axis")
        .attr("transform", "translate("+margin.left+",0)")
        .call(yAxis)
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".71em")
        .style("text-anchor", "end")
        .text("Systolic");
    
    
}

function type(d) {
    d.letter = +d.letter; // coerce to number
    return d;
}


function naloziTabelo() {
    $.ajax({
        type: "GET",
        url: "https://sl.wikipedia.org/w/api.php?action=parse&format=json&prop=text&section=1&page=Debelost&callback=?",
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        success: function (data, textStatus, jqXHR) {
            data = data.parse.text["*"];
            var obj = $.parseHTML(data);
            $(".rightSide").html(obj[8]);
            $(".rightSide table").addClass("table table-striped");
            $(".rightSide").append("<br>Vir: wikipedia");
        },
        error: function (errorMessage) {
        }
    });

}




function zamenjajVsebino(val) {
    $("#contentDiv").empty();
    if (val == "graph") {
        naloziStran()
    } else {
       naloziPodatke();
    }
}


function naloziPodatke() {
    preberiMeritveVitalnihZnakov("body_temperature", function(res) {
        if(res.length > 0) {
            $("#contentDiv").append("Telesna temperatura: "+res[0].temperature+res[0].unit+"<br>");
        } else {
            $("#contentDiv").append("Telesna temperatura: ni podatkov"+"<br>");
        }
    });
    
    preberiMeritveVitalnihZnakov("blood_pressure", function(res) {
        if(res.length > 0) {
            $("#contentDiv").append("Pritisk(Systolic): "+res[0].systolic+res[0].unit+"<br>");
            $("#contentDiv").append("Pritisk(Diastolic): "+res[0].diastolic+res[0].unit+"<br>");
        } else {
            $("#contentDiv").append("Pritisk: ni podatkov"+"<br>");
        }
    });
    
    preberiMeritveVitalnihZnakov("spO2", function(res) {
        if(res.length > 0) {
            $("#contentDiv").append("Kisik: "+res[0].spO2+"%<br>");
        } else {
            $("#contentDiv").append("Kisik: ni podatkov"+"<br>");
        }
    });
}


$(document).ready(function() {
    
    $("#secondPage").hide();
});



function preberiEHRodBolnika(callback) {
	var sessionId = getSessionId();

	var ehrId = pacientId;

	if (!(!ehrId || ehrId.trim().length == 0)) {
		$.ajax({
			url: baseUrl + "/demographics/ehr/" + ehrId + "/party",
			type: 'GET',
			headers: {"Ehr-Session": sessionId},
	    	success: function (data) {
				var party = data.party;
				callback(party);
			}
		});
	}
}





/**
 * Kreiraj nov EHR zapis za pacienta in dodaj osnovne demografske podatke.
 * V primeru uspešne akcije izpiši sporočilo s pridobljenim EHR ID, sicer
 * izpiši napako.
 */
function kreirajEHRzaBolnika(ime, priimek, datumRojstva, callback) {
	var sessionId = getSessionId();


	if (!(!ime || !priimek || !datumRojstva || ime.trim().length == 0 ||
      priimek.trim().length == 0 || datumRojstva.trim().length == 0)) {
		$.ajaxSetup({
		    headers: {"Ehr-Session": sessionId}
		});
		$.ajax({
		    url: baseUrl + "/ehr",
		    type: 'POST',
		    success: function (data) {
		        var ehrId = data.ehrId;
		        var partyData = {
		            firstNames: ime,
		            lastNames: priimek,
		            dateOfBirth: datumRojstva,
		            partyAdditionalInfo: [{key: "ehrId", value: ehrId}]
		        };
		        $.ajax({
		            url: baseUrl + "/demographics/party",
		            type: 'POST',
		            contentType: 'application/json',
		            data: JSON.stringify(partyData),
		            success: function (party) {
		                if (party.action == 'CREATE') {
		                  callback(ehrId);
		                }
		            }
		        });
		    }
		});
	}
}



/**
 * Za dodajanje vitalnih znakov pacienta je pripravljena kompozicija, ki
 * vključuje množico meritev vitalnih znakov (EHR ID, datum in ura,
 * telesna višina, telesna teža, sistolični in diastolični krvni tlak,
 * nasičenost krvi s kisikom in merilec).
 */
function dodajMeritveVitalnihZnakov(ehr_id, znaki, callback) {
	var sessionId = getSessionId();
	
	var ehrId = ehr_id;
	var datumInUra = znaki.time;
	var telesnaVisina = znaki.body_height_length;
	var telesnaTeza = znaki.body_weight;
	var telesnaTemperatura = znaki.temperature;
	var sistolicniKrvniTlak = znaki.systolic;
	var diastolicniKrvniTlak = znaki.diastolic;
	var nasicenostKrviSKisikom = znaki.spo2;
	var merilec = "";

    

	if (!(!ehrId || ehrId.trim().length == 0)) {
		$.ajaxSetup({
		    headers: {"Ehr-Session": sessionId}
		});
		var podatki = {
			// Struktura predloge je na voljo na naslednjem spletnem naslovu:
      // https://rest.ehrscape.com/rest/v1/template/Vital%20Signs/example
		    "ctx/language": "en",
		    "ctx/territory": "SI",
		    "ctx/time": datumInUra,
		    "vital_signs/height_length/any_event/body_height_length": telesnaVisina,
		    "vital_signs/body_weight/any_event/body_weight": telesnaTeza,
		   	"vital_signs/body_temperature/any_event/temperature|magnitude": telesnaTemperatura,
		    "vital_signs/body_temperature/any_event/temperature|unit": "°C",
		    "vital_signs/blood_pressure/any_event/systolic": sistolicniKrvniTlak,
		    "vital_signs/blood_pressure/any_event/diastolic": diastolicniKrvniTlak,
		    "vital_signs/indirect_oximetry:0/spo2|numerator": nasicenostKrviSKisikom
		};
		var parametriZahteve = {
		    ehrId: ehrId,
		    templateId: 'Vital Signs',
		    format: 'FLAT',
		    committer: merilec
		};
		$.ajax({
		    url: baseUrl + "/composition?" + $.param(parametriZahteve),
		    type: 'POST',
		    contentType: 'application/json',
		    data: JSON.stringify(podatki),
		    success: function (res) {
		        //callback(res);
		    }
		});
	}
}




/**
 * Pridobivanje vseh zgodovinskih podatkov meritev izbranih vitalnih znakov
 * (telesna temperatura, filtriranje telesne temperature in telesna teža).
 * Filtriranje telesne temperature je izvedena z AQL poizvedbo, ki se uporablja
 * za napredno iskanje po zdravstvenih podatkih.
 */
function preberiMeritveVitalnihZnakov(type, callback) {
	var sessionId = getSessionId();

	var ehrId = pacientId;

	$.ajax({
		    url: baseUrl + "/view/" + ehrId + "/" + type,
		    type: 'GET',
		    headers: {"Ehr-Session": sessionId},
		    success: function (res) {
		        callback(res);
		    },
		    error: function() {
		    	callback("Ni podatkov.");
		    }
		});
}