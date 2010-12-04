/* Author: Jason Sanford
http://maps.co.mecklenburg.nc.us/rest/v1/ws_geo_attributequery.php?geotable=parks&fields=prkname+as+name,st_asgeojson(transform(simplify(the_geom,5),4326),6)+as+geojson&parameters=ST_GeomFromText('POLYGON%20((-80.8532875366211%2035.12263551300835,%20-80.8532875366211%2035.15071181220918,%20-80.763937789917%2035.15071181220918,%20-80.763937789917%2035.12263551300835,%20-80.8532875366211%2035.12263551300835))',%204326)+%26%26transform(the_geom,4326)&format=json
*/

/* one big global, probably a better ways */
var odd = {
	
	apiBase: "http://maps.co.mecklenburg.nc.us/rest/v1/",
	theGeomText: "st_asgeojson(transform(simplify(the_geom,5),4326),6)+as+geojson",
	layers: {},
	iw: new google.maps.InfoWindow({
		
	})
};

/* document ready */

$(function(){
	
	odd.map = new google.maps.Map(document.getElementById("map-canvas"), {
		zoom: 10,
		center: new google.maps.LatLng(35.22720562368099, -80.84311660003662),
		streetViewControl: false,
		mapTypeId: "terrain",
		navigationControlOptions: {
			position: google.maps.ControlPosition.RIGHT_CENTER
		}
	});
	
	odd.tilesloaded = google.maps.event.addListener(odd.map, "tilesloaded", getLayers);
	
	google.maps.event.addListener(odd.map, "idle", function(){
		$(".layer-check").each(function(i,o){
			if ($(o).attr("checked"))
				updateLayer($(o).attr("id").split("-")[1]);
		});
	});
	
	$("#layers-accordion").accordion({
		autoHeight: false,
		collapsible: true,
		active: false,
		event: "mouseover"
	});
	
});

/* lives */

$(".layer-check").live("click", function(){
	var layerName = $(this).attr("id").split("-")[1];
	if ($(this).attr("checked")){
		updateLayer(layerName);
	}else{
		hideLayer(layerName);
	}
});

$("#ul-layers .layer").live("click", function(){
	if (!$(this).hasClass("expanded")){
		// We haven't shown any fields for this layer yet
		$(this).addClass("expanded");
		var layerName = $(this).attr("id").split("-")[1];
		var fields = '<ul id="fields-' + layerName + '">';
		var layerLI$ = $(this).parent("li");
		if (!odd.layers[layerName].fields.length){
			$.getJSON(odd.apiBase + "ws_geo_listfields.php?geotable=" + layerName + "&format=json&callback=?", function(data){
				$.each(data.rows, function(i,o){
					odd.layers[layerName].fields.push(o.row.field_name);
					fields += '<li><input type="checkbox" class="field-check" id="check-' + layerName + '-' + o.row.field_name + '" />&nbsp;' + o.row.field_name + ' (' + o.row.field_type + ')</li>';
				});
				fields += '</ul>';
				layerLI$.append(fields);
			});
		}else{
			$(this).parent("li").children("ul").show();
		}
	}else{
		// We've already shown the fields for this layer, assume the user wants to hide fields
		$(this).removeClass("expanded");
		$(this).parent("li").children("ul").hide();
	}
});

/* functions */

function getLayers(){
	
	google.maps.event.removeListener(odd.tilesloaded);
	
	$.getJSON(odd.apiBase + "ws_geo_listlayers.php?format=json&callback=?", function(data){
		$.each(data.rows, function(i,o){
			odd.layers[o.row.layer_name] = {
				features: [],
				style: {
					normal: {
						/*fillColor: "#000000",
						fillOpacity: 0.5,*/
						strokeColor: "#000000",
						strokeOpacity: 0.85,
						strokeWeight: 4
					},
					highlight: {
						/*fillColor: "#ff0000",
						fillOpacity: 0.5,*/
						strokeColor: "#ffff00",
						strokeOpacity: 0.85,
						strokeWeight: 6
					}
				},
				fields: []
			};
			$("#ul-layers").append('<li><input type="checkbox" class="layer-check" id="check-' + o.row.layer_name + '" />&nbsp;<a class="layer" href="javascript:void(0);" id="a-' + o.row.layer_name + '">' + o.row.layer_name + '</a>&nbsp;<span style="display: none;" id="count-' + o.row.layer_name + '">0</span></li>');
		});
	});
	
}

function createEnvelopeString(){
	
	var bounds = odd.map.getBounds();
	var sw = bounds.getSouthWest();
	var ne = bounds.getNorthEast();
	return "ST_GeomFromText('POLYGON ((" + sw.lng() + " " + sw.lat() + ", " + sw.lng() + " " + ne.lat() + ", " + ne.lng() + " " + ne.lat() + ", " + ne.lng() + " " + sw.lat() + ", " + sw.lng() + " " + sw.lat() + "))', 4326)";
	
}

function updateLayer(layerName){
	
	var otherFields = "";
	$("#fields-" + layerName + " input").each(function(i, o){
		if ($(this).attr("checked"))
			otherFields += $(this).attr("id").split("-")[2] + ",";
	});
	
	var otherParams = "";
	
	/*
	This Works
	We'll need to reproject our point from 4326 to 2264
	http://maps.co.mecklenburg.nc.us/rest/v2/ws_geo_bufferpoint.php?x=1457321.92512878&y=525329.668774016&srid=2264&geotable=building_permits&parameters=date_issued%3E%272010-01-01%27&order=&limit=1000&format=json&fields=project_name,project_address,square_footage,construction_cost,type_of_building,job_status,date_issued,mat_parcel_id,occupancy,st_asgeojson%28transform%28the_geom,4326%29,6%29+as+geojson&distance=1000
	
	http://maps.co.mecklenburg.nc.us/rest/v2/ws_geo_bufferpoint.php
	?x=1457321.92512878
	&y=525329.668774016
	&srid=2264
	&geotable=building_permits
	&parameters=date_issued%3E%272010-01-01%27&order=
	&limit=1000
	&format=json
	&fields=project_name,project_address,square_footage,construction_cost,type_of_building,job_status,date_issued,mat_parcel_id,occupancy,st_asgeojson%28transform%28the_geom,4326%29,6%29+as+geojson
	&distance=1000
	*/
	
	$.getJSON(odd.apiBase + "ws_geo_attributequery.php?geotable=" + layerName + "&fields=gid," + otherFields + "st_asgeojson(transform(simplify(the_geom,5),4326),6)+as+geojson&parameters=" + createEnvelopeString() + "+%26%26transform(the_geom,4326)" + otherParams + "+limit+1000&format=json&callback=?", function(data){
		if (!parseInt(data.total_rows))
			return;
		$.each(data.rows, function(i, o){
			var onMap = false;
			$.each(odd.layers[layerName].features, function(i2, o2){
				if (o.row.gid == o2.row.gid){
					onMap = true;
					return false;
				}
			});
			if (onMap)
				return;
			o.gVector = new GeoJSON(o.row.geojson);
			o.gVector.setOptions(odd.layers[layerName].style.normal);
			o.gVector.setMap(odd.map);
			google.maps.event.addListener(o.gVector, "mouseover", function(){
				o.gVector.setOptions(odd.layers[layerName].style.highlight);
			});
			google.maps.event.addListener(o.gVector, "mouseout", function(){
				o.gVector.setOptions(odd.layers[layerName].style.normal);
			});
			google.maps.event.addListener(o.gVector, "click", function(evt){
				var content = '<table><tbody>';
				for (prop in o.row){
					if (prop != "geojson")
						content += '<tr><td>' + prop + '</td><td>' + o.row[prop] + '</td></tr>';
				}
				content += '</tbody></table>';
				odd.iw.setContent(content);
				odd.iw.setPosition(evt.latLng || o.gVector.getPosition());
				odd.iw.open(odd.map);
			});
			odd.layers[layerName].features.push(o);
			$("#count-" + layerName).html(parseInt($("#count-" + layerName).html()) + 1).show();
		});
	});
	
}

function hideLayer(layerName){
	
	$.each(odd.layers[layerName].features, function(i, o){
		o.gVector.setMap(null);
	});
	
	odd.layers[layerName].features.length = 0;
	
	$("#count-" + layerName).html(0).hide();
	
}