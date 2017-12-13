/*
 * Basic responsive mashup template
 * @owner Enter you name here (xxx)
 */
/*
 *    Fill in host and port for Qlik engine
 */

$.getJSON("config.json", function(conf) {
    
var config = {
	host: conf.qs_host,
	prefix: conf.qs_vp,
	port: conf.qs_port,
	isSecure: conf.qs_issecure
};

require.config( {
	baseUrl: ( config.isSecure ? "https://" : "http://" ) + config.host + (config.port ? ":" + config.port : "") + config.prefix + "resources"
} );

require( ["js/qlik"], function ( qlik ) {
	qlik.setOnError( function ( error ) {
		$( '#popupText' ).append( error.message + "<br>" );
		$( '#popup' ).fadeIn( 1000 );
	} );
	$( "#closePopup" ).click( function () {
		$( '#popup' ).hide();
	} );


// var db_conn = 'SET db_conn = ' + conf.qs_db_connection + ';';

var hypercube_id = '';
var rel_prog_interval = 250;

var date_from = $("#date_from").val();
var date_to = $("#date_to").val();
var date_from_script = 'SET date_from = ' + date_from + ';\n';
var date_to_script = 'SET date_to = ' + date_to + ';\n';
var qlikScript = date_from_script + date_to_script + conf.qs_script.join('\n');


var chart_type = 'barchart';

	var sessionApp = qlik.sessionApp(config);
	
		var app_rel = '';
		var rows_loaded = '';
		
        var app_rel_prog = setInterval(function(){
			if (app_rel != true) {
            	sessionApp.global.getProgress(sessionApp.model.handle).then(function(progress){
				rows_loaded = progress.qProgressData.qTransientProgressMessage.qMessageParameters;
				$("#loading_msg").text("Loading data, please wait... " + rows_loaded);
				});
			}else {
				clearInterval(app_rel_prog);
				}
            }, rel_prog_interval);
			
	console.log('Script of current session app is:\n' + qlikScript);
	sessionApp.setScript(qlikScript).then(function(){
	sessionApp.doReload().then(function() {
	app_rel = true;
	$("#loading_msg").hide();
	//create table head
	$("#t_head").append("<th>Weekday</th> <th class=\"text-right\">Energy [kWh]</th>");
	
	// Selection bar
	sessionApp.getObject('CurrentSelections','CurrentSelections');
	
	// # of rows
	sessionApp.visualization.create(
	'kpi',
	[ 
	{"qDef": {"qDef": "Count(dateandtime)", "qLabel": "# of rows"}}
	],
	{
	"color": {"auto": false},
	"legend": {"show": false}
	}
	).then(function(vis) { 
			vis.show("QV01"); 
		}
	);
	
	// Energy Total [kWh]
	sessionApp.visualization.create(
	'kpi',
	[ 
	{"qDef": {"qDef": "Sum(power)/60", "qLabel": "Energy Total [kWh]"}}
	],
	{
	"color": {"auto": false},
	"legend": {"show": false}
	}
	).then(function(vis) { 
			vis.show("QV02"); 
		}
	);
	
	// Energy Cost
	var price =  $("#price").val();
	sessionApp.visualization.create(
	'kpi',
	[ 
	{"qDef": {"qDef": "Sum(power)/60*" + price, "qLabel": "Energy Total Cost"}}
	],
	{
	"color": {"auto": false},
	"legend": {"show": false}
	}
	).then(function(vis) { 
			vis.show("QV03"); 
		}
	);
	
	
	// Energy per outlet
	sessionApp.visualization.create(
	chart_type,
	[
	{"qDef": {"qFieldDefs": ["outlet"], "qFieldLabels": ["outlet"]}}, 
	{"qDef": {"qDef": "Sum(power)/60", "qLabel": "Energy [kWh]"}}
	],
	{
	"title":"Energy by Outlet",
	"color": {"auto": false, "mode": "byDimension"},
	"legend": {"show": false}
	}
	).then(function(vis) { 
			vis.show("QV04"); 
		}
	);
	
	
	// Power in time
	sessionApp.visualization.create(
	'linechart',
	[
	{"qDef": {"qFieldDefs": ["dateandtime"], "qFieldLabels": ["Date and Time"]}}, 
	{"qDef": {"qDef": "Sum(power)", "qLabel": "Power [kW]"}}
	],
	{
	"title":"Power in time",
	"legend": {"show": false}
	}
	).then(function(vis) { 
			vis.show("QV05"); 
		}
	);
	
	sessionApp.createCube({
	"qInitialDataFetch": [
		{
			"qHeight": 7,
			"qWidth": 2
		}
	],
	"qDimensions": [
		{
			"qDef": {"qFieldDefs": ["weekday"]},
			"qNullSuppression": true,
			"qOtherTotalSpec": {
				"qOtherMode": "OTHER_OFF",
				"qSuppressOther": true,
				"qOtherSortMode": "OTHER_SORT_DESCENDING",
				"qOtherCounted": {
					"qv": "5"
				},
				"qOtherLimitMode": "OTHER_GE_LIMIT"
			}
		}
	],
	"qMeasures": [
		{
			"qDef": {"qDef": "Round(Sum(power)/60,0.01)"},
			"qLabel": "Energy",
			"qLibraryId": null,
			"qSortBy": {
				"qSortByState": 0,
				"qSortByFrequency": 0,
				"qSortByNumeric": 1,
				"qSortByAscii": 0,
				"qSortByLoadOrder": 0,
				"qSortByExpression": 0,
				"qExpression": {
					"qv": " "
				}
			}
		}
	],
	"qSuppressZero": false,
	"qSuppressMissing": false,
	"qMode": "S",
	"qInterColumnSortOrder": [1],
	"qStateName": "$"
	},PowerPerWeekday);
	
	
	function PowerPerWeekday(reply, app){
	$("#EnWeekday").empty();
	
	//get the id to destroy hc at logout
	hypercube_id = reply.qInfo.qId; 
	
		var qObject = reply.qHyperCube;
		var day = '';

		$.each(qObject.qDataPages[0].qMatrix, function() {
			$("#EnWeekday").append("<tr><td>" + this[0].qText + "</td>" + "<td class=\"text-right\">" + this[1].qText + "</td></tr>");
		});
	}
	
	});
});



$("#btn_get_data").click(function() {
	
	var date_from = $("#date_from").val();
	var date_to = $("#date_to").val();

	var date_from_script = 'SET date_from = ' + date_from + ';';
	var date_to_script = 'SET date_to = ' + date_to + ';';
	var qlikScript = date_from_script + date_to_script + conf.qs_script.join('\n');
	
	$("#loading_msg").show();
	
	if (date_from && date_to) {
		
		var app_rel = '';
		var rows_loaded = '';
		
        var app_rel_prog = setInterval(function(){
			if (app_rel != true) {
            	sessionApp.global.getProgress(sessionApp.model.handle).then(function(progress){
				rows_loaded = progress.qProgressData.qTransientProgressMessage.qMessageParameters;
				$("#loading_msg").text("Loading data, please wait... " + rows_loaded);
				});
			}else {
				clearInterval(app_rel_prog);
				}
            }, rel_prog_interval);
		
		console.log('Script of current session app is:\n' + qlikScript);
		sessionApp.setScript(qlikScript).then(function(){
			sessionApp.doReload().then(function() {
			app_rel = true;
			$("#loading_msg").hide();
				sessionApp.getAppLayout(function(layout){
					console.log(layout.qTitle + " reloaded");
				});
			});
		});
	} 
	else { 
	alert("Please select correct dates");
	}
});
	
$("#btn_chart_type").click(function() {
	
	if (chart_type === 'barchart') {
		chart_type = 'piechart';
	}
	else if (chart_type == 'piechart') {
		chart_type = 'treemap'
	}
	else { 
		chart_type = 'barchart';
	}
	
	sessionApp.visualization.create(
	chart_type,
	[
	{"qDef": {"qFieldDefs": ["outlet"], "qFieldLabels": ["Outlet"]}}, 
	{"qDef": {"qDef": "Sum(power)", "qLabel": "Energy [kWh]"}}
	],
	{
	"title":"Energy by outlet",
	"color": {"auto": false, "mode": "byDimension"},
	"legend": {"show": false}
	}
	).then(function(vis) { 
			vis.show("QV04"); 
		}
	);
	
});

$("#btn_cost").click(function() {
	
	var price = $("#price").val();
	
	sessionApp.visualization.create(
	'kpi',
	[ 
	{"qDef": {"qDef": "Sum(power)/60*" + price, "qLabel": "Energy Total Cost"}}
	],
	{
	"color": {"auto": false},
	"legend": {"show": false}
	}
	).then(function(vis) { 
			vis.show("QV03"); 
		}
	);
});

$("#logout").click(function() {
	
	//destroy hc before logout
	sessionApp.destroySessionObject(hypercube_id).then(function(reply) {
	console.log(reply);
	});
});

});
});
