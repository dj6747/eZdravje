
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
function generirajPodatke(stPacienta) {
   var ehrId = "";
   
   switch (stPacienta) {//TODO: kliči API
       case 1:
           ehrId = "2c7510a7-ca13-4690-b8f8-1ad0bd086674";
           break;
       case 2:
           ehrId = "c2e3f047-701c-4e2d-aa35-55bebca047ce";
           break;
       case 3:
           ehrId = "a6536166-1382-4cc8-9517-959f76ee0e12";
           break;
       
       default:
           ehrId = "2c7510a7-ca13-4690-b8f8-1ad0bd086674";
           break;
   }
   
   /*getEhrId(function(id) {
       ehrId = id;
       
       
   }); */

   return ehrId;
}



function generiraj() {
    var el = "<select id='selObj' class='form-control' onchange='spremeniPacienta(this.value)'>\
    <option value='0'>Izberi pacienta</option>\
    </select>";
    $("#patientSelectBtn").remove();
    $("#selDiv").append(el);
    for (var i = 1; i <= 3; i++) {
      var ehrId = generirajPodatke(i);
        generirajSelect(ehrId, function(opt) {
            $("#selObj").append(opt);
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
    } else {
        pacientId = "";
        alert("Izberi pacienta!");
    }
}




