/* Author: Jason Sanford
http://maps.co.mecklenburg.nc.us/rest/v1/ws_geo_attributequery.php?geotable=parks&fields=prkname+as+name,st_asgeojson(transform(simplify(the_geom,5),4326),6)+as+geojson&parameters=ST_GeomFromText('POLYGON%20((-80.8532875366211%2035.12263551300835,%20-80.8532875366211%2035.15071181220918,%20-80.763937789917%2035.15071181220918,%20-80.763937789917%2035.12263551300835,%20-80.8532875366211%2035.12263551300835))',%204326)+%26%26transform(the_geom,4326)&format=json
*/

/* one big global, probably a better ways */
var odd = {
	
	apiBase: "http://maps.co.mecklenburg.nc.us/rest/",
	polyGeomText: "st_asgeojson(transform(simplify(the_geom,5),4326),6)+as+geojson",
	polyGeomText: "st_asgeojson(transform(the_geom,4326),6)+as+geojson",
	layers: {},
	iw: new google.maps.InfoWindow(),
	searchLoc: null,
	query: {
		distance: 528
	},
	results: [],
	styles: {
		results: {
			normal: {
				icon: new google.maps.MarkerImage("images/markers/small-red.png", null, null, new google.maps.Point(5, 5))
			},
			highlight: {
				icon: new google.maps.MarkerImage("images/markers/small-yellow.png", null, null, new google.maps.Point(5, 5))
			}
		}
	}
};

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
	
	google.maps.event.addListener(odd.map, "click", function(evt){
		setSearchLoc(evt.latLng);
	});
	
	//odd.tilesloaded = google.maps.event.addListener(odd.map, "tilesloaded", getLayers);
	
	/*google.maps.event.addListener(odd.map, "idle", function(){
		$(".layer-check").each(function(i,o){
			if ($(o).attr("checked"))
				updateLayer($(o).attr("id").split("-")[1]);
		});
	});*/
	
	$("#footage-slider").slider({
		values: [1000, 5000],
		min: 0,
		max: 10000,
		step: 100,
		slide: function(event, ui){
			$("#footage").html(ui.values[0] + " - " + ui.values[1] + " ft.<sup>2</sup>");
		},
		stop: function(event, ui){
			updateResults();
		}
	});
	
	$("#cost-slider").slider({
		values: [10000, 200000],
		min: 0,
		max: 1000000,
		step: 1000,
		slide: function(event, ui){
			$("#cost").html("$" + ui.values[0] + " - $" + ui.values[1]);
		},
		stop: function(event, ui){
			updateResults();
		}
	});
	
});

$(window).resize(function(){
	google.maps.event.trigger(odd.map, "resize");
});

/* lives */

/*$(".layer-check").live("click", function(){
	var layerName = $(this).attr("id").split("-")[1];
	if ($(this).attr("checked")){
		updateLayer(layerName);
	}else{
		hideLayer(layerName);
	}
});*/

/*$("#ul-layers .layer").live("click", function(){
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
});*/

/* functions */

function setSearchLoc(latLng){
	if (odd.distanceWidget){
		odd.distanceWidget.setOptions({position:latLng});
		//google.maps.event.trigger(odd.searchLoc, "dragend")
	}else{
		odd.distanceWidget = new DistanceWidget({
			map: odd.map,
			position: latLng,
			distance: /*0.050*/50, // Starting distance in km.
			minDistance: /*0.050*/50,
			maxDistance: /*2.500*/2500, // Twitter has a max distance of 2500km.
			color: '#000',
			activeColor: '#59b',
			sizerIcon: new google.maps.MarkerImage('images/resize-off.png'),
			activeSizerIcon: new google.maps.MarkerImage('images/resize.png')
		});
		google.maps.event.addListener(odd.distanceWidget, "distance_changed", updateSearchArea);
		google.maps.event.addListener(odd.distanceWidget, "position_changed", updateSearchArea);
		updateResults();
		//google.maps.event.addListener(odd.searchLoc, "dragend", updateResults);
	}
}

function updateSearchArea(){
	if (odd.searchAreaTimer) {
		window.clearTimeout(odd.searchAreaTimer);
	}

	// Throttle the query
	odd.searchAreaTimer = window.setTimeout(function(){
		updateResults();
	}, 200);
}

function updateResults(){
	if (!odd.distanceWidget)
		return;
	var removeThese = [];
	$.each(odd.results, function(result_index, result){
		if (distanceBetweenPoints(result.gVector.getPosition(), odd.distanceWidget.get("position")) > odd.distanceWidget.get("distance")){
			removeThese.push(result.row.gid);
		}
	});
	$.each(removeThese, function(i, o){
		removeResult(o);
	});
	$.getJSON(odd.apiBase + "v1/ws_geo_projectpoint.php?x=" + odd.distanceWidget.get("position").lng() + "&y=" + odd.distanceWidget.get("position").lat() + "&fromsrid=4326&tosrid=2264&format=json&callback=?", function(data){
		if (!data || parseInt(data.total_rows) < 1)
			return
		$.getJSON(odd.apiBase + "v2/ws_geo_bufferpoint.php?x=" + data.rows[0].row.x_coordinate + "&y=" + data.rows[0].row.y_coordinate + "&srid=2264&geotable=building_permits&parameters=date_issued%3E%272010-01-01%27&order=&limit=1000&format=json&fields=gid,project_name,project_address,square_footage,construction_cost,type_of_building,job_status,date_issued,mat_parcel_id,occupancy,st_asgeojson%28transform%28the_geom,4326%29,6%29+as+geojson&distance=" + (odd.distanceWidget.get("distance") * 3.280839895) + "&callback=?", function(data){
			if (!data || parseInt(data.total_rows) < 1)
				return;
			var addTheseObjs = [];
			$.each(data.rows, function(i, o){
				var addThis = true;
				$.each(odd.results, function(i2, o2){
					if (o2.row.gid == o.row.gid){
						addThis = false;
					}
				});
				if (addThis)
					addTheseObjs.push(o);
			});
			addThese(addTheseObjs);
		});
	});
}

function removeResult(gid){
	$.each(odd.results, function(i, o){
		if (o.row.gid == gid){
			o.gVector.setMap(null);
			$("#result-" + gid ).remove()
			odd.results.splice(i, 1);
			return false;
		}
	});
}

function addThese(these){
	$.each(these, function(i, o){
		o.gVector = new GeoJSON(o.row.geojson);
		o.gVector.setIcon(odd.styles.results.normal.icon);
		o.gVector.setMap(odd.map);
		google.maps.event.addListener(o.gVector, "click", function(evt){
			var content = '<table><tbody>';
			for (prop in o.row){
				if (prop != "geojson" && prop != "gid")
					content += '<tr><td>' + prop + '</td><td>' + o.row[prop] + '</td></tr>';
			}
			content += '</tbody></table>';
			odd.iw.setContent(content);
			odd.iw.setPosition(o.gVector.getPosition());
			odd.iw.open(odd.map);
		});
		google.maps.event.addListener(o.gVector, "mouseover", function(){
			o.gVector.setIcon(odd.styles.results.highlight.icon);
		});
		google.maps.event.addListener(o.gVector, "mouseout", function(){
			o.gVector.setIcon(odd.styles.results.normal.icon);
		});
		odd.results.push(o);
		//html += '<div id="result-' + o.row.gid + '" class="result">' + o.row.project_name + '</div>';
		$("#results").append('<div class="result-container"><div id="result-' + o.row.gid + '" class="result"><div class="field project_name">' + o.row.project_name + '</div><div class="field project_address">' + o.row.project_address + '</div><div class="field date_issued">' + o.row.date_issued + '</div><div class="field square_footage">' + o.row.square_footage + '</div><div class="field construction_cost">' + o.row.construction_cost + '</div><div class="field type_of_building">' + o.row.type_of_building + '</div><div class="field job_status">' + o.row.job_status + '</div><div class="clearit"></div></div></div>');
	});
}

function removeThese(these){}

function clearResults(){
	$.each(odd.results, function(i, o){
		o.gVector.setMap(null);
	});
	odd.results.length = 0;
}

/*function getLayers(){
	
	google.maps.event.removeListener(odd.tilesloaded);
	
	$.getJSON(odd.apiBase + "ws_geo_listlayers.php?format=json&callback=?", function(data){
		$.each(data.rows, function(i,o){
			odd.layers[o.row.layer_name] = {
				features: [],
				style: {
					normal: {
						strokeColor: "#000000",
						strokeOpacity: 0.85,
						strokeWeight: 4
					},
					highlight: {
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
	
}*/

/*function createEnvelopeString(){
	
	var bounds = odd.map.getBounds();
	var sw = bounds.getSouthWest();
	var ne = bounds.getNorthEast();
	return "ST_GeomFromText('POLYGON ((" + sw.lng() + " " + sw.lat() + ", " + sw.lng() + " " + ne.lat() + ", " + ne.lng() + " " + ne.lat() + ", " + ne.lng() + " " + sw.lat() + ", " + sw.lng() + " " + sw.lat() + "))', 4326)";
	
}*/

/*function updateLayer(layerName){
	
	var otherFields = "";
	$("#fields-" + layerName + " input").each(function(i, o){
		if ($(this).attr("checked"))
			otherFields += $(this).attr("id").split("-")[2] + ",";
	});
	
	var otherParams = "";
	
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
	
}*/

/*function hideLayer(layerName){
	
	$.each(odd.layers[layerName].features, function(i, o){
		o.gVector.setMap(null);
	});
	
	odd.layers[layerName].features.length = 0;
	
	$("#count-" + layerName).html(0).hide();
	
}*/

/**
 * Calculates the distance between two latlng points in km.
 * @see http://www.movable-type.co.uk/scripts/latlong.html
 *
 * @param {google.maps.LatLng} p1 The first lat lng point.
 * @param {google.maps.LatLng} p2 The second lat lng point.
 * @return {number} The distance between the two points in km.
 */
function distanceBetweenPoints(p1, p2) {
  if (!p1 || !p2) {
    return 0;
  }

  var R = 6371000; // Radius of the Earth in m
  var dLat = (p2.lat() - p1.lat()) * Math.PI / 180;
  var dLon = (p2.lng() - p1.lng()) * Math.PI / 180;
  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(p1.lat() * Math.PI / 180) * Math.cos(p2.lat() * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  var d = R * c;
  return d;
};