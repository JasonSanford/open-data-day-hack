/* Author: Jason Sanford

*/

/* one big global, probably a better ways */
var odd = {
	
	apiBase: "http://maps.co.mecklenburg.nc.us/rest/v1/"
	
};

/* document ready */

$(function(){
	
	odd.map = new google.maps.Map(document.getElementById("map-canvas"), {
		zoom: 10,
		center: new google.maps.LatLng(35.22720562368099, -80.84311660003662),
		streetViewControl: false,
		mapTypeId: "terrain"
	});
	
	google.maps.event.addListener(odd.map, "tilesloaded", getLayers);
	
});

/* lives */

$("#ul-layers .layer").live("click", function(){
	if (!$(this).hasClass("expanded")){
		// We haven't shown any fields for this layer yet
		$(this).addClass("expanded");
		var layerName = $(this).attr("id").split("-")[1];
		var fields = '<ul>';
		var layerLI$ = $(this).parent("li");
		$.getJSON(odd.apiBase + "ws_geo_listfields.php?geotable=" + layerName + "&format=json&callback=?", function(data){
			$.each(data.rows, function(i,o){
				fields += '<li>' + o.row.field_name + ' (' + o.row.field_type + ')</li>';
			});
			fields += '</ul>';
			layerLI$.append(fields);
		});
	}else{
		// We've already shown the fields for this layer, assume the user wants to hide fields
		$(this).removeClass("expanded");
		$(this).parent("li").children("ul").remove();
	}
});

/* functions */

function getLayers(){
	
	$.getJSON(odd.apiBase + "ws_geo_listlayers.php?format=json&callback=?", function(data){
		$.each(data.rows, function(i,o){
			$("#ul-layers").append('<li><a class="layer" href="javascript:void(0);" id="a-' + o.row.layer_name + '">' + o.row.layer_name + '</a></li>');
		});
	});
	
}